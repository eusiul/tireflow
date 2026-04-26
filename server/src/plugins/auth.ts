import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import { query } from '../db/client.js'

export interface JWTPayload {
  sub: string       // user_id
  tenantId: string
  role: 'admin' | 'seller' | 'cashier'
  type: 'access' | 'refresh'
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload
    user: JWTPayload
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
    tenantId: string
    userRole: 'admin' | 'seller' | 'cashier'
  }
}

async function authPlugin(fastify: FastifyInstance) {
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'insecure-dev-secret-change-in-prod',
    sign: { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
  })

  // Decorate request with auth helpers
  fastify.decorateRequest('userId', '')
  fastify.decorateRequest('tenantId', '')
  fastify.decorateRequest('userRole', '' as unknown as 'admin' | 'seller' | 'cashier')

  // Auth hook — validates JWT and sets request context
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify()
        const payload = request.user as JWTPayload

        if (payload.type !== 'access') {
          reply.code(401).send({ error: 'Invalid token type' })
          return
        }

        // Verify user is still active in DB
        const { rows } = await query(
          'SELECT id, tenant_id, role FROM users WHERE id = $1 AND is_active = TRUE',
          [payload.sub]
        )
        if (rows.length === 0) {
          reply.code(401).send({ error: 'User not found or inactive' })
          return
        }

        request.userId = payload.sub
        request.tenantId = payload.tenantId
        request.userRole = payload.role
      } catch (err) {
        reply.code(401).send({ error: 'Unauthorized' })
      }
    }
  )

  // Role guard factory
  fastify.decorate('requireRole', (roles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!roles.includes(request.userRole)) {
        reply.code(403).send({ error: 'Insufficient permissions' })
      }
    }
  })
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole: (roles: string[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export default fp(authPlugin, { name: 'auth' })
