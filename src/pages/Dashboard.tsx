import { Link } from 'react-router-dom'
import { Bar as RBar, CartesianGrid, Legend, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle } from 'lucide-react'
import { useStore } from '../lib/store'
import { breakEven, cashBalance, cashFlow, inventoryValue, isSale, itemStock, ivaBalance, lastMonths, money0, monthKey, monthLabel, monthRange, orderTotals, pct, pnl, productStock, receivables, today } from '../lib/calc'
import { Badge, Bar, Btn, Card, Empty, PageHeader, Stat } from '../components/ui'

export default function Dashboard() {
  const { data, loadDemo, cloud } = useStore()
  const s = data.settings
  const mk = monthKey()
  const [from, to] = monthRange(mk)
  const cur = pnl(data, from, to)
  const prevKey = lastMonths(2)[0]
  const prev = pnl(data, ...monthRange(prevKey))
  const cash = cashBalance(data)
  const ar = receivables(data)
  const arTotal = ar.reduce((a, x) => a + x.t.due, 0)
  const inv = inventoryValue(data)
  const be = breakEven(data)
  const iva = ivaBalance(data, from, to)
  const active = data.orders.filter(o => ['confirmado', 'produccion', 'listo'].includes(o.status))
  const delta = prev.revenue > 0 ? (cur.revenue - prev.revenue) / prev.revenue : 0

  const chart = lastMonths(6).map(k => {
    const [f, t] = monthRange(k); const p = pnl(data, f, t); const c = cashFlow(data, f, t)
    return { mes: monthLabel(k), Ventas: Math.round(p.revenue), Utilidad: Math.round(p.profit), Egresos: Math.round(c.outflow) }
  })

  const lowItems = data.items.filter(i => i.active && i.reorder_point > 0 && itemStock(i.id, data) <= i.reorder_point)
  const lowProducts = data.products.filter(p => p.active && p.reorder_point > 0 && productStock(p.id, data) <= p.reorder_point)
  const late = data.orders.filter(o => o.due_date && o.due_date < today() && ['confirmado', 'produccion', 'listo'].includes(o.status))
  const alerts: { tone: 'bad' | 'warn'; text: string; to: string }[] = [
    ...late.map(o => ({ tone: 'bad' as const, text: `Pedido #${o.number} vencido (${o.due_date})`, to: '/pedidos' })),
    ...lowItems.map(i => ({ tone: 'warn' as const, text: `Stock bajo: ${i.name} (${Math.round(itemStock(i.id, data))} ${i.unit})`, to: '/inventario' })),
    ...lowProducts.map(p => ({ tone: 'warn' as const, text: `Producto por agotarse: ${p.name} (${productStock(p.id, data)} pzas)`, to: '/inventario' })),
    ...(arTotal > 0 ? [{ tone: 'warn' as const, text: `${money0(arTotal)} por cobrar en ${ar.length} pedidos`, to: '/pedidos' }] : []),
    ...(cash < 0 ? [{ tone: 'bad' as const, text: 'La caja está en negativo: revisa el saldo inicial en Ajustes', to: '/ajustes' }] : []),
  ]

  const empty = !data.orders.length && !data.transactions.length

  return (
    <div>
      <PageHeader title="Panel" sub={`Resumen de ${new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`} action={empty && !cloud ? <Btn onClick={loadDemo}>Cargar datos de ejemplo</Btn> : undefined} />

      {empty && (
        <div className="mb-6 p-4 rounded-xl bg-sage/20 text-sm">
          Aún no hay movimientos. Empieza registrando un <Link className="underline font-medium" to="/pedidos">pedido</Link> o un <Link className="underline font-medium" to="/finanzas">ingreso/egreso</Link>
          {!cloud && ', o carga datos de ejemplo para explorar el sistema'}. Tu catálogo se puede importar desde <Link className="underline font-medium" to="/ajustes">Ajustes</Link>.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat label="Ventas netas del mes" value={money0(cur.revenue)} sub={prev.revenue ? `${delta >= 0 ? '▲' : '▼'} ${pct(Math.abs(delta))} vs mes anterior` : `${cur.orders} pedidos`} hint="Pedidos confirmados, sin IVA" />
        <Stat label="Utilidad del mes" value={money0(cur.profit)} tone={cur.profit >= 0 ? 'good' : 'bad'} sub={`Margen neto ${pct(cur.netPct)}`} hint="Ventas − costo de lo vendido − envíos/comisiones − gastos operativos" />
        <Stat label="Margen bruto" value={pct(cur.grossPct)} tone={cur.grossPct >= s.target_margin ? 'good' : 'warn'} sub={`Meta ${pct(s.target_margin)}`} />
        <Stat label="Efectivo disponible" value={money0(cash)} tone={cash >= 0 ? undefined : 'bad'} sub="Caja + bancos" />
        <Stat label="Por cobrar" value={money0(arTotal)} tone={arTotal > 0 ? 'warn' : undefined} sub={`${ar.length} pedidos con saldo`} />
        <Stat label="Inventario valuado" value={money0(inv.total)} sub={`Materiales ${money0(inv.materials)} · Terminado ${money0(inv.finished)}`} />
      </div>

      <div className="grid xl:grid-cols-3 gap-4 mt-4">
        <Card title="Ventas, utilidad y egresos — últimos 6 meses" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer>
              <ComposedChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e2d8" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} />
                <Tooltip formatter={(v) => money0(Number(v))} />
                <Legend />
                <RBar dataKey="Ventas" fill="#9bae9d" radius={[4, 4, 0, 0]} />
                <RBar dataKey="Egresos" fill="#c8cdd0" radius={[4, 4, 0, 0]} />
                <Line dataKey="Utilidad" stroke="#2b2b2b" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Metas del mes">
          <div className="space-y-5 text-sm">
            <div>
              <div className="flex justify-between mb-1"><span>Meta de ventas</span><span className="tabular-nums">{money0(cur.revenue)} / {money0(s.monthly_revenue_goal)}</span></div>
              <Bar value={cur.revenue} max={s.monthly_revenue_goal} />
            </div>
            <div>
              <div className="flex justify-between mb-1"><span>Punto de equilibrio</span><span className="tabular-nums">{money0(cur.revenue)} / {money0(be.revenue)}</span></div>
              <Bar value={cur.revenue} max={be.revenue} tone={cur.revenue >= be.revenue ? 'sage' : 'warn'} />
              <p className="text-xs text-[#6b6f72] mt-1">Con gastos fijos de {money0(s.monthly_fixed_costs)} y margen de contribución de {pct(be.contributionPct)}, necesitas vender {money0(be.revenue)} al mes para no perder.</p>
            </div>
            <div className="pt-3 border-t border-sand">
              <div className="flex justify-between"><span>IVA trasladado − acreditable</span><span className="tabular-nums font-medium">{money0(iva.payable)}</span></div>
              <p className="text-xs text-[#6b6f72] mt-1">{iva.payable >= 0 ? 'Reserva este monto para tu declaración.' : 'Saldo a favor este mes.'}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card title="Pedidos en curso" action={<Link to="/pedidos" className="text-xs underline">Ver todos</Link>}>
          {active.length === 0 ? <Empty>No hay pedidos activos.</Empty> : (
            <table><tbody>
              {active.slice().sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')).slice(0, 7).map(o => {
                const t = orderTotals(o, data)
                return (
                  <tr key={o.id}>
                    <td className="font-medium">#{o.number}</td>
                    <td>{data.customers.find(c => c.id === o.customer_id)?.name ?? '—'}</td>
                    <td><Badge s={o.status} /></td>
                    <td className="text-xs text-[#6b6f72]">{o.due_date ?? ''}</td>
                    <td className="num">{money0(t.gross)}</td>
                  </tr>
                )
              })}
            </tbody></table>
          )}
        </Card>

        <Card title="Alertas">
          {alerts.length === 0 ? <Empty>Todo en orden ✓</Empty> : (
            <ul className="space-y-2">
              {alerts.slice(0, 8).map((a, i) => (
                <li key={i}><Link to={a.to} className="flex items-start gap-2 text-sm hover:underline">
                  <AlertTriangle size={15} className={a.tone === 'bad' ? 'text-bad mt-0.5' : 'text-warn mt-0.5'} />{a.text}
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mt-4">
        <Stat label="Ticket promedio" value={money0(cur.aov)} sub="Con IVA, por pedido" />
        <Stat label="Piezas vendidas" value={cur.units} />
        <Stat label="Gastos operativos" value={money0(cur.opex)} sub={`${pct(cur.revenue ? cur.opex / cur.revenue : 0)} de las ventas`} />
        <Stat label="Pedidos del mes" value={data.orders.filter(o => isSale(o) && o.order_date >= from).length} />
      </div>
    </div>
  )
}
