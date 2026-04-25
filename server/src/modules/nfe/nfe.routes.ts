import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query } from '../../db/client.js'
import { focusNFe, FocusNFeClient, type NFeEmitente, type NFeItem } from '../../lib/focusnfe.js'
import { randomUUID } from 'crypto'

export async function nfeRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // ─── POST /nfe/emit/:saleId ────────────────────────────────────

  fastify.post<{ Params: { saleId: string } }>('/emit/:saleId', async (request, reply) => {
    const schema = z.object({
      destinatarioCpfCnpj: z.string().optional(),
      destinatarioNome: z.string().min(1),
      destinatarioEmail: z.string().email().optional(),
    })

    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input', details: body.error.flatten() })

    // Get sale
    const { rows: [sale] } = await query(
      `SELECT s.*, u.name as operator_name
       FROM sales s
       LEFT JOIN users u ON u.id = s.operator_id
       WHERE s.id = $1 AND s.tenant_id = $2 AND s.payment_status = 'completed'`,
      [request.params.saleId, request.tenantId]
    )
    if (!sale) return reply.code(404).send({ error: 'Sale not found or not completed' })
    if (sale.nfe_key) return reply.code(409).send({ error: 'NF-e already emitted for this sale' })

    const { rows: items } = await query(
      `SELECT si.*, p.ncm, p.cfop
       FROM sale_items si
       LEFT JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = $1`,
      [sale.id]
    )

    // Get tenant (emitente)
    const { rows: [tenant] } = await query(
      'SELECT * FROM tenants WHERE id = $1',
      [request.tenantId]
    )

    if (!tenant.cnpj) {
      return reply.code(422).send({ error: 'Tenant CNPJ required for NF-e. Configure in settings.' })
    }

    // Build NF-e emitente from tenant data
    const emitente: NFeEmitente = {
      cnpj: tenant.cnpj,
      nome: tenant.name,
      nomeFantasia: tenant.name,
      logradouro: tenant.address?.split(',')[0] ?? 'Rua não informada',
      numero: tenant.address?.match(/,\s*(\d+)/)?.[1] ?? 'S/N',
      bairro: 'Centro',
      municipio: 'São Paulo',
      uf: 'SP',
      cep: '01310100',
      telefone: tenant.phone,
      email: tenant.email,
      crt: '1',     // Simples Nacional (most small shops)
      ie: 'ISENTO',
    }

    // Build NF-e items
    const nfeItems: NFeItem[] = items.map((item: any, idx: number) => ({
      numeroItem: String(idx + 1),
      codigoProduto: item.product_id.slice(0, 8),
      descricao: item.product_name,
      ncm: item.ncm ?? FocusNFeClient.NCM.PNEU_AUTOMOVEL,
      cfop: item.cfop ?? '5102',
      unidadeComercial: 'UN',
      quantidade: item.qty,
      valorUnitario: item.unit_price,
      valorTotal: item.total,
      origem: '0',
      // Simples Nacional ICMS
      modalidadeBcIcms: '3',
      aliquotaIcmsSimples: 0,
      valorIcmsSimples: 0,
    }))

    const ref = `tf_${sale.id.replace(/-/g, '').slice(0, 20)}`

    const nfeParams = focusNFe.buildVendaNFeParams({
      emitente,
      destinatario: {
        cpfCnpj: body.data.destinatarioCpfCnpj ?? '00000000000',
        nome: body.data.destinatarioNome,
        email: body.data.destinatarioEmail,
        indicadorIeDestinatario: '9',
      },
      itens: nfeItems,
      totalValue: sale.total,
      paymentMethod: sale.payment_method,
    })

    try {
      // Emit NF-e
      await focusNFe.emitir(ref, nfeParams)

      // Poll for authorization (up to 20 seconds)
      const status = await focusNFe.aguardarAutorizacao(ref, 10, 2000)

      // Save NF-e key on sale
      await query(
        `UPDATE sales SET nfe_key = $1, nfe_status = 'authorized', updated_at = NOW() WHERE id = $2`,
        [status.chave_nfe, sale.id]
      )

      // Audit log
      await query(
        `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, new_value)
         VALUES ($1, $2, $3, 'nfe.emitir', 'sale', $4, $5)`,
        [randomUUID(), request.tenantId, request.userId, sale.id, JSON.stringify({ nfeKey: status.chave_nfe, ref })]
      )

      return {
        ref,
        chaveNfe: status.chave_nfe,
        numero: status.numero,
        serie: status.serie,
        status: 'authorized',
        danfePath: status.caminho_danfe,
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      fastify.log.error({ ref, saleId: sale.id, error: message }, 'NF-e emission failed')

      await query(
        `UPDATE sales SET nfe_status = 'error', updated_at = NOW() WHERE id = $1`,
        [sale.id]
      )

      return reply.code(422).send({ error: 'NF-e emission failed', details: message })
    }
  })

  // ─── GET /nfe/:saleId/danfe ────────────────────────────────────

  fastify.get<{ Params: { saleId: string } }>('/:saleId/danfe', async (request, reply) => {
    const { rows: [sale] } = await query(
      'SELECT nfe_key, nfe_status FROM sales WHERE id = $1 AND tenant_id = $2',
      [request.params.saleId, request.tenantId]
    )
    if (!sale) return reply.code(404).send({ error: 'Sale not found' })
    if (sale.nfe_status !== 'authorized') return reply.code(422).send({ error: 'NF-e not authorized' })

    const ref = `tf_${request.params.saleId.replace(/-/g, '').slice(0, 20)}`
    const pdf = await focusNFe.getPDF(ref)

    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `attachment; filename="DANFE-${sale.nfe_key?.slice(-8) ?? 'nf'}.pdf"`)
    return reply.send(pdf)
  })

  // ─── GET /nfe/:saleId/xml ──────────────────────────────────────

  fastify.get<{ Params: { saleId: string } }>('/:saleId/xml', async (request, reply) => {
    const { rows: [sale] } = await query(
      'SELECT nfe_status FROM sales WHERE id = $1 AND tenant_id = $2',
      [request.params.saleId, request.tenantId]
    )
    if (!sale || sale.nfe_status !== 'authorized') {
      return reply.code(422).send({ error: 'NF-e not authorized' })
    }

    const ref = `tf_${request.params.saleId.replace(/-/g, '').slice(0, 20)}`
    const xml = await focusNFe.getXML(ref)

    reply.header('Content-Type', 'application/xml')
    reply.header('Content-Disposition', `attachment; filename="NFe-${ref}.xml"`)
    return reply.send(xml)
  })

  // ─── DELETE /nfe/:saleId (cancelar) ───────────────────────────

  fastify.delete<{ Params: { saleId: string } }>('/:saleId', {
    preHandler: [fastify.requireRole(['admin'])],
  }, async (request, reply) => {
    const schema = z.object({ justificativa: z.string().min(15, 'Justificativa deve ter ao menos 15 caracteres') })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const { rows: [sale] } = await query(
      'SELECT id, nfe_status FROM sales WHERE id = $1 AND tenant_id = $2',
      [request.params.saleId, request.tenantId]
    )
    if (!sale || sale.nfe_status !== 'authorized') {
      return reply.code(422).send({ error: 'NF-e not authorized or already cancelled' })
    }

    const ref = `tf_${request.params.saleId.replace(/-/g, '').slice(0, 20)}`
    await focusNFe.cancelar(ref, body.data.justificativa)

    await query(
      `UPDATE sales SET nfe_status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [sale.id]
    )

    return { success: true, message: 'NF-e cancelled successfully' }
  })
}
