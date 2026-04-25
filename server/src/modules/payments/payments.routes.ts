import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, withTransaction } from '../../db/client.js'
import { efibank } from '../../lib/efibank.js'
import { randomUUID } from 'crypto'

const PLAN_PRICES: Record<string, number> = {
  starter: 97,
  pro: 197,
  enterprise: 497,
}

export async function paymentsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // ─── POST /payments/subscription/pix ──────────────────────────
  // Generates a Pix charge for subscription payment

  fastify.post('/subscription/pix', async (request, reply) => {
    const schema = z.object({
      plan: z.enum(['starter', 'pro', 'enterprise']),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid plan' })

    const { rows: [tenant] } = await query(
      'SELECT id, name, cnpj FROM tenants WHERE id = $1',
      [request.tenantId]
    )
    if (!tenant) return reply.code(404).send({ error: 'Tenant not found' })

    if (!tenant.cnpj) {
      return reply.code(422).send({ error: 'CNPJ is required for Pix payments. Update your company settings.' })
    }

    const plan = body.data.plan
    const amount = PLAN_PRICES[plan]
    const ref = `pix_${randomUUID().replace(/-/g, '').slice(0, 20)}`

    try {
      const charge = await efibank.createSubscriptionCharge({
        tenantId: tenant.id,
        tenantName: tenant.name,
        document: tenant.cnpj,
        plan,
        amount,
      })

      // Save pending payment
      await query(
        `INSERT INTO subscription_events (id, tenant_id, event_type, plan, amount, payment_method, pix_txid, reference)
         VALUES ($1, $2, 'payment_pending', $3, $4, 'pix', $5, $6)`,
        [randomUUID(), tenant.id, plan, amount, charge.txid, ref]
      )

      return {
        txid: charge.txid,
        pixCopiaECola: charge.pixCopiaECola,
        qrCodeBase64: charge.imagemQrcode,
        expiresAt: charge.expiresAt,
        amount,
        plan,
      }
    } catch (err: unknown) {
      fastify.log.error(err, 'Efi Bank charge creation failed')

      // In development/sandbox issues, return mock response
      if (process.env.NODE_ENV === 'development') {
        const mockTxid = `MOCK_${randomUUID().replace(/-/g, '').slice(0, 25)}`
        return {
          txid: mockTxid,
          pixCopiaECola: `00020126580014BR.GOV.BCB.PIX0136${randomUUID()}5204000053039865802BR5920TireFlow Pagamentos6009Sao Paulo62290525${mockTxid}6304ABCD`,
          qrCodeBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          expiresAt: new Date(Date.now() + 3600_000),
          amount,
          plan,
          _mock: true,
        }
      }

      throw err
    }
  })

  // ─── GET /payments/subscription/status/:txid ──────────────────

  fastify.get<{ Params: { txid: string } }>('/subscription/status/:txid', async (request, reply) => {
    const { rows: [event] } = await query(
      `SELECT * FROM subscription_events
       WHERE pix_txid = $1 AND tenant_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [request.params.txid, request.tenantId]
    )
    if (!event) return reply.code(404).send({ error: 'Payment not found' })

    // Check live status from Efi Bank
    if (event.event_type === 'payment_pending') {
      try {
        const charge = await efibank.getCharge(request.params.txid)
        if (charge.status === 'CONCLUIDA') {
          await activateSubscription(request.tenantId, event.plan, event.amount, request.params.txid)
          return { status: 'paid', plan: event.plan }
        }
      } catch {
        // Fall through to return current DB status
      }
    }

    return {
      status: event.event_type === 'payment_received' ? 'paid' : 'pending',
      plan: event.plan,
      amount: event.amount,
    }
  })

  // ─── POST /payments/webhook/pix ─────────────────────────────────
  // Receives Efi Bank webhook — no auth required, validates signature

  fastify.post('/webhook/pix', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const webhookSecret = process.env.EFI_WEBHOOK_SECRET
    const signature = request.headers['x-webhook-signature']

    // In production, validate signature against webhookSecret
    if (webhookSecret && signature !== webhookSecret) {
      fastify.log.warn('Invalid webhook signature')
      return reply.code(401).send({ error: 'Invalid signature' })
    }

    const payload = request.body as { pix?: Array<{ txid: string; valor: string; pagador: { nome: string } }> }
    if (!efibank.validateWebhookPayload(payload)) {
      return reply.code(400).send({ error: 'Invalid payload' })
    }

    for (const pix of payload.pix ?? []) {
      fastify.log.info({ txid: pix.txid, valor: pix.valor }, 'Pix received')

      // Find the pending event
      const { rows: [event] } = await query(
        `SELECT se.*, t.name as tenant_name
         FROM subscription_events se
         JOIN tenants t ON t.id = se.tenant_id
         WHERE se.pix_txid = $1 AND se.event_type = 'payment_pending'
         LIMIT 1`,
        [pix.txid]
      )

      if (event) {
        await activateSubscription(event.tenant_id, event.plan, parseFloat(pix.valor), pix.txid)
        fastify.log.info({ tenantId: event.tenant_id, plan: event.plan }, 'Subscription activated via webhook')
      }
    }

    return reply.code(200).send({ received: true })
  })

  // ─── GET /payments/history ─────────────────────────────────────

  fastify.get('/history', async (request) => {
    const { rows } = await query(
      `SELECT * FROM subscription_events
       WHERE tenant_id = $1
       ORDER BY created_at DESC LIMIT 24`,
      [request.tenantId]
    )
    return { events: rows }
  })
}

// ─── Helper: activate subscription ───────────────────────────────────────────

async function activateSubscription(
  tenantId: string,
  plan: string,
  amount: number,
  txid: string
): Promise<void> {
  await withTransaction(async (client) => {
    // Set plan expires 31 days from now
    const expiresAt = new Date(Date.now() + 31 * 24 * 3600_000)

    await client.query(
      `UPDATE tenants SET plan = $1, plan_status = 'active', plan_expires_at = $2, updated_at = NOW()
       WHERE id = $3`,
      [plan, expiresAt, tenantId]
    )

    await client.query(
      `INSERT INTO subscription_events (id, tenant_id, event_type, plan, amount, payment_method, pix_txid)
       VALUES ($1, $2, 'payment_received', $3, $4, 'pix', $5)`,
      [randomUUID(), tenantId, plan, amount, txid]
    )

    // Expire the pending event
    await client.query(
      `UPDATE subscription_events SET event_type = 'payment_processed'
       WHERE pix_txid = $1 AND event_type = 'payment_pending'`,
      [txid]
    )
  })
}
