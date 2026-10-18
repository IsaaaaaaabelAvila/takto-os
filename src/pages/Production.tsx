import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { num, pct, sum, today } from '../lib/calc'
import { Badge, Btn, Card, Empty, Field, Modal, PageHeader, Stat } from '../components/ui'
import type { ProductionJob } from '../lib/types'

const hm = (m: number) => `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`

function NewJob({ onClose }: { onClose: () => void }) {
  const { data, add } = useStore()
  const [pid, setPid] = useState(data.products[0]?.id ?? ''); const [units, setUnits] = useState(1)
  const [item, setItem] = useState(data.items.find(i => i.kind === 'filamento')?.id ?? ''); const [order, setOrder] = useState('')
  const p = data.products.find(x => x.id === pid)
  const batches = p ? units / p.batch_units : 0
  const grams = p ? Math.round(p.grams_per_batch * batches) : 0
  const mins = p ? Math.round(p.print_minutes_per_batch * batches) : 0
  return (
    <Modal title="Nuevo trabajo de impresión" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Producto"><select value={pid} onChange={e => setPid(e.target.value)}>{data.products.map(p => <option key={p.id} value={p.id}>{p.line ? `${p.line} · ` : ''}{p.name} (lote de {p.batch_units})</option>)}</select></Field>
        <Field label="Unidades a producir"><input type="number" min={1} value={units} onChange={e => setUnits(+e.target.value)} /></Field>
        <Field label="Filamento a usar"><select value={item} onChange={e => setItem(e.target.value)}><option value="">— sin descontar —</option>{data.items.filter(i => i.kind === 'filamento').map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
        <Field label="Pedido relacionado (opcional)"><select value={order} onChange={e => setOrder(e.target.value)}><option value="">—</option>{data.orders.filter(o => ['confirmado', 'produccion'].includes(o.status)).map(o => <option key={o.id} value={o.id}>#{o.number}</option>)}</select></Field>
        <p className="text-sm text-[#6b6f72]">Estimado: {num(grams)} g de filamento · {hm(mins)} de impresión ({num(batches, 2)} lotes)</p>
      </div>
      <div className="flex justify-end gap-2 mt-5"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn disabled={!p || units < 1} onClick={async () => { await add('production_jobs', { product_id: pid, order_id: order || null, item_id: item || null, units, est_grams: grams, est_minutes: mins, failed_units: 0, status: 'en_cola', scheduled_date: today() }); onClose() }}>Crear</Btn></div>
    </Modal>
  )
}

function Complete({ job, onClose }: { job: ProductionJob; onClose: () => void }) {
  const { completeJob } = useStore()
  const [g, setG] = useState(job.est_grams); const [m, setM] = useState(job.est_minutes); const [f, setF] = useState(0)
  return (
    <Modal title="Terminar trabajo" onClose={onClose}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Gramos reales"><input type="number" value={g} onChange={e => setG(+e.target.value)} /></Field>
        <Field label="Minutos reales"><input type="number" value={m} onChange={e => setM(+e.target.value)} /></Field>
        <Field label="Piezas falladas"><input type="number" min={0} max={job.units} value={f} onChange={e => setF(+e.target.value)} /></Field>
      </div>
      <p className="text-sm text-[#6b6f72] mt-3">Se sumarán {Math.max(0, job.units - f)} piezas al inventario terminado y se descontarán {num(g)} g del filamento.</p>
      <div className="flex justify-end gap-2 mt-5"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={async () => { await completeJob(job, g, m, f); onClose() }}>Terminar y actualizar inventario</Btn></div>
    </Modal>
  )
}

export default function Production() {
  const { data, edit, del } = useStore()
  const [creating, setCreating] = useState(false); const [done, setDone] = useState<ProductionJob | null>(null)
  const jobs = [...data.production_jobs].sort((a, b) => ({ imprimiendo: 0, en_cola: 1, terminado: 2, cancelado: 3 }[a.status] - { imprimiendo: 0, en_cola: 1, terminado: 2, cancelado: 3 }[b.status]))
  const finished = data.production_jobs.filter(j => j.status === 'terminado')
  const planned = sum(finished.map(j => j.est_grams)), actual = sum(finished.map(j => j.actual_grams ?? j.est_grams))
  const units = sum(finished.map(j => j.units)), failed = sum(finished.map(j => j.failed_units))
  const queueMin = sum(data.production_jobs.filter(j => j.status !== 'terminado' && j.status !== 'cancelado').map(j => j.est_minutes))

  return (
    <div>
      <PageHeader title="Producción" sub="Cola de impresión, consumo real de filamento y tasa de fallas" action={<Btn onClick={() => setCreating(true)} disabled={!data.products.length}><Plus size={16} />Nuevo trabajo</Btn>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Horas en cola" value={hm(queueMin)} sub="Impresión pendiente" />
        <Stat label="Trabajos terminados" value={finished.length} />
        <Stat label="Tasa de fallas" value={pct(units ? failed / units : 0)} tone={units && failed / units > 0.1 ? 'bad' : 'good'} sub={`${failed} de ${units} piezas`} />
        <Stat label="Desviación de filamento" value={planned ? `${actual >= planned ? '+' : ''}${pct((actual - planned) / planned)}` : '—'} sub="Real vs. estimado" hint="Si es alto, tu costeo subestima el material" />
      </div>
      <Card className="overflow-x-auto !p-0">
        {jobs.length === 0 ? <Empty>Sin trabajos. Crea uno o envía un pedido a producción.</Empty> : (
          <table>
            <thead><tr><th>Producto</th><th className="num">Unid.</th><th>Pedido</th><th className="num">Gramos (est/real)</th><th className="num">Tiempo (est/real)</th><th>Estado</th><th></th></tr></thead>
            <tbody>{jobs.map(j => {
              const p = data.products.find(x => x.id === j.product_id); const o = data.orders.find(x => x.id === j.order_id)
              return (
                <tr key={j.id}>
                  <td className="font-medium">{p?.name ?? '—'}</td><td className="num">{j.units}{j.failed_units ? <span className="text-bad"> (−{j.failed_units})</span> : null}</td>
                  <td>{o ? `#${o.number}` : '—'}</td>
                  <td className="num">{num(j.est_grams)} / {j.actual_grams != null ? num(j.actual_grams) : '—'}</td>
                  <td className="num">{hm(j.est_minutes)} / {j.actual_minutes != null ? hm(j.actual_minutes) : '—'}</td>
                  <td><Badge s={j.status} /></td>
                  <td className="whitespace-nowrap text-right">
                    {j.status === 'en_cola' && <Btn variant="ghost" onClick={() => edit('production_jobs', j.id, { status: 'imprimiendo' })}>Iniciar</Btn>}
                    {j.status === 'imprimiendo' && <Btn onClick={() => setDone(j)}>Terminar</Btn>}
                    {(j.status === 'en_cola' || j.status === 'terminado' || j.status === 'cancelado') && <button className="text-xs text-bad ml-2 underline" onClick={() => confirm('¿Eliminar trabajo? (no revierte inventario)') && del('production_jobs', j.id)}>borrar</button>}
                  </td>
                </tr>
              )
            })}</tbody>
          </table>
        )}
      </Card>
      {creating && <NewJob onClose={() => setCreating(false)} />}
      {done && <Complete job={done} onClose={() => setDone(null)} />}
    </div>
  )
}
