import type { FastifyInstance } from 'fastify'
import { query } from '../../db/client.js'

export async function reportsRoutes(fastify: FastifyInstance) {
  // ─── Summary KPIs ─────────────────────────────────────────────
  fastify.get('/summary', { preHandler: [fastify.authenticate] }, async (request) => {
    const tid = request.tenantId

    const [revenue, products, clients] = await Promise.all([
      query<{ total: string; count: string; avg: string }>(
        `SELECT
          COALESCE(SUM(total), 0) as total,
          COUNT(*) as count,
          COALESCE(AVG(total), 0) as avg
         FROM sales
         WHERE tenant_id = $1 AND payment_status = 'completed'
           AND created_at >= NOW() - INTERVAL '30 days'`,
        [tid]
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) as count FROM products WHERE tenant_id = $1 AND is_active = true`,
        [tid]
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) as count FROM clients WHERE tenant_id = $1 AND is_active = true`,
        [tid]
      ),
    ])

    return {
      revenue: parseFloat(revenue.rows[0]?.total ?? '0'),
      salesCount: parseInt(revenue.rows[0]?.count ?? '0'),
      avgTicket: parseFloat(revenue.rows[0]?.avg ?? '0'),
      productsCount: parseInt(products.rows[0]?.count ?? '0'),
      clientsCount: parseInt(clients.rows[0]?.count ?? '0'),
    }
  })

  // ─── Monthly Revenue (last 6 months) ──────────────────────────
  fastify.get('/revenue', { preHandler: [fastify.authenticate] }, async (request) => {
    const { rows } = await query<{ month: string; revenue: string; sales_count: string }>(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
         COALESCE(SUM(total), 0) as revenue,
         COUNT(*) as sales_count
       FROM sales
       WHERE tenant_id = $1 AND payment_status = 'completed'
         AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY DATE_TRUNC('month', created_at)`,
      [request.tenantId]
    )
    return {
      data: rows.map((r) => ({
        month: r.month,
        revenue: parseFloat(r.revenue),
        salesCount: parseInt(r.sales_count),
      })),
    }
  })

  // ─── Top Products ──────────────────────────────────────────────
  fastify.get('/top-products', { preHandler: [fastify.authenticate] }, async (request) => {
    const { rows } = await query<{ name: string; size: string; sold: string; revenue: string }>(
      `SELECT
         p.name,
         p.size,
         SUM(si.qty) as sold,
         SUM(si.total) as revenue
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       JOIN sales s ON s.id = si.sale_id
       WHERE s.tenant_id = $1 AND s.payment_status = 'completed'
         AND s.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY p.id, p.name, p.size
       ORDER BY sold DESC
       LIMIT 5`,
      [request.tenantId]
    )
    return {
      data: rows.map((r) => ({
        name: `${r.name} ${r.size}`,
        sold: parseInt(r.sold),
        revenue: parseFloat(r.revenue),
      })),
    }
  })

  // ─── Top Clients ───────────────────────────────────────────────
  fastify.get('/top-clients', { preHandler: [fastify.authenticate] }, async (request) => {
    const { rows } = await query<{ id: string; name: string; total_spent: string; total_visits: string }>(
      `SELECT id, name, total_spent, total_visits
       FROM clients
       WHERE tenant_id = $1 AND is_active = true AND total_spent > 0
       ORDER BY total_spent DESC
       LIMIT 5`,
      [request.tenantId]
    )
    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        totalSpent: parseFloat(r.total_spent),
        totalVisits: parseInt(r.total_visits),
      })),
    }
  })

  // ─── Payment Methods ───────────────────────────────────────────
  fastify.get('/payment-methods', { preHandler: [fastify.authenticate] }, async (request) => {
    const { rows } = await query<{ payment_method: string; amount: string; sales_count: string }>(
      `SELECT
         payment_method,
         COALESCE(SUM(total), 0) as amount,
         COUNT(*) as sales_count
       FROM sales
       WHERE tenant_id = $1 AND payment_status = 'completed'
         AND created_at >= DATE_TRUNC('month', NOW())
       GROUP BY payment_method
       ORDER BY amount DESC`,
      [request.tenantId]
    )

    const total = rows.reduce((s, r) => s + parseFloat(r.amount), 0)
    return {
      data: rows.map((r) => ({
        method: r.payment_method,
        amount: parseFloat(r.amount),
        count: parseInt(r.sales_count),
        pct: total > 0 ? Math.round((parseFloat(r.amount) / total) * 100) : 0,
      })),
    }
  })
}
