import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../lib/store'
import { CATEGORIES, cashBalance, cashFlow, groupOf, ivaBalance, lastMonths, money, money0, monthKey, monthLabel, monthRange, receivables, sum, today } from '../lib/calc'
import { Badge, Btn, Card, Empty, Field, Modal, PageHeader, Stat } from '../components/ui'
import type { RecurringExpense, Transaction } from '../lib/types'

function Recurring() {
  const { data, add, edit, del } = useStore()
  const [f, setF] = useState({ name: '', category: 'Renta y servicios', amount: 0, iva_included: false, day_of_month: 1, start_month: monthKey() })
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card title="Gastos recurrentes" className="lg:col-span-2 overflow-x-auto">
        {data.recurring_expenses.length === 0 ? <Empty>Sin gastos recurrentes.</Empty> : (
          <table>
            <thead><tr><th>Concepto</th><th>Categoría</th><th>Día</th><th className="num">Monto/mes</th><th>Último cargo</th><th></th></tr></thead>
            <tbody>{data.recurring_expenses.map((r: RecurringExpense) => (
              <tr key={r.id} className={r.active ? '' : 'opacity-50'}>
                <td className="font-medium">{r.name}</td><td>{r.category}</td><td>{r.day_of_month}</td><td className="num">{money(r.amount)}</td><td>{r.last_generated ?? 'pendiente'}</td>
                <td className="text-right whitespace-nowrap"><button className="text-xs underline mr-3" onClick={() => edit('recurring_expenses', r.id, { active: !r.active })}>{r.active ? 'pausar' : 'activar'}</button><button className="text-xs underline text-bad" onClick={() => confirm('¿Eliminar? Los cargos ya generados se conservan.') && del('recurring_expenses', r.id)}>borrar</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
        <p className="text-xs text-[#6b6f72] mt-3">Cada mes el sistema registra automáticamente el egreso en su día (al abrir la app). Total mensual: {money(sum(data.recurring_expenses.filter(r => r.active).map(r => r.amount)))}</p>
      </Card>
      <Card title="Nuevo gasto recurrente">
        <div className="space-y-3">
          <Field label="Concepto"><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Renta, Shopify…" /></Field>
          <Field label="Categoría"><select value={f.category} onChange={e => setF({ ...f, category: e.target.value, iva_included: CATEGORIES.find(c => c.name === e.target.value)?.iva ?? false })}>{CATEGORIES.filter(c => c.type === 'egreso' && c.group === 'opex').map(c => <option key={c.name}>{c.name}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto mensual"><input type="number" value={f.amount} onChange={e => setF({ ...f, amount: +e.target.value })} /></Field>
            <Field label="Día del mes"><input type="number" min={1} max={28} value={f.day_of_month} onChange={e => setF({ ...f, day_of_month: +e.target.value })} /></Field>
          </div>
          <Field label="Primer mes"><input type="month" value={f.start_month} onChange={e => setF({ ...f, start_month: e.target.value })} /></Field>
          <label className="flex items-center gap-2 !text-sm"><input type="checkbox" checked={f.iva_included} onChange={e => setF({ ...f, iva_included: e.target.checked })} />Incluye IVA</label>
          <Btn disabled={!f.name || f.amount <= 0} onClick={async () => { await add('recurring_expenses', { ...f, account: 'banco', active: true, last_generated: null }); setF({ ...f, name: '', amount: 0 }) }}>Agregar</Btn>
        </div>
      </Card>
    </div>
  )
}

function TxForm({ tx, onClose }: { tx?: Transaction; onClose: () => void }) {
  const { add, edit, del, data } = useStore()
  const [f, setF] = useState<Omit<Transaction, 'id'>>(tx ?? { tx_date: today(), type: 'egreso', category: 'Otros gastos', amount: 0, iva_included: true, account: 'banco', description: '', order_id: null })
  const cats = CATEGORIES.filter(c => c.type === f.type)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(x => ({ ...x, [k]: v }))
  const net = f.iva_included ? f.amount / (1 + data.settings.iva_rate) : f.amount
  return (
    <Modal title={tx ? 'Editar movimiento' : 'Nuevo movimiento'} onClose={onClose}>
      <div className="flex gap-2 mb-3">
        {(['egreso', 'ingreso'] as const).map(t => <button key={t} onClick={() => setF(x => ({ ...x, type: t, category: CATEGORIES.find(c => c.type === t)!.name, iva_included: true }))} className={`flex-1 py-2 rounded-lg text-sm font-medium border ${f.type === t ? (t === 'egreso' ? 'bg-bad text-white border-bad' : 'bg-sage-dark text-white border-sage-dark') : 'bg-white border-fog'}`}>{t === 'egreso' ? 'Egreso (salida)' : 'Ingreso (entrada)'}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha"><input type="date" value={f.tx_date} onChange={e => set('tx_date', e.target.value)} /></Field>
        <Field label="Monto total"><input type="number" step="0.01" value={f.amount} onChange={e => set('amount', +e.target.value)} /></Field>
        <Field label="Categoría"><select value={f.category} onChange={e => { set('category', e.target.value); set('iva_included', CATEGORIES.find(c => c.name === e.target.value)?.iva ?? true) }}>{cats.map(c => <option key={c.name}>{c.name}</option>)}</select></Field>
        <Field label="Cuenta"><select value={f.account} onChange={e => set('account', e.target.value)}><option>banco</option><option>efectivo</option><option>tarjeta</option></select></Field>
      </div>
      <label className="flex items-center gap-2 mt-3 !text-sm"><input type="checkbox" checked={f.iva_included} onChange={e => set('iva_included', e.target.checked)} />El monto incluye IVA {f.iva_included && f.amount > 0 && <span className="text-[#6b6f72]">(base {money(net)} + IVA {money(f.amount - net)})</span>}</label>
      <Field label="Descripción" className="mt-3"><input value={f.description ?? ''} onChange={e => set('description', e.target.value)} /></Field>
      {groupOf(f.category) === 'capex' && <p className="text-xs text-[#6b6f72] mt-2">Las compras de equipo no se cargan al gasto del mes: se reflejan en el flujo de inversión y en el costo de máquina por trabajo.</p>}
      {groupOf(f.category) === 'inventario' && <p className="text-xs text-[#6b6f72] mt-2">Las compras de material son inventario: llegan al estado de resultados cuando vendes (costo de ventas). Mejor regístralas desde Inventario → Comprar.</p>}
      <div className="flex justify-between mt-5">
        {tx ? <Btn variant="danger" onClick={async () => { if (confirm('¿Eliminar movimiento?')) { await del('transactions', tx.id); onClose() } }}>Eliminar</Btn> : <span />}
        <div className="flex gap-2"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={f.amount <= 0} onClick={async () => { tx ? await edit('transactions', tx.id, f) : await add('transactions', f); onClose() }}>Guardar</Btn></div>
      </div>
    </Modal>
  )
}

export default function Finance() {
  const { data } = useStore()
  const [tab, setTab] = useState<'mov' | 'flujo' | 'cobrar' | 'iva' | 'rec'>('mov')
  const [month, setMonth] = useState(monthKey()); const [ed, setEd] = useState<{ tx?: Transaction } | null>(null)
  const [from, to] = monthRange(month)
  const txs = data.transactions.filter(t => t.tx_date >= from && t.tx_date <= to).sort((a, b) => b.tx_date.localeCompare(a.tx_date))
  const cf = cashFlow(data, from, to); const ar = receivables(data); const iva = ivaBalance(data, from, to)
  const months = lastMonths(12).reverse()
  const chart = lastMonths(6).map(k => { const c = cashFlow(data, ...monthRange(k)); return { mes: monthLabel(k), Entradas: Math.round(c.inflow), Salidas: Math.round(c.outflow) } })
  const accounts = ['banco', 'efectivo', 'tarjeta'].map(a => ({ a, v: sum(data.transactions.filter(t => t.account === a).map(t => t.type === 'ingreso' ? t.amount : -t.amount)) }))

  return (
    <div>
      <PageHeader title="Finanzas" sub="Libro de ingresos y egresos, flujo de efectivo, cuentas por cobrar e IVA" action={<Btn onClick={() => setEd({})}><Plus size={16} />Nuevo movimiento</Btn>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Efectivo total" value={money0(cashBalance(data))} sub={accounts.map(x => `${x.a} ${money0(x.v)}`).join(' · ')} />
        <Stat label="Entradas del mes" value={money0(cf.inflow)} tone="good" />
        <Stat label="Salidas del mes" value={money0(cf.outflow)} />
        <Stat label="Flujo neto del mes" value={money0(cf.net)} tone={cf.net >= 0 ? 'good' : 'bad'} />
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {([['mov', 'Movimientos'], ['flujo', 'Flujo de efectivo'], ['cobrar', 'Por cobrar'], ['iva', 'IVA'], ['rec', 'Recurrentes']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-full text-sm ${tab === k ? 'bg-graphite text-white' : 'bg-white border border-sand'}`}>{l}</button>)}
        {tab !== 'cobrar' && tab !== 'rec' && <select className="!w-44 ml-auto" value={month} onChange={e => setMonth(e.target.value)}>{months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>}
      </div>

      {tab === 'mov' && (
        <Card className="overflow-x-auto !p-0">
          {txs.length === 0 ? <Empty>Sin movimientos en este mes.</Empty> : (
            <table>
              <thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Cuenta</th><th className="num">Monto</th></tr></thead>
              <tbody>{txs.map(t => (
                <tr key={t.id} className="cursor-pointer hover:bg-sand/30" onClick={() => setEd({ tx: t })}>
                  <td>{t.tx_date}</td><td>{t.category}</td><td className="text-[#6b6f72]">{t.description}</td><td>{t.account}</td>
                  <td className={`num font-medium ${t.type === 'ingreso' ? 'text-sage-dark' : 'text-bad'}`}>{t.type === 'ingreso' ? '+' : '−'}{money(t.amount)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'flujo' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title={`Flujo de efectivo — ${monthLabel(month)}`}>
            <table><tbody>
              <tr><td>Actividades de operación</td><td className="num">{money(cf.operating)}</td></tr>
              <tr><td>Actividades de inversión (equipo)</td><td className="num">{money(cf.investing)}</td></tr>
              <tr><td>Actividades de financiamiento (capital, préstamos, retiros)</td><td className="num">{money(cf.financing)}</td></tr>
              <tr><td className="font-semibold">Variación neta de efectivo</td><td className={`num font-semibold ${cf.net >= 0 ? 'text-sage-dark' : 'text-bad'}`}>{money(cf.net)}</td></tr>
            </tbody></table>
            <p className="text-xs text-[#6b6f72] mt-3">Operación incluye cobros de ventas, pagos de gastos, compras de material e impuestos. Un negocio sano genera flujo de operación positivo sin depender de aportaciones.</p>
          </Card>
          <Card title="Entradas vs salidas — 6 meses">
            <div className="h-64"><ResponsiveContainer><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="#e7e2d8" vertical={false} /><XAxis dataKey="mes" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} /><Tooltip formatter={v => money0(Number(v))} /><Legend /><Bar dataKey="Entradas" fill="#9bae9d" radius={[4, 4, 0, 0]} /><Bar dataKey="Salidas" fill="#2b2b2b" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
          </Card>
        </div>
      )}

      {tab === 'cobrar' && (
        <Card className="overflow-x-auto !p-0" title={`Cuentas por cobrar: ${money0(sum(ar.map(x => x.t.due)))}`}>
          {ar.length === 0 ? <Empty>Nadie te debe nada 🎉</Empty> : (
            <table>
              <thead><tr><th>Pedido</th><th>Cliente</th><th>Estado</th><th>Fecha</th><th className="num">Días</th><th className="num">Total</th><th className="num">Pagado</th><th className="num">Saldo</th></tr></thead>
              <tbody>{ar.sort((a, b) => a.o.order_date.localeCompare(b.o.order_date)).map(({ o, t }) => {
                const days = Math.floor((Date.now() - new Date(o.order_date).getTime()) / 864e5)
                return <tr key={o.id}><td>#{o.number}</td><td>{data.customers.find(c => c.id === o.customer_id)?.name ?? '—'}</td><td><Badge s={o.status} /></td><td>{o.order_date}</td><td className={`num ${days > 30 ? 'text-bad' : ''}`}>{days}</td><td className="num">{money0(t.gross)}</td><td className="num">{money0(t.paid)}</td><td className="num font-medium text-warn">{money0(t.due)}</td></tr>
              })}</tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'iva' && (
        <Card title={`IVA — ${monthLabel(month)}`}>
          <table><tbody>
            <tr><td>IVA trasladado (cobrado en ventas)</td><td className="num">{money(iva.charged)}</td></tr>
            <tr><td>IVA acreditable (pagado en compras y gastos)</td><td className="num">−{money(iva.creditable)}</td></tr>
            <tr><td className="font-semibold">{iva.payable >= 0 ? 'IVA por pagar' : 'IVA a favor'}</td><td className={`num font-semibold ${iva.payable >= 0 ? 'text-warn' : 'text-sage-dark'}`}>{money(Math.abs(iva.payable))}</td></tr>
          </tbody></table>
          <p className="text-xs text-[#6b6f72] mt-3">Cálculo por flujo de efectivo (base de efectivo, como en México). Es un estimado de control: valida con tu contador y tus CFDI antes de declarar.</p>
        </Card>
      )}
      {tab === 'rec' && <Recurring />}
      {ed && <TxForm tx={ed.tx} onClose={() => setEd(null)} />}
    </div>
  )
}
