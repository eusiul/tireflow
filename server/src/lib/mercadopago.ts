import { randomUUID } from 'crypto'

const MP_BASE = 'https://api.mercadopago.com'

function getToken(): string {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) throw new Error('MP_ACCESS_TOKEN environment variable is not set')
  return token
}

async function mpFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${MP_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': randomUUID(),
      ...(options.headers as Record<string, string> ?? {}),
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText })) as { message?: string; cause?: { description?: string }[] }
    const msg = body?.message ?? body?.cause?.[0]?.description ?? `MP API error ${res.status}`
    throw Object.assign(new Error(msg), { status: res.status, body })
  }

  return res.json() as T
}

export interface MPPayment {
  id: number
  status: 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back'
  status_detail: string
  transaction_amount: number
  date_of_expiration?: string
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string
      qr_code_base64?: string
      ticket_url?: string
    }
  }
}

export const mercadopago = {
  createPixPayment: (params: {
    amount: number
    description: string
    payerEmail: string
    expiresAt: Date
  }): Promise<MPPayment> =>
    mpFetch<MPPayment>('/v1/payments', {
      method: 'POST',
      body: JSON.stringify({
        transaction_amount: params.amount,
        description: params.description,
        payment_method_id: 'pix',
        date_of_expiration: params.expiresAt.toISOString(),
        payer: { email: params.payerEmail },
      }),
    }),

  getPayment: (paymentId: string): Promise<MPPayment> =>
    mpFetch<MPPayment>(`/v1/payments/${paymentId}`),
}
