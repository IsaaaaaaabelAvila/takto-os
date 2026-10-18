import { useState } from 'react'
import { useStore } from '../lib/store'
import { seedCatalog } from '../lib/demo'
import { Btn, Card, Field, PageHeader } from '../components/ui'
import type { Settings } from '../lib/types'

const FIELDS: { k: keyof Settings; label: string; hint?: string; pct?: boolean }[] = [
  { k: 'iva_rate', label: 'IVA', hint: 'Tasa de IVA', pct: true },
  { k: 'energy_cost_kwh', label: 'Costo de energía por kWh', hint: 'Revisa tu recibo de luz' },
  { k: 'printer_watts', label: 'Consumo de la impresora (W)' },
  { k: 'machine_cost_per_job', label: 'Costo de máquina por trabajo', hint: 'Desgaste/depreciación + mantenimiento por trabajo (tu hoja usa $42.81)' },
  { k: 'labor_rate_hour', label: 'Tarifa de mano de obra por hora', hint: 'Cuánto vale tu hora. Si es 0, tu tiempo no se cuenta como costo.' },
  { k: 'waste_per_color', label: 'Merma por color', hint: 'Purga/soportes: 2% por color (como tu hoja)', pct: true },
  { k: 'filament_markup', label: 'Markup al filamento (método hoja)', pct: true },
  { k: 'target_margin', label: 'Margen objetivo', hint: 'Sobre venta neta', pct: true },
  { k: 'monthly_revenue_goal', label: 'Meta de ventas mensuales (neto)' },
  { k: 'monthly_fixed_costs', label: 'Gastos fijos mensuales', hint: 'Renta, software, marketing base… para el punto de equilibrio' },
  { k: 'opening_cash', label: 'Saldo inicial de caja/bancos', hint: 'Efectivo que tenías antes de usar el sistema' },
]

export default function SettingsPage() {
  const { data, setSettings, cloud, resetLocal, loadDemo, reload } = useStore()
  const [f, setF] = useState<Settings>(data.settings); const [saved, setSaved] = useState(false)
  const val = (k: keyof Settings, pct?: boolean) => pct ? +(Number(f[k]) * 100).toFixed(2) : Number(f[k])
  const set = (k: keyof Settings, v: number, pct?: boolean) => { setF({ ...f, [k]: pct ? v / 100 : v }); setSaved(false) }
  return (
    <div>
      <PageHeader title="Ajustes" sub="Parámetros que alimentan todo el costeo y los reportes" />
      <Card title="Parámetros del negocio">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FIELDS.map(x => <Field key={x.k} label={`${x.label}${x.pct ? ' (%)' : ''}`}><input type="number" step="0.01" value={val(x.k, x.pct)} onChange={e => set(x.k, +e.target.value, x.pct)} />{x.hint && <p className="text-[11px] text-[#6b6f72] mt-1">{x.hint}</p>}</Field>)}
        </div>
        <div className="mt-5 flex items-center gap-3"><Btn onClick={async () => { await setSettings(f); setSaved(true) }}>Guardar ajustes</Btn>{saved && <span className="text-sm text-sage-dark">Guardado ✓</span>}</div>
      </Card>
      <Card title="Datos" className="mt-4">
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={async () => { await seedCatalog(data); await reload() }}>Importar catálogo inicial (Infinite, Sphere, Gyro, Honeycomb) e insumos</Btn>
          {!cloud && <Btn variant="ghost" onClick={loadDemo}>Cargar datos de ejemplo</Btn>}
          {!cloud && <Btn variant="danger" onClick={() => confirm('Esto borra TODOS los datos locales de este navegador. ¿Continuar?') && resetLocal()}>Borrar datos locales</Btn>}
        </div>
        <p className="text-xs text-[#6b6f72] mt-3">{cloud ? 'Conectado a Supabase: los datos se guardan en la nube.' : 'Modo local: los datos viven en este navegador. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para guardarlos en la nube.'}</p>
      </Card>
    </div>
  )
}
