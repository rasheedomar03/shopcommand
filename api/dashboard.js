import { createHandler } from './_lib/handler.js'

const REVENUE_STAGES = ['Complete', 'Invoiced', 'Paid']

export default createHandler(
  { methods: ['GET'] },
  async ({ req, res, sql, user }) => {
    const shopId = req.query?.shop_id || null
    const today = new Date().toISOString().slice(0, 10)
    const monthStart = today.slice(0, 7) + '-01'

    const shopFilter = shopId
      ? sql`AND ro.shop_id = ${shopId}`
      : sql``

    const [revToday] = await sql`
      SELECT COALESCE(SUM(ro.total), 0) AS amount
      FROM repair_orders ro
      WHERE ro.stage = ANY(${REVENUE_STAGES})
        AND ro.updated_at::date = ${today}::date
        ${shopFilter}
    `

    const [revMTD] = await sql`
      SELECT COALESCE(SUM(ro.total), 0) AS amount
      FROM repair_orders ro
      WHERE ro.stage = ANY(${REVENUE_STAGES})
        AND ro.updated_at >= ${monthStart}::date
        ${shopFilter}
    `

    const [openCount] = await sql`
      SELECT COUNT(*) AS count
      FROM repair_orders ro
      WHERE ro.stage NOT IN ('Complete', 'Invoiced', 'Paid')
        ${shopFilter}
    `

    const stageRows = await sql`
      SELECT ro.stage, COUNT(*) AS count
      FROM repair_orders ro
      WHERE 1=1 ${shopFilter}
      GROUP BY ro.stage
    `
    const rosByStage = {}
    for (const r of stageRows) {
      rosByStage[r.stage] = Number(r.count)
    }

    const recentROs = await sql`
      SELECT ro.id, ro.ro_number, ro.stage, ro.total, ro.created_at, ro.updated_at,
             c.name AS customer_name
      FROM repair_orders ro
      LEFT JOIN customers c ON c.id = ro.customer_id
      WHERE 1=1 ${shopFilter}
      ORDER BY ro.created_at DESC
      LIMIT 5
    `

    const chartRows = await sql`
      SELECT d::date AS date, COALESCE(SUM(ro.total), 0) AS revenue
      FROM generate_series(
        (CURRENT_DATE - INTERVAL '10 days')::date,
        CURRENT_DATE::date,
        '1 day'::interval
      ) AS d
      LEFT JOIN repair_orders ro
        ON ro.updated_at::date = d::date
        AND ro.stage = ANY(${REVENUE_STAGES})
        ${shopFilter}
      GROUP BY d::date
      ORDER BY d::date ASC
    `
    const revenueChart = chartRows.map(r => ({
      date: r.date,
      revenue: Number(r.revenue),
    }))

    return res.json({
      revenueToday: Number(revToday.amount),
      revenueMTD: Number(revMTD.amount),
      openROs: Number(openCount.count),
      rosByStage,
      recentROs,
      revenueChart,
    })
  }
)
