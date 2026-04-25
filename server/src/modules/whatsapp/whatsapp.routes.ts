import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query } from '../../db/client.js'
import { whatsapp } from '../../lib/whatsapp.js'
import { chatWithAI } from '../../lib/claude.js'

export async function whatsappRoutes(fastify: FastifyInstance) {
  // ─── GET /whatsapp/status ──────────────────────────────────────
  // (Authenticated — for admin dashboard)

  fastify.get('/status', {
    preHandler: [fastify.authenticate],
  }, async (_, reply) => {
    try {
      const status = await whatsapp.getInstanceStatus()
      return { connected: status.state === 'open', state: status.state }
    } catch {
      return { connected: false, state: 'error' }
    }
  })

  // ─── GET /whatsapp/qrcode ──────────────────────────────────────

  fastify.get('/qrcode', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin'])],
  }, async (_, reply) => {
    const result = await whatsapp.connectInstance()
    if (!result.qrcode) return reply.code(200).send({ message: 'Already connected' })
    return { qrCodeBase64: result.qrcode.base64 }
  })

  // ─── POST /whatsapp/send ───────────────────────────────────────

  fastify.post('/send', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const schema = z.object({
      phone: z.string().min(10),
      message: z.string().min(1),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input' })

    const result = await whatsapp.sendText({ to: body.data.phone, text: body.data.message })
    return { messageId: result.key.id }
  })

  // ─── POST /whatsapp/notify/service-ready ──────────────────────

  fastify.post('/notify/service-ready', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const schema = z.object({
      serviceOrderId: z.string().uuid(),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input' })

    const { rows: [so] } = await query(
      `SELECT so.*, c.name as client_name, c.phone
       FROM service_orders so
       LEFT JOIN clients c ON c.id = so.client_id
       WHERE so.id = $1 AND so.tenant_id = $2`,
      [body.data.serviceOrderId, request.tenantId]
    )

    if (!so) return reply.code(404).send({ error: 'Service order not found' })
    if (!so.phone) return reply.code(422).send({ error: 'Client has no phone number' })

    await whatsapp.notifyServiceReady({
      phone: so.phone,
      clientName: so.client_name,
      vehicle: so.vehicle_desc ?? 'Veículo',
      plate: so.vehicle_plate ?? '',
    })

    // Update service order status
    await query(
      `UPDATE service_orders SET status = 'done', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [so.id]
    )

    return { success: true }
  })

  // ─── POST /whatsapp/webhook ────────────────────────────────────
  // Receives incoming WhatsApp messages from Evolution API
  // No auth — validates via Evolution API key header

  fastify.post('/webhook', async (request, reply) => {
    const apiKey = request.headers['apikey']
    if (apiKey !== process.env.EVOLUTION_API_KEY) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const webhook = request.body as {
      event: string
      instance: string
      data?: {
        key: { remoteJid: string; id: string; fromMe: boolean }
        pushName: string
        message?: { conversation?: string; extendedTextMessage?: { text: string } }
        messageTimestamp: number
      }
    }

    if (webhook.event !== 'messages.upsert' || !webhook.data) {
      return reply.code(200).send({ ok: true })
    }

    // Handle AI responses asynchronously (don't block webhook response)
    setImmediate(async () => {
      try {
        await whatsapp.handleIncomingMessage(
          webhook as any,
          async (message, phone) => {
            // Try to identify tenant by phone (self-hosted Evolution has one tenant)
            // In multi-tenant, map instance name to tenant
            const tenantId = await getTenantByInstance(webhook.instance)
            if (!tenantId) return '❌ Instância não configurada.'

            const context = await getTenantContext(tenantId)
            return chatWithAI([{ role: 'user', content: message }], context)
          }
        )
      } catch (err) {
        fastify.log.error(err, 'WhatsApp message handling failed')
      }
    })

    return reply.code(200).send({ ok: true })
  })

  // ─── POST /whatsapp/register-webhook ──────────────────────────

  fastify.post('/register-webhook', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin'])],
  }, async (request, reply) => {
    const schema = z.object({ callbackUrl: z.string().url() })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid URL' })

    await whatsapp.registerWebhook(body.data.callbackUrl)
    return { success: true, message: 'Webhook registered' }
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getTenantByInstance(instance: string): Promise<string | null> {
  // In a real app, store instance→tenant mapping
  // For now, use env default or first active tenant
  const { rows: [tenant] } = await query(
    `SELECT id FROM tenants WHERE plan_status = 'active' LIMIT 1`
  )
  return tenant?.id ?? null
}

async function getTenantContext(tenantId: string) {
  const { rows: [tenant] } = await query(
    'SELECT name, plan FROM tenants WHERE id = $1',
    [tenantId]
  )

  const { rows: lowStock } = await query(
    `SELECT name, stock, min_stock FROM products
     WHERE tenant_id = $1 AND (stock = 0 OR stock <= min_stock) AND min_stock > 0
     LIMIT 5`,
    [tenantId]
  )

  const { rows: [salesSummary] } = await query(
    `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
     FROM sales WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
     AND payment_status = 'completed'`,
    [tenantId]
  )

  return {
    tenantName: tenant?.name ?? 'Loja',
    plan: tenant?.plan ?? 'starter',
    lowStockProducts: lowStock.map((p: any) => ({
      name: p.name,
      stock: p.stock,
      minStock: p.min_stock,
    })),
    recentSalesSummary: {
      total: parseFloat(salesSummary?.total ?? '0'),
      count: parseInt(salesSummary?.count ?? '0'),
      period: 'últimos 30 dias',
    },
  }
}
