import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { inventoryValue, itemStock, money, money0, num, productStock, productUnitCost, today } from '../lib/calc'
import { Btn, Card, Empty, Field, Modal, PageHeader, Stat } from '../components/ui'
import type { Item, Product } from '../lib/types'

function ItemForm({ item, onClose }: { item?: Item; onClose: () => void }) {
  const { add, edit } = useStore()
  const [f, setF] = useState<Omit<Item, 'id'>>(item ?? { kind: 'filamento', name: '', color: '#9BAE9D', unit: 'g', unit_cost: 0.45, reorder_point: 0, active: true })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(x => ({ ...x, [k]: v }))
  return (
    <Modal title={item ? 'Editar insumo' : 'Nuevo insumo'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo"><select value={f.kind} onChange={e => { set('kind', e.target.value as Item['kind']); set('unit', e.target.value === 'filamento' ? 'g' : 'pza') }}><option value="filamento">Filamento</option><option value="empaque">Empaque</option><option value="componente">Componente</option><option value="otro">Otro</option></select></Field>
        <Field label="Nombre"><input value={f.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Unidad"><input value={f.unit} onChange={e => set('unit', e.target.value)} /></Field>
        <Field label={`Costo por ${f.unit} (sin IVA)`}><input type="number" step="0.01" value={f.unit_cost} onChange={e => set('unit_cost', +e.target.value)} /></Field>
        <Field label="Punto de reorden"><input type="number" value={f.reorder_point} onChange={e => set('reorder_point', +e.target.value)} /></Field>
        <Field label="Color"><input type="color" value={f.color ?? '#9BAE9D'} onChange={e => set('color', e.target.value)} /></Field>
      </div>
      <p className="text-xs text-[#6b6f72] mt-2">Un carrete de 1 kg a $450 equivale a $0.45 por gramo.</p>
      <div className="flex justify-end gap-2 mt-5"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={!f.name} onClick={async () => { item ? await edit('items', item.id, f) : await add('items', f); onClose() }}>Guardar</Btn></div>
    </Modal>
  )
}

function Purchase({ item, onClose }: { item: Item; onClose: () => void }) {
  const { purchase } = useStore()
  const [qty, setQty] = useState(item.unit === 'g' ? 1000 : 10); const [paid, setPaid] = useState(0); const [iva, setIva] = useState(true); const [date, setDate] = useState(today())
  return (
    <Modal title={`Compra de ${item.name}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Cantidad (${item.unit})`}><input type="number" value={qty} onChange={e => setQty(+e.target.value)} /></Field>
        <Field label="Total pagado"><input type="number" value={paid} onChange={e => setPaid(+e.target.value)} /></Field>
        <Field label="Fecha"><input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <label className="flex items-center gap-2 mt-6 !text-sm"><input type="checkbox" checked={iva} onChange={e => setIva(e.target.checked)} />El total incluye IVA</label>
      </div>
      <p className="text-sm text-[#6b6f72] mt-3">Registra la entrada al inventario, el egreso en finanzas y recalcula el costo promedio ponderado.</p>
      <div className="flex justify-end gap-2 mt-5"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={qty <= 0 || paid <= 0} onClick={async () => { await purchase(item, qty, paid, iva, date); onClose() }}>Registrar compra</Btn></div>
    </Modal>
  )
}

function Adjust({ target, onClose }: { target: { item?: Item; product?: Product }; onClose: () => void }) {
  const { adjustStock } = useStore()
  const [qty, setQty] = useState(0); const [reason, setReason] = useState<'ajuste' | 'merma'>('ajuste'); const [note, setNote] = useState('')
  return (
    <Modal title={`Ajustar ${target.item?.name ?? target.product?.name}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Motivo"><select value={reason} onChange={e => setReason(e.target.value as 'ajuste' | 'merma')}><option value="ajuste">Conteo / ajuste</option><option value="merma">Merma / falla / regalo</option></select></Field>
        <Field label="Cantidad (+ entra, − sale)"><input type="number" value={qty} onChange={e => setQty(+e.target.value)} /></Field>
      </div>
      <Field label="Nota" className="mt-3"><input value={note} onChange={e => setNote(e.target.value)} /></Field>
      <div className="flex justify-end gap-2 mt-5"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={!qty} onClick={async () => { await adjustStock(target, qty, reason, note); onClose() }}>Aplicar</Btn></div>
    </Modal>
  )
}

export default function Inventory() {
  const { data } = useStore()
  const [tab, setTab] = useState<'mat' | 'prod' | 'mov'>('mat')
  const [form, setForm] = useState<{ item?: Item } | null>(null); const [buy, setBuy] = useState<Item | null>(null)
  const [adj, setAdj] = useState<{ item?: Item; product?: Product } | null>(null)
  const v = inventoryValue(data)
  const tabs = [['mat', 'Materiales e insumos'], ['prod', 'Producto terminado'], ['mov', 'Movimientos']] as const
  const moves = [...data.stock_movements].sort((a, b) => b.move_date.localeCompare(a.move_date)).slice(0, 100)

  return (
    <div>
      <PageHeader title="Inventario" sub="Existencias valuadas a costo (promedio ponderado)" action={tab === 'mat' ? <Btn onClick={() => setForm({})}><Plus size={16} />Nuevo insumo</Btn> : undefined} />
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Valor total" value={money0(v.total)} /><Stat label="Materiales" value={money0(v.materials)} /><Stat label="Producto terminado" value={money0(v.finished)} />
      </div>
      <div className="flex gap-2 mb-4">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-full text-sm ${tab === k ? 'bg-graphite text-white' : 'bg-white border border-sand'}`}>{l}</button>)}</div>
      <Card className="overflow-x-auto !p-0">
        {tab === 'mat' && (data.items.length === 0 ? <Empty>Sin insumos. Agrega tus filamentos y empaques.</Empty> : (
          <table>
            <thead><tr><th>Insumo</th><th>Tipo</th><th className="num">Existencia</th><th className="num">Costo/u</th><th className="num">Valor</th><th>Estado</th><th></th></tr></thead>
            <tbody>{data.items.map(i => {
              const st = itemStock(i.id, data); const low = i.reorder_point > 0 && st <= i.reorder_point
              return (
                <tr key={i.id}>
                  <td className="font-medium"><span className="inline-block w-3 h-3 rounded-full border border-fog mr-2 align-middle" style={{ background: i.color ?? '#ccc' }} />{i.name}</td>
                  <td className="text-[#6b6f72]">{i.kind}</td><td className="num">{num(st)} {i.unit}</td><td className="num">{money(i.unit_cost)}</td><td className="num">{money0(Math.max(0, st) * i.unit_cost)}</td>
                  <td>{st < 0 ? <span className="text-bad text-xs font-medium">NEGATIVO</span> : low ? <span className="text-warn text-xs font-medium">Reordenar</span> : <span className="text-sage-dark text-xs">OK</span>}</td>
                  <td className="text-right whitespace-nowrap"><Btn variant="ghost" onClick={() => setBuy(i)}>Comprar</Btn> <Btn variant="ghost" onClick={() => setAdj({ item: i })}>Ajustar</Btn> <button className="text-xs underline ml-1" onClick={() => setForm({ item: i })}>editar</button></td>
                </tr>
              )
            })}</tbody>
          </table>
        ))}
        {tab === 'prod' && (data.products.length === 0 ? <Empty>Sin productos. Créalos en “Productos y costeo”.</Empty> : (
          <table>
            <thead><tr><th>Producto</th><th className="num">Existencia</th><th className="num">Costo/u</th><th className="num">Valor</th><th>Estado</th><th></th></tr></thead>
            <tbody>{data.products.map(p => {
              const st = productStock(p.id, data); const low = p.reorder_point > 0 && st <= p.reorder_point; const c = productUnitCost(p, data)
              return (
                <tr key={p.id}><td className="font-medium">{p.line ? <span className="text-xs text-[#6b6f72] mr-2">{p.line}</span> : null}{p.name}</td>
                  <td className="num">{st}</td><td className="num">{money(c)}</td><td className="num">{money0(Math.max(0, st) * c)}</td>
                  <td>{st < 0 ? <span className="text-bad text-xs font-medium">Sobrevendido</span> : low ? <span className="text-warn text-xs font-medium">Producir</span> : <span className="text-sage-dark text-xs">OK</span>}</td>
                  <td className="text-right"><Btn variant="ghost" onClick={() => setAdj({ product: p })}>Ajustar</Btn></td></tr>
              )
            })}</tbody>
          </table>
        ))}
        {tab === 'mov' && (moves.length === 0 ? <Empty>Sin movimientos.</Empty> : (
          <table>
            <thead><tr><th>Fecha</th><th>Artículo</th><th>Motivo</th><th>Ref.</th><th className="num">Cantidad</th></tr></thead>
            <tbody>{moves.map(m => (
              <tr key={m.id}><td>{m.move_date}</td><td>{data.items.find(i => i.id === m.item_id)?.name ?? data.products.find(p => p.id === m.product_id)?.name}</td><td>{m.reason}</td><td className="text-[#6b6f72]">{m.ref}</td><td className={`num ${m.qty < 0 ? 'text-bad' : 'text-sage-dark'}`}>{m.qty > 0 ? '+' : ''}{num(m.qty, 2)}</td></tr>
            ))}</tbody>
          </table>
        ))}
      </Card>
      {form && <ItemForm item={form.item} onClose={() => setForm(null)} />}
      {buy && <Purchase item={buy} onClose={() => setBuy(null)} />}
      {adj && <Adjust target={adj} onClose={() => setAdj(null)} />}
    </div>
  )
}
