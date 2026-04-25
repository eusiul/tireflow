import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query } from '../../db/client.js'
import { randomUUID } from 'crypto'

const clientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(8),
  document: z.string().optional(),
  vehiclePlates: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

export async function clientsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request) => {
    const { search, page = '1', limit = '30' } = request.query as Record<string, string>
    const offset = (parseInt(page) - 1) * parseInt(limit)
    const params: unknown[] = [request.tenantId]
    const conditions = ['tenant_id = $1', 'is_active = TRUE']

    if (search) {
      conditions.push(`(name ILIKE $2 OR phone LIKE $2 OR document LIKE $2 OR $3 = ANY(vehicle_plates))`)
      params.push(`%${search}%`, search)
    }

    const { rows } = await query(
      `SELECT * FROM clients WHERE ${conditions.join(' AND ')}
       ORDER BY total_spent DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    )
    return { clients: rows }
  })

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { rows } = await query(
      'SELECT * FROM clients WHERE id = $1 AND tenant_id = $2',
      [request.params.id, request.tenantId]
    )
    if (!rows.length) return reply.code(404).send({ error: 'Not found' })

    const { rows: sales } = await query(
      `SELECT s.id, s.total, s.payment_method, s.created_at,
              json_agg(si.product_name) as products
       FROM sales s
       JOIN sale_items si ON si.sale_id = s.id
       WHERE s.client_id = $1 AND s.payment_status = 'completed'
       GROUP BY s.id ORDER BY s.created_at DESC LIMIT 10`,
      [request.params.id]
    )

    return { ...rows[0], recentSales: sales }
  })

  fastify.post('/', async (request, reply) => {
    const body = clientSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input', details: body.error.flatten() })
    const { name, email, phone, document, vehiclePlates, notes } = body.data
    const { rows } = await query(
      `INSERT INTO clients (id, tenant_id, name, email, phone, document, vehicle_plates, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [randomUUID(), request.tenantId, name, email, phone, document, vehiclePlates, notes]
    )
    return reply.code(201).send(rows[0])
  })

  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const body = clientSchema.partial().safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input' })
    const d = body.data
    const { rows } = await query(
      `UPDATE clients SET
         name = COALESCE($1, name), email = COALESCE($2, email),
         phone = COALESCE($3, phone), document = COALESCE($4, document),
         vehicle_plates = COALESCE($5, vehicle_plates), notes = COALESCE($6, notes),
         updated_at = NOW()
       WHERE id = $7 AND tenant_id = $8 RETURNING *`,
      [d.name, d.email, d.phone, d.document, d.vehiclePlates, d.notes, request.params.id, request.tenantId]
    )
    if (!rows.length) return reply.code(404).send({ error: 'Not found' })
    return rows[0]
  })
}
