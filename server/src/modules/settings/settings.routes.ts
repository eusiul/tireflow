import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { query } from '../../db/client.js'

export async function settingsRoutes(fastify: FastifyInstance) {
  // ─── GET /settings/tenant ──────────────────────────────────────
  fastify.get('/tenant', { preHandler: [fastify.authenticate] }, async (request) => {
    const { rows: [tenant] } = await query(
      `SELECT id, name, slug, cnpj, phone, address, email, logo_url, primary_color, plan, plan_status
       FROM tenants WHERE id = $1`,
      [request.tenantId]
    )
    return tenant
  })

  // ─── PATCH /settings/tenant ────────────────────────────────────
  fastify.patch('/tenant', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      cnpj: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      email: z.string().email().optional().nullable().or(z.literal('')),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input', details: body.error.flatten() })

    const { name, cnpj, phone, address, email } = body.data
    const { rows: [tenant] } = await query(
      `UPDATE tenants
       SET name = $1, cnpj = $2, phone = $3, address = $4, email = $5
       WHERE id = $6
       RETURNING id, name, cnpj, phone, address, email, logo_url, primary_color, plan, plan_status`,
      [name, cnpj || null, phone || null, address || null, email || null, request.tenantId]
    )
    return tenant
  })

  // ─── POST /settings/logo ───────────────────────────────────────
  fastify.post('/logo', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const schema = z.object({
      logoBase64: z.string()
        .max(2_500_000, 'Image too large — max ~1.8 MB')
        .refine((v) => v.startsWith('data:image/'), 'Must be a base64 image data URL'),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.errors[0]?.message ?? 'Invalid image' })

    const { rows: [tenant] } = await query(
      `UPDATE tenants SET logo_url = $1 WHERE id = $2 RETURNING logo_url`,
      [body.data.logoBase64, request.tenantId]
    )
    return { logoUrl: tenant.logo_url }
  })

  // ─── DELETE /settings/logo ─────────────────────────────────────
  fastify.delete('/logo', { preHandler: [fastify.authenticate] }, async (request) => {
    await query(`UPDATE tenants SET logo_url = NULL WHERE id = $1`, [request.tenantId])
    return { logoUrl: null }
  })

  // ─── PATCH /settings/password ──────────────────────────────────
  fastify.patch('/password', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.errors[0]?.message ?? 'Invalid input' })

    const { currentPassword, newPassword } = body.data

    const { rows: [user] } = await query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [request.userId]
    )
    if (!user) return reply.code(404).send({ error: 'User not found' })

    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) return reply.code(400).send({ error: 'Incorrect current password' })

    const hash = await bcrypt.hash(newPassword, 12)
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, request.userId])
    return { message: 'Password changed successfully' }
  })

  // ─── GET /settings/users ───────────────────────────────────────
  fastify.get('/users', { preHandler: [fastify.authenticate] }, async (request) => {
    const { rows } = await query(
      `SELECT id, name, email, role, is_active, last_login_at, created_at
       FROM users WHERE tenant_id = $1 ORDER BY created_at ASC`,
      [request.tenantId]
    )
    return { users: rows }
  })

  // ─── POST /settings/users — create user (admin only) ──────────
  fastify.post('/users', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    if (request.userRole !== 'admin') {
      return reply.code(403).send({ error: 'Only admins can create users' })
    }
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(['admin', 'seller', 'cashier']),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input', details: body.error.flatten() })

    const { name, email, password, role } = body.data

    const { rows: existing } = await query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
      [email.toLowerCase(), request.tenantId]
    )
    if (existing.length > 0) return reply.code(409).send({ error: 'Email already in use' })

    const hash = await bcrypt.hash(password, 12)
    const { rows: [user] } = await query(
      `INSERT INTO users (tenant_id, name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, name, email, role, is_active, created_at`,
      [request.tenantId, name, email.toLowerCase(), hash, role]
    )
    return reply.code(201).send(user)
  })

  // ─── PATCH /settings/users/:id — toggle active ─────────────────
  fastify.patch('/users/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    if (request.userRole !== 'admin') {
      return reply.code(403).send({ error: 'Only admins can modify users' })
    }
    const { id } = request.params as { id: string }
    const { is_active } = request.body as { is_active: boolean }

    if (id === request.userId) return reply.code(400).send({ error: 'Cannot deactivate yourself' })

    const { rows: [user] } = await query(
      `UPDATE users SET is_active = $1 WHERE id = $2 AND tenant_id = $3
       RETURNING id, name, email, role, is_active`,
      [is_active, id, request.tenantId]
    )
    if (!user) return reply.code(404).send({ error: 'User not found' })
    return user
  })

  // ─── PATCH /settings/user ──────────────────────────────────────
  fastify.patch('/user', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2).optional(),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input' })

    const { rows: [user] } = await query(
      `UPDATE users SET name = COALESCE($1, name) WHERE id = $2
       RETURNING id, name, email, role`,
      [body.data.name ?? null, request.userId]
    )
    return user
  })
}
