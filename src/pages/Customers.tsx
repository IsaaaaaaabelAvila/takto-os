import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { isSale, money0, orderTotals, sum } from '../lib/calc'
import { Btn, Card, Empty, Field, Modal, PageHeader } from '../components/ui'
import type { Customer } from '../lib/types'

function Form({ c, onClose }: { c?: Customer; onClose: () => void }) {
  const { add, edit, del } = useStore()
  const [f, setF] = useState({ name: c?.name ?? '', email: c?.email ?? '', phone: c?.phone ?? '', city: c?.city ?? '', notes: c?.notes ?? '' })
  return (
    <Modal title={c ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre" className="col-span-2"><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Correo"><input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Teléfono"><input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Ciudad"><input value={f.city} onChange={e => setF({ ...f, city: e.target.value })} /></Field>
        <Field label="Notas" className="col-span-2"><textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>
      </div>
      <div className="flex justify-between mt-5">
        {c ? <Btn variant="danger" onClick={async () => { if (confirm('¿Eliminar cliente? Sus pedidos se conservan.')) { await del('customers', c.id); onClose() } }}>Eliminar</Btn> : <span />}
        <div className="flex gap-2"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={!f.name} onClick={async () => { c ? await edit('customers', c.id, f) : await add('customers', f); onClose() }}>Guardar</Btn></div>
      </div>
    </Modal>
  )
}

export default function Customers() {
  const { data } = useStore()
  const [ed, setEd] = useState<{ c?: Customer } | null>(null)
  const rows = data.customers.map(c => {
    const os = data.orders.filter(o => o.customer_id === c.id && isSale(o))
    const tots = os.map(o => orderTotals(o, data))
    return { c, n: os.length, total: sum(tots.map(t => t.gross)), profit: sum(tots.map(t => t.margin)), due: sum(tots.map(t => t.due)), last: os.map(o => o.order_date).sort().pop() ?? '' }
  }).sort((a, b) => b.total - a.total)
  return (
    <div>
      <PageHeader title="Clientes" sub="Quién te compra, cuánto y cuánto te deja" action={<Btn onClick={() => setEd({})}><Plus size={16} />Nuevo cliente</Btn>} />
      <Card className="overflow-x-auto !p-0">
        {rows.length === 0 ? <Empty>Sin clientes todavía.</Empty> : (
          <table>
            <thead><tr><th>Cliente</th><th>Ciudad</th><th className="num">Pedidos</th><th className="num">Comprado</th><th className="num">Utilidad</th><th className="num">Saldo</th><th>Última compra</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.c.id} className="cursor-pointer hover:bg-sand/30" onClick={() => setEd({ c: r.c })}>
                <td className="font-medium">{r.c.name}{r.n > 1 && <span className="ml-2 text-[10px] bg-sage/30 px-1.5 py-0.5 rounded-full">recurrente</span>}</td>
                <td className="text-[#6b6f72]">{r.c.city}</td><td className="num">{r.n}</td><td className="num">{money0(r.total)}</td><td className="num">{money0(r.profit)}</td>
                <td className={`num ${r.due > 0.5 ? 'text-warn font-medium' : ''}`}>{money0(r.due)}</td><td>{r.last}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
      {ed && <Form c={ed.c} onClose={() => setEd(null)} />}
    </div>
  )
}
