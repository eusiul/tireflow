import type { FastifyInstance } from 'fastify'
import { query } from '../../db/client.js'

export async function alertsRoutes(fastify: FastifyInstance) {
  // ─── GET /alerts ───────────────────────────────────────────────
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { rows } = await query(
      `SELECT id, type, severity, title, message, product_id, is_read, created_at
       FROM alerts
       WHERE tenant_id = $1
       ORDER BY is_read ASC, created_at DESC
       LIMIT 30`,
      [request.tenantId]
    )
    return { alerts: rows }
  })

  // ─── PATCH /alerts/:id/read ────────────────────────────────────
  fastify.patch('/:id/read', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { rowCount } = await query(
      `UPDATE alerts SET is_read = true WHERE id = $1 AND tenant_id = $2`,
      [id, request.tenantId]
    )
    if (!rowCount) return reply.code(404).send({ error: 'Alert not found' })
    return { ok: true }
  })

  // ─── PATCH /alerts/read-all ────────────────────────────────────
  fastify.patch('/read-all', { preHandler: [fastify.authenticate] }, async (request) => {
    await query(
      `UPDATE alerts SET is_read = true WHERE tenant_id = $1 AND is_read = false`,
      [request.tenantId]
    )
    return { ok: true }
  })

  // ─── DELETE /alerts/:id ────────────────────────────────────────
  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { rowCount } = await query(
      `DELETE FROM alerts WHERE id = $1 AND tenant_id = $2`,
      [id, request.tenantId]
    )
    if (!rowCount) return reply.code(404).send({ error: 'Alert not found' })
    return { ok: true }
  })
}
