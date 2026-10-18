import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { costProduct, filamentPerGram, money, pct } from '../lib/calc'
import { Btn, Card, Empty, Field, Modal, PageHeader } from '../components/ui'
import type { Product } from '../lib/types'

const BLANK: Omit<Product, 'id'> = { sku: '', line: '', name: '', price: 0, batch_units: 1, grams_per_batch: 0, print_minutes_per_batch: 0, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true }
const TIERS = [0.1, 0.15, 0.25, 0.5, 0.75]

function Editor({ product, onClose }: { product?: Product; onClose: () => void }) {
  const { data, add, edit, del } = useStore()
  const s = data.settings; const gram = filamentPerGram(data.items)
  const [f, setF] = useState<Omit<Product, 'id'>>(product ?? BLANK)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(x => ({ ...x, [k]: v }))
  const c = costProduct({ id: '', ...f }, s, gram)
  const net = f.price / (1 + s.iva_rate)
  const margin = net > 0 ? (net - c.unitCost) / net : 0
  const suggestedNet = c.unitCost / (1 - s.target_margin)
  const rows: [string, number][] = [['Filamento (con merma)', c.filament], ['Energía', c.energy], ['Máquina / desgaste', c.machine], ['Mano de obra', c.labor], ['Otros (empaque, etc.)', c.other]]

  return (
    <Modal title={product ? `Editar ${product.name}` : 'Nuevo producto'} onClose={onClose} wide>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Nombre"><input value={f.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Línea"><input value={f.line ?? ''} onChange={e => set('line', e.target.value.toUpperCase())} placeholder="FLOW, MORPH…" /></Field>
        <Field label="SKU"><input value={f.sku ?? ''} onChange={e => set('sku', e.target.value)} /></Field>
        <Field label="Piezas por lote"><input type="number" min={1} value={f.batch_units} onChange={e => set('batch_units', +e.target.value)} /></Field>
        <Field label="Gramos por lote"><input type="number" value={f.grams_per_batch} onChange={e => set('grams_per_batch', +e.target.value)} /></Field>
        <Field label="Minutos de impresión por lote"><input type="number" value={f.print_minutes_per_batch} onChange={e => set('print_minutes_per_batch', +e.target.value)} /></Field>
        <Field label="Colores"><input type="number" min={1} value={f.colors} onChange={e => set('colors', +e.target.value)} /></Field>
        <Field label="Minutos de mano de obra / lote"><input type="number" value={f.labor_minutes_per_batch} onChange={e => set('labor_minutes_per_batch', +e.target.value)} /></Field>
        <Field label="Otros costos por lote"><input type="number" value={f.other_cost_per_batch} onChange={e => set('other_cost_per_batch', +e.target.value)} /></Field>
        <Field label="Precio de venta (c/IVA)"><input type="number" value={f.price} onChange={e => set('price', +e.target.value)} /></Field>
        <Field label="Punto de reorden (pzas)"><input type="number" value={f.reorder_point} onChange={e => set('reorder_point', +e.target.value)} /></Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-5">
        <div className="bg-white border border-sand rounded-lg p-4 text-sm">
          <div className="font-semibold mb-2">Costo del lote</div>
          {rows.map(([l, v]) => <div key={l} className="flex justify-between py-0.5"><span className="text-[#6b6f72]">{l}</span><span className="tabular-nums">{money(v)}</span></div>)}
          <div className="flex justify-between border-t border-sand mt-2 pt-2 font-medium"><span>Costo lote (sin IVA)</span><span>{money(c.batchCost)}</span></div>
          <div className="flex justify-between font-semibold"><span>Costo por pieza</span><span>{money(c.unitCost)}</span></div>
        </div>
        <div className="bg-white border border-sand rounded-lg p-4 text-sm">
          <div className="font-semibold mb-2">Rentabilidad</div>
          <div className="flex justify-between py-0.5"><span className="text-[#6b6f72]">Precio neto (sin IVA)</span><span>{money(net)}</span></div>
          <div className="flex justify-between py-0.5"><span className="text-[#6b6f72]">Utilidad por pieza</span><span className={net - c.unitCost < 0 ? 'text-bad' : ''}>{money(net - c.unitCost)}</span></div>
          <div className="flex justify-between py-0.5"><span className="text-[#6b6f72]">Margen</span><b className={margin < s.target_margin ? 'text-warn' : 'text-sage-dark'}>{pct(margin)}</b></div>
          <div className="flex justify-between py-0.5"><span className="text-[#6b6f72]">Precio sugerido p/ margen {pct(s.target_margin)}</span><b>{money(suggestedNet * (1 + s.iva_rate))}</b></div>
          <button className="text-xs underline mt-1" onClick={() => set('price', Math.ceil(suggestedNet * (1 + s.iva_rate)))}>Usar precio sugerido</button>
          <div className="border-t border-sand mt-3 pt-2 text-xs text-[#6b6f72]">
            Método de tu hoja de costeo (markup {pct(s.filament_markup)} al filamento + IVA): {money(c.sheetUnit)} por pieza. Escalones: {TIERS.map(t => `+${t * 100}% → ${money(c.sheetUnit * (1 + t))}`).join(' · ')}
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-5">
        {product ? <Btn variant="danger" onClick={async () => { if (confirm('¿Eliminar producto?')) { await del('products', product.id); onClose() } }}>Eliminar</Btn> : <span />}
        <div className="flex gap-2"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={!f.name} onClick={async () => { product ? await edit('products', product.id, f) : await add('products', f); onClose() }}>Guardar</Btn></div>
      </div>
    </Modal>
  )
}

export default function Products() {
  const { data } = useStore()
  const [ed, setEd] = useState<{ p?: Product } | null>(null)
  const gram = filamentPerGram(data.items)
  return (
    <div>
      <PageHeader title="Productos y costeo" sub={`Costo por pieza = filamento + energía + máquina + mano de obra. Filamento promedio: ${money(gram)}/g`} action={<Btn onClick={() => setEd({})}><Plus size={16} />Nuevo producto</Btn>} />
      <Card className="overflow-x-auto !p-0">
        {data.products.length === 0 ? <Empty>Sin productos. Importa tu catálogo desde Ajustes o crea uno nuevo.</Empty> : (
          <table>
            <thead><tr><th>Línea</th><th>Producto</th><th className="num">Lote</th><th className="num">Costo/pza</th><th className="num">Precio</th><th className="num">Precio neto</th><th className="num">Utilidad/pza</th><th className="num">Margen</th></tr></thead>
            <tbody>{data.products.map(p => {
              const c = costProduct(p, data.settings, gram); const net = p.price / (1 + data.settings.iva_rate); const m = net ? (net - c.unitCost) / net : 0
              return (
                <tr key={p.id} className="cursor-pointer hover:bg-sand/30" onClick={() => setEd({ p })}>
                  <td className="text-xs text-[#6b6f72]">{p.line}</td><td className="font-medium">{p.name}</td><td className="num">{p.batch_units}</td>
                  <td className="num">{money(c.unitCost)}</td><td className="num">{money(p.price)}</td><td className="num">{money(net)}</td>
                  <td className={`num ${net - c.unitCost < 0 ? 'text-bad' : ''}`}>{money(net - c.unitCost)}</td>
                  <td className={`num font-medium ${m < data.settings.target_margin ? 'text-warn' : 'text-sage-dark'}`}>{pct(m)}</td>
                </tr>
              )
            })}</tbody>
          </table>
        )}
      </Card>
      {ed && <Editor product={ed.p} onClose={() => setEd(null)} />}
    </div>
  )
}
