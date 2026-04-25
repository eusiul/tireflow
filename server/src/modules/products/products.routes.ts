import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, withTransaction } from '../../db/client.js'
import { randomUUID } from 'crypto'

const productSchema = z.object({
  sku: z.string().min(1),
  barcode: z.string().optional(),
  name: z.string().min(1),
  brand: z.string().min(1),
  size: z.string().min(1),
  category: z.enum(['tire', 'rim', 'service', 'accessory']),
  costPrice: z.number().min(0),
  salePrice: z.number().min(0),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
  supplier: z.string().optional(),
  location: z.string().optional(),
  imageUrl: z.string().url().optional(),
})

export async function productsRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate)

  // ─── GET /products ─────────────────────────────────────────────

  fastify.get('/', async (request) => {
    const { category, search, lowStock, page = '1', limit = '50' } = request.query as Record<string, string>
    const offset = (parseInt(page) - 1) * parseInt(limit)
    const params: unknown[] = [request.tenantId]
    const conditions: string[] = ['p.tenant_id = $1', 'p.is_active = TRUE']
    let paramIdx = 2

    if (category) {
      conditions.push(`p.category = $${paramIdx++}`)
      params.push(category)
    }
    if (search) {
      conditions.push(`(p.name ILIKE $${paramIdx} OR p.brand ILIKE $${paramIdx} OR p.sku ILIKE $${paramIdx} OR p.barcode = $${paramIdx})`)
      params.push(`%${search}%`)
      paramIdx++
    }
    if (lowStock === 'true') {
      conditions.push(`(p.stock = 0 OR (p.stock <= p.min_stock AND p.min_stock > 0))`)
    }

    const where = conditions.join(' AND ')

    const { rows: products } = await query(
      `SELECT p.*,
              CASE WHEN p.stock = 0 THEN 'out'
                   WHEN p.stock <= p.min_stock AND p.min_stock > 0 THEN 'low'
                   ELSE 'ok' END as stock_status
       FROM products p
       WHERE ${where}
       ORDER BY p.name
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, parseInt(limit), offset]
    )

    const { rows: [{ count }] } = await query(
      `SELECT COUNT(*) FROM products WHERE ${where}`,
      params
    )

    return { products, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) }
  })

  // ─── GET /products/:id ─────────────────────────────────────────

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { rows } = await query(
      'SELECT * FROM products WHERE id = $1 AND tenant_id = $2 AND is_active = TRUE',
      [request.params.id, request.tenantId]
    )
    if (rows.length === 0) return reply.code(404).send({ error: 'Product not found' })
    return rows[0]
  })

  // ─── GET /products/barcode/:code ───────────────────────────────

  fastify.get<{ Params: { code: string } }>('/barcode/:code', async (request, reply) => {
    const { rows } = await query(
      'SELECT * FROM products WHERE (barcode = $1 OR sku = $1) AND tenant_id = $2 AND is_active = TRUE',
      [request.params.code, request.tenantId]
    )
    if (rows.length === 0) return reply.code(404).send({ error: 'Product not found' })
    return rows[0]
  })

  // ─── POST /products ────────────────────────────────────────────

  fastify.post('/', async (request, reply) => {
    const body = productSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input', details: body.error.flatten() })

    const { sku, barcode, name, brand, size, category, costPrice, salePrice, stock, minStock, supplier, location, imageUrl } = body.data

    // Check SKU uniqueness within tenant
    const { rows: existing } = await query(
      'SELECT id FROM products WHERE tenant_id = $1 AND sku = $2',
      [request.tenantId, sku]
    )
    if (existing.length > 0) return reply.code(409).send({ error: 'SKU already exists' })

    const id = randomUUID()
    const { rows } = await query(
      `INSERT INTO products (id, tenant_id, sku, barcode, name, brand, size, category, cost_price, sale_price, stock, min_stock, supplier, location, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [id, request.tenantId, sku, barcode, name, brand, size, category, costPrice, salePrice, stock, minStock, supplier, location, imageUrl]
    )

    return reply.code(201).send(rows[0])
  })

  // ─── PATCH /products/:id ───────────────────────────────────────

  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const body = productSchema.partial().safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input', details: body.error.flatten() })

    const updates = body.data
    const setClauses: string[] = []
    const values: unknown[] = []
    let paramIdx = 1

    const fieldMap: Record<string, string> = {
      sku: 'sku', barcode: 'barcode', name: 'name', brand: 'brand', size: 'size',
      category: 'category', costPrice: 'cost_price', salePrice: 'sale_price',
      stock: 'stock', minStock: 'min_stock', supplier: 'supplier',
      location: 'location', imageUrl: 'image_url',
    }

    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in updates) {
        setClauses.push(`${col} = $${paramIdx++}`)
        values.push(updates[key as keyof typeof updates])
      }
    }

    if (setClauses.length === 0) return reply.code(400).send({ error: 'No fields to update' })

    values.push(request.params.id, request.tenantId)
    const { rows } = await query(
      `UPDATE products SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIdx++} AND tenant_id = $${paramIdx}
       RETURNING *`,
      values
    )

    if (rows.length === 0) return reply.code(404).send({ error: 'Product not found' })
    return rows[0]
  })

  // ─── POST /products/:id/adjust-stock ──────────────────────────

  fastify.post<{ Params: { id: string } }>('/:id/adjust-stock', async (request, reply) => {
    const schema = z.object({
      quantity: z.number().int(),
      type: z.enum(['purchase', 'adjustment', 'return', 'loss']),
      notes: z.string().optional(),
    })

    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input' })

    const result = await withTransaction(async (client) => {
      const { rows: [product] } = await client.query(
        'SELECT id, stock FROM products WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
        [request.params.id, request.tenantId]
      )
      if (!product) throw Object.assign(new Error('Not found'), { code: 404 })

      const newStock = product.stock + body.data.quantity
      if (newStock < 0) throw Object.assign(new Error('Insufficient stock'), { code: 422 })

      await client.query(
        'UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2',
        [newStock, product.id]
      )

      await client.query(
        `INSERT INTO stock_movements (tenant_id, product_id, user_id, type, quantity, stock_before, stock_after, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [request.tenantId, product.id, request.userId, body.data.type, body.data.quantity, product.stock, newStock, body.data.notes]
      )

      return { previousStock: product.stock, newStock }
    })

    return result
  })

  // ─── DELETE /products/:id ──────────────────────────────────────

  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: [fastify.requireRole(['admin'])],
  }, async (request, reply) => {
    const { rowCount } = await query(
      'UPDATE products SET is_active = FALSE WHERE id = $1 AND tenant_id = $2',
      [request.params.id, request.tenantId]
    )
    if (rowCount === 0) return reply.code(404).send({ error: 'Product not found' })
    return { success: true }
  })
}
