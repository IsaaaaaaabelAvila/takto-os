import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Data, Settings, TableName } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
export const isCloud = !!supabase

export const DEFAULT_SETTINGS: Settings = {
  id: 1, business_name: 'Takto', currency: 'MXN', iva_rate: 0.16, energy_cost_kwh: 27, printer_watts: 150,
  machine_cost_per_job: 42.81, labor_rate_hour: 0, filament_markup: 0.3, waste_per_color: 0.02,
  target_margin: 0.5, monthly_revenue_goal: 20000, monthly_fixed_costs: 3000, opening_cash: 0,
}

const TABLES: TableName[] = ['items','products','customers','orders','order_items','production_jobs','stock_movements','transactions','recurring_expenses']
const LS = 'takto-os:'
const uid = () => crypto.randomUUID()

function lsGet<T>(k: string, d: T): T { try { const v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : d } catch { return d } }
function lsSet(k: string, v: unknown) { try { localStorage.setItem(LS + k, JSON.stringify(v)) } catch { /* ignore */ } }

export async function loadAll(): Promise<Data> {
  if (supabase) {
    const out: Record<string, unknown> = {}
    const s = await supabase.from('settings').select('*').eq('id', 1).maybeSingle()
    out.settings = { ...DEFAULT_SETTINGS, ...(s.data ?? {}) }
    for (const t of TABLES) {
      const r = await supabase.from(t).select('*')
      if (r.error) throw r.error
      out[t] = r.data
    }
    return out as unknown as Data
  }
  const out: Record<string, unknown> = { settings: { ...DEFAULT_SETTINGS, ...lsGet('settings', {}) } }
  for (const t of TABLES) out[t] = lsGet(t, [])
  return out as unknown as Data
}

export async function insertRow<T extends object>(t: TableName, row: T): Promise<T & { id: string }> {
  if (supabase) {
    const r = await supabase.from(t).insert(row).select().single()
    if (r.error) throw r.error
    return r.data
  }
  const rows = lsGet<Record<string, unknown>[]>(t, [])
  const full: Record<string, unknown> = { id: uid(), ...row }
  if (t === 'orders') full.number = rows.reduce((m, o) => Math.max(m, Number(o.number) || 0), 0) + 1
  rows.push(full); lsSet(t, rows)
  return full as T & { id: string }
}
export async function updateRow(t: TableName, id: string, patch: object) {
  if (supabase) { const r = await supabase.from(t).update(patch).eq('id', id); if (r.error) throw r.error; return }
  lsSet(t, lsGet<{ id: string }[]>(t, []).map(x => x.id === id ? { ...x, ...patch } : x))
}
export async function removeRow(t: TableName, id: string) {
  if (supabase) { const r = await supabase.from(t).delete().eq('id', id); if (r.error) throw r.error; return }
  lsSet(t, lsGet<{ id: string }[]>(t, []).filter(x => x.id !== id))
  if (t === 'orders') lsSet('order_items', lsGet<{ order_id: string }[]>('order_items', []).filter(x => x.order_id !== id))
}
export async function saveSettings(patch: Partial<Settings>) {
  if (supabase) { const r = await supabase.from('settings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', 1); if (r.error) throw r.error; return }
  lsSet('settings', { ...lsGet('settings', {}), ...patch })
}
export function wipeLocal() { Object.keys(localStorage).filter(k => k.startsWith(LS)).forEach(k => localStorage.removeItem(k)) }
