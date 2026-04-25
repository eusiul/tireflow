import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, withTransaction } from '../../db/client.js'
import { randomUUID } from 'crypto'
import { whatsapp } from '../../lib/whatsapp.js'

const saleItemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().int().positive(),
  unitPrice: z.number().positive(),
  discount: z.number().min(0).max(100).default(0),
})

const createSaleSchema = z.object({
  clientId: z.string().uuid().optional(),
  items: z.array(saleItemSchema).min(1),
  discount: z.number().min(0).max(100).default(0),  // global discount %
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'pix', 'mixed']),
  notes: z.string().optional(),
  notifyClient: z.boolean().default(false),          // send WhatsApp notification
  emitNFe: z.boolean().default(false),               // emit NF-e
})

export async function salesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // ─── GET /sales ────────────────────────────────────────────────

  fastify.get('/', async (request) => {
    const { startDate, endDate, clientId, status, page = '1', limit = '20' } = request.query as Record<string, string>
    const offset = (parseInt(page) - 1) * parseInt(limit)
    const params: unknown[] = [request.tenantId]
    const conditions = ['s.tenant_id = $1']
    let idx = 2

    if (clientId) { conditions.push(`s.client_id = $${idx++}`); params.push(clientId) }
    if (status) { conditions.push(`s.payment_status = $${idx++}`); params.push(status) }
    if (startDate) { conditions.push(`s.created_at >= $${idx++}`); params.push(startDate) }
    if (endDate) { conditions.push(`s.created_at <= $${idx++}`); params.push(endDate) }

    const where = conditions.join(' AND ')
    const { rows } = await query(
      `SELECT s.*, c.name as client_name,
              json_agg(json_build_object(
                'productId', si.product_id, 'productName', si.product_name,
                'qty', si.qty, 'unitPrice', si.unit_price, 'discount', si.discount, 'total', si.total
              )) as items
       FROM sales s
       LEFT JOIN clients c ON c.id = s.client_id
       LEFT JOIN sale_items si ON si.sale_id = s.id
       WHERE ${where}
       GROUP BY s.id, c.name
       ORDER BY s.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    )

    const { rows: [{ count }] } = await query(
      `SELECT COUNT(*) FROM sales WHERE ${conditions.join(' AND ')}`,
      params
    )

    return { sales: rows, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) }
  })

  // ─── GET /sales/summary ────────────────────────────────────────

  fastify.get('/summary', async (request) => {
    const { period = 'month' } = request.query as Record<string, string>
    const intervalMap: Record<string, string> = {
      today: "INTERVAL '1 day'",
      week: "INTERVAL '7 days'",
      month: "INTERVAL '30 days'",
    }
    const interval = intervalMap[period] || intervalMap.month

    const { rows: [summary] } = await query(
      `SELECT
         COALESCE(SUM(total), 0) as revenue,
         COUNT(*) as sales_count,
         COALESCE(AVG(total), 0) as avg_ticket,
         COALESCE(SUM(CASE WHEN payment_method = 'pix' THEN total ELSE 0 END), 0) as pix_revenue
       FROM sales
       WHERE tenant_id = $1 AND payment_status = 'completed'
         AND created_at >= NOW() - ${interval}`,
      [request.tenantId]
    )

    return summary
  })

  // ─── POST /sales ───────────────────────────────────────────────

  fastify.post('/', async (request, reply) => {
    const body = createSaleSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input', details: body.error.flatten() })

    const { clientId, items, discount, paymentMethod, notes, notifyClient, emitNFe } = body.data

    const sale = await withTransaction(async (client) => {
      const saleId = randomUUID()
      let subtotal = 0
      const enrichedItems: Array<{
        productId: string; productName: string; productSku: string
        qty: number; unitPrice: number; discount: number; total: number
      }> = []

      // Validate and lock products, deduct stock
      for (const item of items) {
        const { rows: [product] } = await client.query(
          `SELECT id, name, sku, stock, category
           FROM products WHERE id = $1 AND tenant_id = $2 AND is_active = TRUE FOR UPDATE`,
          [item.productId, request.tenantId]
        )

        if (!product) throw Object.assign(new Error(`Product ${item.productId} not found`), { code: 404 })

        const isService = product.category === 'service'
        if (!isService && product.stock < item.qty) {
          throw Object.assign(
            new Error(`Insufficient stock for "${product.name}": available ${product.stock}, requested ${item.qty}`),
            { code: 422 }
          )
        }

        const itemTotal = item.unitPrice * item.qty * (1 - item.discount / 100)
        subtotal += itemTotal
        enrichedItems.push({
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          qty: item.qty,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: itemTotal,
        })

        // Deduct stock
        if (!isService) {
          const newStock = product.stock - item.qty
          await client.query(
            'UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2',
            [newStock, product.id]
          )
          await client.query(
            `INSERT INTO stock_movements (tenant_id, product_id, user_id, type, quantity, stock_before, stock_after, reference_id)
             VALUES ($1, $2, $3, 'sale', $4, $5, $6, $7)`,
            [request.tenantId, product.id, request.userId, -item.qty, product.stock, newStock, saleId]
          )
        }
      }

      const total = subtotal * (1 - discount / 100)

      // Insert sale
      const { rows: [sale] } = await client.query(
        `INSERT INTO sales (id, tenant_id, client_id, operator_id, subtotal, discount, total, payment_method, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [saleId, request.tenantId, clientId ?? null, request.userId, subtotal, discount, total, paymentMethod, notes]
      )

      // Insert sale items
      for (const item of enrichedItems) {
        await client.query(
          `INSERT INTO sale_items (id, sale_id, product_id, product_name, product_sku, qty, unit_price, discount, total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [randomUUID(), saleId, item.productId, item.productName, item.productSku, item.qty, item.unitPrice, item.discount, item.total]
        )
      }

      return { ...sale, items: enrichedItems }
    })

    // Post-transaction: async notifications
    if (notifyClient && clientId) {
      const { rows: [client_] } = await query(
        'SELECT name, phone FROM clients WHERE id = $1',
        [clientId]
      )
      if (client_?.phone) {
        whatsapp.notifySaleConfirmed({
          phone: client_.phone,
          clientName: client_.name,
          total: `R$ ${sale.total.toFixed(2)}`,
          items: sale.items.map((i: any) => `${i.qty}x ${i.productName}`).join(', '),
          saleId: sale.id.slice(0, 8).toUpperCase(),
        }).catch(console.error)
      }
    }

    // NF-e emission would be triggered here in production
    if (emitNFe) {
      // TODO: queue NF-e emission job
      fastify.log.info({ saleId: sale.id }, 'NF-e emission queued')
    }

    return reply.code(201).send(sale)
  })

  // ─── GET /sales/:id ────────────────────────────────────────────

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { rows } = await query(
      `SELECT s.*, c.name as client_name, u.name as operator_name,
              json_agg(json_build_object(
                'id', si.id, 'productId', si.product_id, 'productName', si.product_name,
                'productSku', si.product_sku, 'qty', si.qty, 'unitPrice', si.unit_price,
                'discount', si.discount, 'total', si.total
              )) as items
       FROM sales s
       LEFT JOIN clients c ON c.id = s.client_id
       LEFT JOIN users u ON u.id = s.operator_id
       LEFT JOIN sale_items si ON si.sale_id = s.id
       WHERE s.id = $1 AND s.tenant_id = $2
       GROUP BY s.id, c.name, u.name`,
      [request.params.id, request.tenantId]
    )
    if (rows.length === 0) return reply.code(404).send({ error: 'Sale not found' })
    return rows[0]
  })

  // ─── DELETE /sales/:id (cancel) ────────────────────────────────

  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: [fastify.requireRole(['admin'])],
  }, async (request, reply) => {
    const schema = z.object({ reason: z.string().min(5) })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Cancellation reason required' })

    await withTransaction(async (client) => {
      const { rows: [sale] } = await client.query(
        `SELECT * FROM sales WHERE id = $1 AND tenant_id = $2 AND payment_status != 'cancelled'`,
        [request.params.id, request.tenantId]
      )
      if (!sale) throw Object.assign(new Error('Sale not found'), { code: 404 })

      // Restore stock
      const { rows: items } = await client.query(
        'SELECT * FROM sale_items WHERE sale_id = $1',
        [sale.id]
      )
      for (const item of items) {
        const { rows: [product] } = await client.query(
          'SELECT stock FROM products WHERE id = $1 FOR UPDATE',
          [item.product_id]
        )
        if (product) {
          await client.query(
            'UPDATE products SET stock = stock + $1 WHERE id = $2',
            [item.qty, item.product_id]
          )
          await client.query(
            `INSERT INTO stock_movements (tenant_id, product_id, user_id, type, quantity, stock_before, stock_after, reference_id, notes)
             VALUES ($1, $2, $3, 'return', $4, $5, $6, $7, $8)`,
            [request.tenantId, item.product_id, request.userId, item.qty, product.stock, product.stock + item.qty, sale.id, body.data.reason]
          )
        }
      }

      await client.query(
        `UPDATE sales SET payment_status = 'cancelled', notes = CONCAT(notes, ' | Cancelado: ', $1), updated_at = NOW()
         WHERE id = $2`,
        [body.data.reason, sale.id]
      )
    })

    return { success: true }
  })
}
