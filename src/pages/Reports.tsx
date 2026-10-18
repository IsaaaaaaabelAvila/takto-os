import { useState } from 'react'
import { Download } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../lib/store'
import { isSale, lastMonths, money, money0, monthLabel, monthRange, orderTotals, pct, pnl, productPerformance, sum } from '../lib/calc'
import { Btn, Card, Empty, PageHeader, downloadCSV } from '../components/ui'

const COLORS = ['#9bae9d', '#2b2b2b', '#c8cdd0', '#6f8672', '#e7e2d8', '#c28a2b']

export default function Reports() {
  const { data } = useStore()
  const [n, setN] = useState(6)
  const months = lastMonths(n)
  const cols = months.map(k => ({ k, p: pnl(data, ...monthRange(k)) }))
  const total = pnl(data, monthRange(months[0])[0], monthRange(months[months.length - 1])[1])
  const [from, to] = [monthRange(months[0])[0], monthRange(months[months.length - 1])[1]]
  const prods = productPerformance(data, from, to)
  const orders = data.orders.filter(o => isSale(o) && o.order_date >= from && o.order_date <= to)
  const byChannel = Object.entries(orders.reduce<Record<string, number>>((m, o) => { m[o.channel] = (m[o.channel] ?? 0) + orderTotals(o, data).net; return m }, {})).map(([name, value]) => ({ name, value: Math.round(value) }))
  const cats = [...new Set(cols.flatMap(c => Object.keys(c.p.opexByCat)))]
  const row = (label: string, f: (p: ReturnType<typeof pnl>) => number, bold = false, neg = false) => (
    <tr className={bold ? 'bg-sand/40 font-semibold' : ''}>
      <td>{label}</td>{cols.map(c => <td key={c.k} className="num">{neg && f(c.p) ? '−' : ''}{money0(f(c.p))}</td>)}<td className="num font-semibold">{neg && f(total) ? '−' : ''}{money0(f(total))}</td>
    </tr>
  )
  const exportPnl = () => downloadCSV('estado_de_resultados.csv', [['Concepto', ...months.map(monthLabel), 'Total'], ['Ventas netas', ...cols.map(c => c.p.revenue.toFixed(2)), total.revenue.toFixed(2)], ['Costo de ventas', ...cols.map(c => c.p.cogs.toFixed(2)), total.cogs.toFixed(2)], ['Utilidad bruta', ...cols.map(c => c.p.grossProfit.toFixed(2)), total.grossProfit.toFixed(2)], ['Gastos operativos', ...cols.map(c => c.p.opex.toFixed(2)), total.opex.toFixed(2)], ['Utilidad neta', ...cols.map(c => c.p.profit.toFixed(2)), total.profit.toFixed(2)]])
  const exportOrders = () => downloadCSV('pedidos.csv', [['#', 'Fecha', 'Cliente', 'Canal', 'Estado', 'Total', 'Neto', 'Costo', 'Margen', 'Pagado', 'Saldo'], ...data.orders.map(o => { const t = orderTotals(o, data); return [o.number, o.order_date, data.customers.find(c => c.id === o.customer_id)?.name ?? '', o.channel, o.status, t.gross.toFixed(2), t.net.toFixed(2), t.variable.toFixed(2), t.margin.toFixed(2), t.paid.toFixed(2), t.due.toFixed(2)] })])
  const exportTx = () => downloadCSV('movimientos.csv', [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Cuenta', 'Monto', 'IVA incluido'], ...data.transactions.map(t => [t.tx_date, t.type, t.category, t.description ?? '', t.account, t.amount, t.iva_included ? 'sí' : 'no'])])

  return (
    <div>
      <PageHeader title="Reportes" sub="Estado de resultados, rentabilidad por producto y canal" action={
        <div className="flex gap-2 items-center">
          <select className="!w-36" value={n} onChange={e => setN(+e.target.value)}><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>12 meses</option></select>
          <Btn variant="ghost" onClick={exportPnl}><Download size={15} />P&L</Btn><Btn variant="ghost" onClick={exportOrders}><Download size={15} />Pedidos</Btn><Btn variant="ghost" onClick={exportTx}><Download size={15} />Movimientos</Btn>
        </div>} />

      <Card title="Estado de resultados" className="overflow-x-auto mb-4">
        <table>
          <thead><tr><th>Concepto</th>{months.map(m => <th key={m} className="num">{monthLabel(m)}</th>)}<th className="num">Total</th></tr></thead>
          <tbody>
            {row('Ventas netas (sin IVA)', p => p.revenue, true)}
            {row('Costo de lo vendido (material, energía, máquina)', p => p.cogs, false, true)}
            {row('Envíos pagados', p => p.shipping, false, true)}
            {row('Comisiones de plataforma', p => p.fees, false, true)}
            {row('Utilidad bruta', p => p.grossProfit, true)}
            <tr><td className="text-[#6b6f72]">Margen bruto</td>{cols.map(c => <td key={c.k} className="num text-[#6b6f72]">{pct(c.p.grossPct)}</td>)}<td className="num text-[#6b6f72]">{pct(total.grossPct)}</td></tr>
            {cats.map(cat => <tr key={cat}><td>{cat}</td>{cols.map(c => <td key={c.k} className="num">−{money0(c.p.opexByCat[cat] ?? 0)}</td>)}<td className="num">−{money0(sum(cols.map(c => c.p.opexByCat[cat] ?? 0)))}</td></tr>)}
            {row('Otros ingresos', p => p.otherIncome)}
            {row('Utilidad neta (antes de ISR)', p => p.profit, true)}
            <tr><td className="text-[#6b6f72]">Margen neto</td>{cols.map(c => <td key={c.k} className="num text-[#6b6f72]">{pct(c.p.netPct)}</td>)}<td className="num text-[#6b6f72]">{pct(total.netPct)}</td></tr>
          </tbody>
        </table>
        <p className="text-xs text-[#6b6f72] mt-3">Base acumulada: el ingreso se reconoce al confirmar el pedido; el costo sale del costeo de cada pieza vendida. Compras de material y equipo no son gasto del mes. ISR no incluido.</p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Rentabilidad por producto" className="overflow-x-auto">
          {prods.length === 0 ? <Empty>Sin ventas en el periodo.</Empty> : (
            <table>
              <thead><tr><th>Producto</th><th className="num">Pzas</th><th className="num">Ventas</th><th className="num">Utilidad</th><th className="num">Margen</th></tr></thead>
              <tbody>{prods.map(p => <tr key={p.name}><td className="font-medium">{p.name}</td><td className="num">{p.qty}</td><td className="num">{money0(p.revenue)}</td><td className="num">{money0(p.profit)}</td><td className="num">{pct(p.pct)}</td></tr>)}</tbody>
            </table>
          )}
        </Card>
        <Card title="Ventas netas por canal">
          {byChannel.length === 0 ? <Empty>Sin ventas en el periodo.</Empty> : (
            <div className="h-64"><ResponsiveContainer><PieChart><Pie data={byChannel} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} label={e => e.name}>{byChannel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={v => money0(Number(v))} /></PieChart></ResponsiveContainer></div>
          )}
        </Card>
        <Card title="Utilidad por producto" className="lg:col-span-2">
          {prods.length === 0 ? <Empty>Sin datos.</Empty> : (
            <div className="h-60"><ResponsiveContainer><BarChart data={prods.map(p => ({ ...p, profit: Math.round(p.profit) }))}><CartesianGrid strokeDasharray="3 3" stroke="#e7e2d8" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip formatter={v => money(Number(v))} /><Bar dataKey="profit" fill="#9bae9d" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
          )}
        </Card>
      </div>
    </div>
  )
}
