import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import 'dotenv/config'

import authPlugin from './plugins/auth.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { productsRoutes } from './modules/products/products.routes.js'
import { salesRoutes } from './modules/sales/sales.routes.js'
import { clientsRoutes } from './modules/clients/clients.routes.js'
import { paymentsRoutes } from './modules/payments/payments.routes.js'
import { nfeRoutes } from './modules/nfe/nfe.routes.js'
import { whatsappRoutes } from './modules/whatsapp/whatsapp.routes.js'

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      ...(process.env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : {}),
    },
    trustProxy: true,
  })

  // ─── Security & Middleware ─────────────────────────────────────

  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  })

  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await fastify.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    skipOnError: true,
  })

  // ─── Auth Plugin ───────────────────────────────────────────────

  await fastify.register(authPlugin)

  // ─── Health Check ──────────────────────────────────────────────

  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }))

  // ─── API Routes ────────────────────────────────────────────────

  await fastify.register(authRoutes, { prefix: '/api/v1/auth' })
  await fastify.register(productsRoutes, { prefix: '/api/v1/products' })
  await fastify.register(salesRoutes, { prefix: '/api/v1/sales' })
  await fastify.register(clientsRoutes, { prefix: '/api/v1/clients' })
  await fastify.register(paymentsRoutes, { prefix: '/api/v1/payments' })
  await fastify.register(nfeRoutes, { prefix: '/api/v1/nfe' })
  await fastify.register(whatsappRoutes, { prefix: '/api/v1/whatsapp' })

  // ─── AI Chat endpoint ──────────────────────────────────────────

  fastify.post('/api/v1/ai/chat', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { messages } = request.body as { messages: Array<{ role: string; content: string }> }
    if (!Array.isArray(messages)) return reply.code(400).send({ error: 'messages array required' })

    const { query } = await import('./db/client.js')

    const { rows: [tenant] } = await query(
      'SELECT name, plan FROM tenants WHERE id = $1', [request.tenantId]
    )
    const { rows: lowStock } = await query(
      `SELECT name, stock, min_stock FROM products WHERE tenant_id = $1 AND stock <= min_stock AND min_stock > 0 LIMIT 5`,
      [request.tenantId]
    )
    const { rows: [salesSummary] } = await query(
      `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM sales
       WHERE tenant_id = $1 AND payment_status = 'completed' AND created_at >= NOW() - INTERVAL '30 days'`,
      [request.tenantId]
    )

    const { chatWithAI } = await import('./lib/claude.js')
    const reply_ = await chatWithAI(
      messages as Array<{ role: 'user' | 'assistant'; content: string }>,
      {
        tenantName: tenant?.name ?? 'Loja',
        plan: tenant?.plan ?? 'starter',
        lowStockProducts: lowStock.map((p: any) => ({ name: p.name, stock: p.stock, minStock: p.min_stock })),
        recentSalesSummary: { total: parseFloat(salesSummary.total), count: parseInt(salesSummary.count), period: '30 dias' },
      }
    )

    return { content: reply_ }
  })

  // ─── Global Error Handler ──────────────────────────────────────

  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error({ err: error, url: request.url }, 'Unhandled error')

    const statusCode = (error as any).code || error.statusCode || 500
    const message = process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : error.message

    reply.code(typeof statusCode === 'number' ? statusCode : 500).send({
      error: message,
      statusCode,
    })
  })

  return fastify
}
