import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createHmac } from 'crypto'
import { query, withTransaction } from '../../db/client.js'
import { mercadopago } from '../../lib/mercadopago.js'
import { randomUUID } from 'crypto'

const PLAN_PRICES: Record<string, number> = {
  starter: 97,
  pro: 197,
  enterprise: 497,
}

const PLAN_NAMES: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

export async function paymentsRoutes(fastify: FastifyInstance) {
  // ─── MercadoPago webhook — no auth (MP calls this directly) ──────────────────
  // URL to configure in MP dashboard: https://[your-railway-url]/api/v1/payments/webhook/mp

  fastify.post('/webhook/mp', async (request, reply) => {
    const mpSecret = process.env.MP_WEBHOOK_SECRET

    if (mpSecret) {
      const xSignature = (request.headers['x-signature'] as string) ?? ''
      const xRequestId = (request.headers['x-request-id'] as string) ?? ''
      const payload = request.body as { data?: { id?: string } }

      const parts: Record<string, string> = {}
      xSignature.split(',').forEach((part) => {
        const [k, v] = part.split('=')
        if (k && v) parts[k.trim()] = v.trim()
      })

      const manifest = `id:${payload?.data?.id ?? ''};request-id:${xRequestId};ts:${parts.ts ?? ''}`
      const expected = createHmac('sha256', mpSecret).update(manifest).digest('hex')

      if (expected !== parts.v1) {
        fastify.log.warn('MP webhook: invalid signature')
        return reply.code(401).send({ error: 'Invalid signature' })
      }
    }

    const payload = request.body as { type?: string; data?: { id?: string } }

    if (payload?.type === 'payment' && payload?.data?.id) {
      const paymentId = String(payload.data.id)
      fastify.log.info({ paymentId }, 'MP webhook payment notification')

      try {
        const mpPayment = await mercadopago.getPayment(paymentId)

        if (mpPayment.status === 'approved') {
          const { rows: [event] } = await query(
            `SELECT * FROM subscription_events
             WHERE pix_txid = $1 AND event_type = 'payment_pending'
             LIMIT 1`,
            [paymentId]
          )
          if (event) {
            await activateSubscription(event.tenant_id, event.plan, event.amount, paymentId)
            fastify.log.info({ tenantId: event.tenant_id, plan: event.plan }, 'Subscription activated via MP webhook')
          }
        }
      } catch (err) {
        // Log but return 200 — if we return 4xx/5xx MP will retry indefinitely
        fastify.log.error(err, 'MP webhook processing error')
      }
    }

    return reply.code(200).send({ received: true })
  })

  // ─── All routes below require JWT authentication ──────────────────────────────

  await fastify.register(async (f) => {
    f.addHook('preHandler', f.authenticate)

    // POST /subscription/pix — generate Pix charge via MercadoPago
    f.post('/subscription/pix', async (request, reply) => {
      const schema = z.object({ plan: z.enum(['starter', 'pro', 'enterprise']) })
      const body = schema.safeParse(request.body)
      if (!body.success) return reply.code(400).send({ error: 'Invalid plan' })

      const { rows: [tenant] } = await query(
        'SELECT id, name, email FROM tenants WHERE id = $1',
        [request.tenantId]
      )
      if (!tenant) return reply.code(404).send({ error: 'Tenant not found' })

      const plan = body.data.plan
      const amount = PLAN_PRICES[plan]
      const expiresAt = new Date(Date.now() + 30 * 60_000) // 30 minutes

      const payerEmail = tenant.email ?? `tenant.${(tenant.id as string).slice(0, 8)}@tireflow.app`

      const mpPayment = await mercadopago.createPixPayment({
        amount,
        description: `TireFlow – Plano ${PLAN_NAMES[plan]}`,
        payerEmail,
        expiresAt,
      })

      const txData = mpPayment.point_of_interaction?.transaction_data
      const pixCopiaECola = txData?.qr_code ?? ''
      const qrCodeBase64 = txData?.qr_code_base64
        ? `data:image/png;base64,${txData.qr_code_base64}`
        : ''
      const paymentId = String(mpPayment.id)

      await query(
        `INSERT INTO subscription_events (id, tenant_id, event_type, plan, amount, payment_method, pix_txid, reference)
         VALUES ($1, $2, 'payment_pending', $3, $4, 'pix', $5, $6)`,
        [randomUUID(), tenant.id, plan, amount, paymentId, `mp_${paymentId}`]
      )

      return {
        txid: paymentId,
        pixCopiaECola,
        qrCodeBase64,
        expiresAt: expiresAt.toISOString(),
        amount,
        plan,
      }
    })

    // GET /subscription/status/:txid — poll payment status
    f.get<{ Params: { txid: string } }>('/subscription/status/:txid', async (request, reply) => {
      const { rows: [event] } = await query(
        `SELECT * FROM subscription_events
         WHERE pix_txid = $1 AND tenant_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [request.params.txid, request.tenantId]
      )
      if (!event) return reply.code(404).send({ error: 'Payment not found' })

      if (event.event_type === 'payment_pending') {
        try {
          const mpPayment = await mercadopago.getPayment(request.params.txid)
          if (mpPayment.status === 'approved') {
            await activateSubscription(request.tenantId, event.plan, event.amount, request.params.txid)
            return { status: 'paid', plan: event.plan }
          }
        } catch {
          // Fall through — return current DB status
        }
      }

      return {
        status: event.event_type === 'payment_received' ? 'paid' : 'pending',
        plan: event.plan,
        amount: event.amount,
      }
    })

    // GET /history
    f.get('/history', async (request) => {
      const { rows } = await query(
        `SELECT * FROM subscription_events
         WHERE tenant_id = $1
         ORDER BY created_at DESC LIMIT 24`,
        [request.tenantId]
      )
      return { events: rows }
    })
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

    await client.query(
      `UPDATE subscription_events SET event_type = 'payment_processed'
       WHERE pix_txid = $1 AND event_type = 'payment_pending'`,
      [txid]
    )
  })
}
