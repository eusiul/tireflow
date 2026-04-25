import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { query } from '../../db/client.js'
import type { JWTPayload } from '../../plugins/auth.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const refreshSchema = z.object({
  refreshToken: z.string(),
})

export async function authRoutes(fastify: FastifyInstance) {
  // ─── POST /auth/login ──────────────────────────────────────────

  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid input', details: body.error.flatten() })
    }

    const { email, password } = body.data

    const { rows } = await query<{
      id: string; tenant_id: string; name: string; email: string
      password_hash: string; role: string; is_active: boolean
    }>(
      `SELECT u.id, u.tenant_id, u.name, u.email, u.password_hash, u.role, u.is_active,
              t.name as tenant_name, t.plan, t.plan_status
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    )

    const user = rows[0]
    if (!user || !user.is_active) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    // Update last login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id])

    const accessPayload: JWTPayload = {
      sub: user.id,
      tenantId: user.tenant_id,
      role: user.role as JWTPayload['role'],
      type: 'access',
    }
    const refreshPayload: JWTPayload = { ...accessPayload, type: 'refresh' }

    const accessToken = fastify.jwt.sign(accessPayload, { expiresIn: '15m' })
    const refreshToken = fastify.jwt.sign(refreshPayload, { expiresIn: '30d' })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
      },
    }
  })

  // ─── POST /auth/refresh ────────────────────────────────────────

  fastify.post('/refresh', async (request, reply) => {
    const body = refreshSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input' })

    try {
      const payload = fastify.jwt.verify<JWTPayload>(body.data.refreshToken)
      if (payload.type !== 'refresh') throw new Error('Not a refresh token')

      const { rows } = await query(
        'SELECT id FROM users WHERE id = $1 AND is_active = TRUE',
        [payload.sub]
      )
      if (rows.length === 0) return reply.code(401).send({ error: 'User not found' })

      const newAccess = fastify.jwt.sign(
        { sub: payload.sub, tenantId: payload.tenantId, role: payload.role, type: 'access' },
        { expiresIn: '15m' }
      )

      return { accessToken: newAccess }
    } catch {
      return reply.code(401).send({ error: 'Invalid refresh token' })
    }
  })

  // ─── POST /auth/register (first tenant setup) ──────────────────

  fastify.post('/register', async (request, reply) => {
    const schema = z.object({
      tenantName: z.string().min(2),
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8),
      cnpj: z.string().optional(),
    })

    const body = schema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid input', details: body.error.flatten() })
    }

    const { tenantName, name, email, password, cnpj } = body.data

    // Check email uniqueness globally
    const { rows: existing } = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    )
    if (existing.length > 0) {
      return reply.code(409).send({ error: 'Email already registered' })
    }

    const hash = await bcrypt.hash(password, 12)
    const slug = tenantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    // Create tenant + admin user in a transaction
    const client = await (await import('../../db/client.js')).pool.connect()
    try {
      await client.query('BEGIN')

      const { rows: [tenant] } = await client.query<{ id: string }>(
        `INSERT INTO tenants (name, slug, cnpj, plan, plan_status)
         VALUES ($1, $2, $3, 'starter', 'trial')
         RETURNING id`,
        [tenantName, slug, cnpj ?? null]
      )

      const { rows: [user] } = await client.query<{ id: string }>(
        `INSERT INTO users (tenant_id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'admin')
         RETURNING id`,
        [tenant.id, name, email.toLowerCase(), hash]
      )

      await client.query('COMMIT')

      return reply.code(201).send({
        message: 'Account created successfully',
        tenantId: tenant.id,
        userId: user.id,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  })

  // ─── GET /auth/me ──────────────────────────────────────────────

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request) => {
    const { rows } = await query<{
      id: string; name: string; email: string; role: string; avatar_url: string
      tenant_id: string; tenant_name: string; plan: string; plan_status: string
      cnpj: string; address: string; phone: string
    }>(
      `SELECT u.id, u.name, u.email, u.role, u.avatar_url,
              t.id as tenant_id, t.name as tenant_name, t.plan, t.plan_status,
              t.cnpj, t.address, t.phone, t.logo_url, t.primary_color
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1`,
      [request.userId]
    )
    return rows[0]
  })
}
