import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { costProduct, filamentPerGram, money, money0, orderTotals, pct, productStock, today } from '../lib/calc'
import { Badge, Btn, Card, Empty, Field, Modal, PageHeader, STATUS_LABEL } from '../components/ui'
import type { Order, OrderStatus } from '../lib/types'

const FLOW: OrderStatus[] = ['cotizacion', 'confirmado', 'produccion', 'listo', 'enviado', 'entregado']
const CHANNELS = ['directo', 'instagram', 'tienda_online', 'mercado_libre', 'evento', 'mayoreo']

interface Line { product_id: string | null; description: string; qty: number; unit_price: number; unit_cost: number }

function NewOrder({ onClose }: { onClose: () => void }) {
  const { data, createOrder, add } = useStore()
  const gram = filamentPerGram(data.items)
  const [customer, setCustomer] = useState(''); const [newCustomer, setNewCustomer] = useState('')
  const [channel, setChannel] = useState('directo'); const [status, setStatus] = useState<OrderStatus>('confirmado')
  const [due, setDue] = useState(''); const [discount, setDiscount] = useState(0)
  const [shipC, setShipC] = useState(0); const [shipK, setShipK] = useState(0); const [fee, setFee] = useState(0); const [deposit, setDeposit] = useState(0)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([{ product_id: null, description: '', qty: 1, unit_price: 0, unit_cost: 0 }])

  const pick = (i: number, pid: string) => {
    const p = data.products.find(x => x.id === pid)
    setLines(ls => ls.map((l, j) => j !== i ? l : p ? { product_id: p.id, description: p.name, qty: l.qty, unit_price: p.price, unit_cost: Math.round(costProduct(p, data.settings, gram).unitCost * 100) / 100 } : { ...l, product_id: null }))
  }
  const upd = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, j) => j === i ? { ...l, ...patch } : l))
  const gross = Math.max(0, lines.reduce((a, l) => a + l.qty * l.unit_price, 0) - discount + shipC)
  const net = gross / (1 + data.settings.iva_rate)
  const cost = lines.reduce((a, l) => a + l.qty * l.unit_cost, 0) + shipK + fee
  const valid = lines.some(l => l.description && l.qty > 0)

  const save = async () => {
    let cid = customer || null
    if (!cid && newCustomer.trim()) cid = (await add('customers', { name: newCustomer.trim() })).id
    await createOrder({ customer_id: cid, channel, status, due_date: due || null, discount, shipping_charged: shipC, shipping_cost: shipK, platform_fee: fee, notes: notes || null }, lines.filter(l => l.description && l.qty > 0), deposit)
    onClose()
  }

  return (
    <Modal title="Nuevo pedido" onClose={onClose} wide>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Cliente">
          <select value={customer} onChange={e => setCustomer(e.target.value)}>
            <option value="">— nuevo / sin cliente —</option>
            {data.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="…o nombre de cliente nuevo"><input value={newCustomer} onChange={e => setNewCustomer(e.target.value)} disabled={!!customer} /></Field>
        <Field label="Canal"><select value={channel} onChange={e => setChannel(e.target.value)}>{CHANNELS.map(c => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Estado inicial"><select value={status} onChange={e => setStatus(e.target.value as OrderStatus)}>{FLOW.slice(0, 3).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></Field>
        <Field label="Fecha de entrega prometida"><input type="date" value={due} onChange={e => setDue(e.target.value)} /></Field>
      </div>

      <h4 className="text-sm font-semibold mt-5 mb-2">Productos</h4>
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12 sm:col-span-4"><label>Producto</label>
              <select value={l.product_id ?? ''} onChange={e => pick(i, e.target.value)}>
                <option value="">Personalizado…</option>
                {data.products.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.line ? `${p.line} · ` : ''}{p.name} (stock {productStock(p.id, data)})</option>)}
              </select></div>
            <div className="col-span-12 sm:col-span-3"><label>Descripción</label><input value={l.description} onChange={e => upd(i, { description: e.target.value })} /></div>
            <div className="col-span-3 sm:col-span-1"><label>Cant.</label><input type="number" min={1} value={l.qty} onChange={e => upd(i, { qty: +e.target.value })} /></div>
            <div className="col-span-4 sm:col-span-2"><label>Precio c/IVA</label><input type="number" value={l.unit_price} onChange={e => upd(i, { unit_price: +e.target.value })} /></div>
            <div className="col-span-4 sm:col-span-1"><label>Costo</label><input type="number" value={l.unit_cost} onChange={e => upd(i, { unit_cost: +e.target.value })} /></div>
            <button className="col-span-1 pb-2 text-bad" onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} aria-label="Quitar"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <Btn variant="ghost" className="mt-2" onClick={() => setLines(ls => [...ls, { product_id: null, description: '', qty: 1, unit_price: 0, unit_cost: 0 }])}><Plus size={14} />Agregar línea</Btn>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        <Field label="Descuento (c/IVA)"><input type="number" value={discount} onChange={e => setDiscount(+e.target.value)} /></Field>
        <Field label="Envío cobrado"><input type="number" value={shipC} onChange={e => setShipC(+e.target.value)} /></Field>
        <Field label="Costo real de envío"><input type="number" value={shipK} onChange={e => setShipK(+e.target.value)} /></Field>
        <Field label="Comisión plataforma"><input type="number" value={fee} onChange={e => setFee(+e.target.value)} /></Field>
        <Field label="Anticipo recibido"><input type="number" value={deposit} onChange={e => setDeposit(+e.target.value)} /></Field>
      </div>
      <Field label="Notas" className="mt-3"><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></Field>

      <div className="mt-5 p-3 rounded-lg bg-white border border-sand text-sm grid grid-cols-3 gap-2">
        <div><div className="text-xs text-[#6b6f72]">Total c/IVA</div><b>{money(gross)}</b></div>
        <div><div className="text-xs text-[#6b6f72]">Venta neta</div><b>{money(net)}</b></div>
        <div><div className="text-xs text-[#6b6f72]">Margen estimado</div><b className={net - cost < 0 ? 'text-bad' : 'text-sage-dark'}>{money(net - cost)} ({pct(net ? (net - cost) / net : 0)})</b></div>
      </div>
      <div className="flex justify-end gap-2 mt-5"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={!valid} onClick={save}>Crear pedido</Btn></div>
    </Modal>
  )
}

function Detail({ order, onClose }: { order: Order; onClose: () => void }) {
  const { data, setOrderStatus, addPayment, add, del } = useStore()
  const o = data.orders.find(x => x.id === order.id) ?? order
  const t = orderTotals(o, data)
  const lines = data.order_items.filter(i => i.order_id === o.id)
  const [pay, setPay] = useState(Math.round(t.due * 100) / 100); const [acct, setAcct] = useState('banco')
  const customer = data.customers.find(c => c.id === o.customer_id)
  const payments = data.transactions.filter(x => x.order_id === o.id)
  const idx = FLOW.indexOf(o.status)
  const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null

  const toProduction = async () => {
    for (const l of lines) {
      const p = data.products.find(x => x.id === l.product_id); if (!p) continue
      const missing = Math.max(0, l.qty - Math.max(0, productStock(p.id, data)))
      if (!missing) continue
      const batches = missing / p.batch_units
      await add('production_jobs', { product_id: p.id, order_id: o.id, item_id: data.items.find(i => i.kind === 'filamento')?.id ?? null, units: missing, est_grams: Math.round(p.grams_per_batch * batches), est_minutes: Math.round(p.print_minutes_per_batch * batches), failed_units: 0, status: 'en_cola', scheduled_date: today() })
    }
    await setOrderStatus(o, 'produccion')
  }

  return (
    <Modal title={`Pedido #${o.number}`} onClose={onClose} wide>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge s={o.status} /><span className="text-sm">{customer?.name ?? 'Sin cliente'}</span>
        <span className="text-xs text-[#6b6f72]">· {o.channel} · {o.order_date}{o.due_date ? ` → entrega ${o.due_date}` : ''}</span>
      </div>
      <table className="bg-white rounded-lg">
        <thead><tr><th>Producto</th><th className="num">Cant.</th><th className="num">Precio</th><th className="num">Costo</th><th className="num">Total</th></tr></thead>
        <tbody>{lines.map(l => <tr key={l.id}><td>{l.description}</td><td className="num">{l.qty}</td><td className="num">{money(l.unit_price)}</td><td className="num">{money(l.unit_cost)}</td><td className="num">{money(l.qty * l.unit_price)}</td></tr>)}</tbody>
      </table>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
        <div><div className="text-xs text-[#6b6f72]">Total c/IVA</div><b>{money(t.gross)}</b></div>
        <div><div className="text-xs text-[#6b6f72]">Venta neta</div><b>{money(t.net)}</b></div>
        <div><div className="text-xs text-[#6b6f72]">Margen</div><b className={t.margin < 0 ? 'text-bad' : 'text-sage-dark'}>{money(t.margin)} ({pct(t.marginPct)})</b></div>
        <div><div className="text-xs text-[#6b6f72]">Saldo por cobrar</div><b className={t.due > 0 ? 'text-warn' : ''}>{money(t.due)}</b></div>
      </div>

      {payments.length > 0 && <div className="mt-4 text-sm"><div className="text-xs text-[#6b6f72] mb-1">Pagos</div>{payments.map(p => <div key={p.id} className="flex justify-between"><span>{p.tx_date} · {p.account}</span><span>{money(p.amount)}</span></div>)}</div>}

      {t.due > 0.5 && o.status !== 'cancelado' && o.status !== 'cotizacion' && (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <Field label="Registrar pago"><input type="number" value={pay} onChange={e => setPay(+e.target.value)} /></Field>
          <Field label="Cuenta"><select value={acct} onChange={e => setAcct(e.target.value)}><option>banco</option><option>efectivo</option><option>tarjeta</option></select></Field>
          <Btn onClick={() => addPayment(o, pay, acct)} disabled={pay <= 0}>Cobrar</Btn>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-sand">
        {o.status === 'confirmado' && <Btn onClick={toProduction}>Enviar a producción</Btn>}
        {next && !(o.status === 'confirmado') && <Btn onClick={() => setOrderStatus(o, next)}>Avanzar a: {STATUS_LABEL[next]}</Btn>}
        {o.status === 'cotizacion' && <Btn onClick={() => setOrderStatus(o, 'confirmado')}>Confirmar</Btn>}
        {o.status === 'confirmado' && <Btn variant="ghost" onClick={() => setOrderStatus(o, 'listo')}>Ya tengo stock → Listo</Btn>}
        {o.status !== 'cancelado' && o.status !== 'entregado' && <Btn variant="danger" onClick={() => setOrderStatus(o, 'cancelado')}>Cancelar pedido</Btn>}
        <Btn variant="danger" className="ml-auto" onClick={async () => { if (confirm('¿Eliminar definitivamente este pedido?')) { await del('orders', o.id); onClose() } }}>Eliminar</Btn>
      </div>
    </Modal>
  )
}

export default function Orders() {
  const { data } = useStore()
  const [filter, setFilter] = useState<string>('activos'); const [q, setQ] = useState('')
  const [open, setOpen] = useState<Order | null>(null); const [creating, setCreating] = useState(false)
  const rows = useMemo(() => data.orders.filter(o => {
    if (filter === 'activos' && !['cotizacion', 'confirmado', 'produccion', 'listo', 'enviado'].includes(o.status)) return false
    if (filter !== 'activos' && filter !== 'todos' && o.status !== filter) return false
    const name = data.customers.find(c => c.id === o.customer_id)?.name ?? ''
    return !q || `${o.number} ${name}`.toLowerCase().includes(q.toLowerCase())
  }).sort((a, b) => b.number - a.number), [data, filter, q])

  return (
    <div>
      <PageHeader title="Pedidos" sub="De la cotización a la entrega y el cobro" action={<Btn onClick={() => setCreating(true)}><Plus size={16} />Nuevo pedido</Btn>} />
      <div className="flex flex-wrap gap-2 mb-4">
        {['activos', ...FLOW, 'cancelado', 'todos'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-sm ${filter === f ? 'bg-graphite text-white' : 'bg-white border border-sand hover:bg-sand/50'}`}>{f === 'activos' ? 'Activos' : f === 'todos' ? 'Todos' : STATUS_LABEL[f]}</button>
        ))}
        <input className="!w-56 ml-auto" placeholder="Buscar # o cliente…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <Card className="overflow-x-auto !p-0">
        {rows.length === 0 ? <Empty>No hay pedidos en esta vista.</Empty> : (
          <table>
            <thead><tr><th>#</th><th>Cliente</th><th>Canal</th><th>Fecha</th><th>Entrega</th><th>Estado</th><th className="num">Total</th><th className="num">Margen</th><th className="num">Saldo</th></tr></thead>
            <tbody>
              {rows.map(o => {
                const t = orderTotals(o, data); const late = o.due_date && o.due_date < today() && ['confirmado', 'produccion', 'listo'].includes(o.status)
                return (
                  <tr key={o.id} className="cursor-pointer hover:bg-sand/30" onClick={() => setOpen(o)}>
                    <td className="font-medium">#{o.number}</td>
                    <td>{data.customers.find(c => c.id === o.customer_id)?.name ?? '—'}</td>
                    <td className="text-[#6b6f72]">{o.channel}</td>
                    <td>{o.order_date}</td>
                    <td className={late ? 'text-bad font-medium' : ''}>{o.due_date ?? '—'}</td>
                    <td><Badge s={o.status} /></td>
                    <td className="num">{money0(t.gross)}</td>
                    <td className={`num ${t.margin < 0 ? 'text-bad' : ''}`}>{pct(t.marginPct)}</td>
                    <td className={`num ${t.due > 0.5 && o.status !== 'cancelado' && o.status !== 'cotizacion' ? 'text-warn font-medium' : ''}`}>{o.status === 'cancelado' || o.status === 'cotizacion' ? '—' : money0(t.due)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
      {creating && <NewOrder onClose={() => setCreating(false)} />}
      {open && <Detail order={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
