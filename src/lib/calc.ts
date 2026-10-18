import type { Data, Item, Order, Product, Settings, Transaction } from './types'

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

// ---------- Categorías contables ----------
// grupo: ventas | otros_ing | inventario | opex | capex | impuestos | capital
export const CATEGORIES: { name: string; type: 'ingreso' | 'egreso'; group: string; iva: boolean }[] = [
  { name: 'Venta de producto', type: 'ingreso', group: 'ventas', iva: true },
  { name: 'Envío cobrado', type: 'ingreso', group: 'ventas', iva: true },
  { name: 'Otros ingresos', type: 'ingreso', group: 'otros_ing', iva: true },
  { name: 'Aportación de capital', type: 'ingreso', group: 'capital', iva: false },
  { name: 'Préstamo recibido', type: 'ingreso', group: 'capital', iva: false },
  { name: 'Filamento y materia prima', type: 'egreso', group: 'inventario', iva: true },
  { name: 'Empaque', type: 'egreso', group: 'inventario', iva: true },
  { name: 'Marketing y publicidad', type: 'egreso', group: 'opex', iva: true },
  { name: 'Software y suscripciones', type: 'egreso', group: 'opex', iva: true },
  { name: 'Renta y servicios', type: 'egreso', group: 'opex', iva: true },
  { name: 'Mantenimiento y refacciones', type: 'egreso', group: 'opex', iva: true },
  { name: 'Honorarios y sueldos', type: 'egreso', group: 'opex', iva: false },
  { name: 'Envíos y paquetería', type: 'egreso', group: 'opex', iva: true },
  { name: 'Comisiones y bancos', type: 'egreso', group: 'opex', iva: true },
  { name: 'Otros gastos', type: 'egreso', group: 'opex', iva: true },
  { name: 'Equipo y maquinaria', type: 'egreso', group: 'capex', iva: true },
  { name: 'Impuestos (SAT)', type: 'egreso', group: 'impuestos', iva: false },
  { name: 'Retiro del dueño', type: 'egreso', group: 'capital', iva: false },
  { name: 'Pago de préstamo', type: 'egreso', group: 'capital', iva: false },
]
export const groupOf = (cat: string) => CATEGORIES.find(c => c.name === cat)?.group ?? 'opex'

// ---------- Costeo (replica y extiende la hoja TAKTO_COSTEO) ----------
export interface CostBreakdown {
  filament: number; energy: number; machine: number; labor: number; other: number
  batchCost: number; unitCost: number; unitCostIva: number
  sheetBatch: number; sheetUnit: number // método hoja de costeo (markup al filamento, con IVA)
}
export function filamentPerGram(items: Item[]) {
  const f = items.filter(i => i.kind === 'filamento' && i.active && i.unit_cost > 0)
  return f.length ? sum(f.map(i => i.unit_cost)) / f.length : 0.45
}
export function costProduct(p: Product, s: Settings, gramPrice: number): CostBreakdown {
  const waste = 1 + s.waste_per_color * Math.max(1, p.colors)
  const raw = p.grams_per_batch * gramPrice
  const filament = raw * waste
  const hours = p.print_minutes_per_batch / 60
  const energy = (s.printer_watts / 1000) * hours * s.energy_cost_kwh
  const machine = s.machine_cost_per_job
  const labor = (p.labor_minutes_per_batch / 60) * s.labor_rate_hour
  const other = p.other_cost_per_batch
  const batchCost = filament + energy + machine + labor + other
  const units = Math.max(1, p.batch_units)
  const sheetBatch = (raw * (1 + s.filament_markup) * waste + energy + machine + labor + other) * (1 + s.iva_rate)
  return { filament, energy, machine, labor, other, batchCost, unitCost: batchCost / units, unitCostIva: (batchCost / units) * (1 + s.iva_rate), sheetBatch, sheetUnit: sheetBatch / units }
}

// ---------- Pedidos ----------
export interface OrderTotals { gross: number; net: number; iva: number; cogs: number; variable: number; margin: number; marginPct: number; paid: number; due: number }
export function orderTotals(o: Order, d: Data): OrderTotals {
  const lines = d.order_items.filter(i => i.order_id === o.id)
  const gross = Math.max(0, sum(lines.map(l => l.qty * l.unit_price)) - o.discount + o.shipping_charged)
  const net = gross / (1 + d.settings.iva_rate)
  const cogs = sum(lines.map(l => l.qty * l.unit_cost))
  const variable = cogs + o.shipping_cost + o.platform_fee
  const paid = sum(d.transactions.filter(t => t.order_id === o.id && t.type === 'ingreso').map(t => t.amount))
  const margin = net - variable
  return { gross, net, iva: gross - net, cogs, variable, margin, marginPct: net > 0 ? margin / net : 0, paid, due: Math.max(0, gross - paid) }
}
export const isSale = (o: Order) => o.status !== 'cotizacion' && o.status !== 'cancelado'

// ---------- Inventario ----------
export function itemStock(id: string, d: Data) { return sum(d.stock_movements.filter(m => m.item_id === id).map(m => m.qty)) }
export function productStock(id: string, d: Data) { return sum(d.stock_movements.filter(m => m.product_id === id).map(m => m.qty)) }
export function productUnitCost(p: Product, d: Data) { return costProduct(p, d.settings, filamentPerGram(d.items)).unitCost }
export function inventoryValue(d: Data) {
  const materials = sum(d.items.map(i => Math.max(0, itemStock(i.id, d)) * i.unit_cost))
  const finished = sum(d.products.map(p => Math.max(0, productStock(p.id, d)) * productUnitCost(p, d)))
  return { materials, finished, total: materials + finished }
}

// ---------- Estado de resultados / flujo ----------
export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
export function lastMonths(n: number, from = new Date()) {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(monthKey(new Date(from.getFullYear(), from.getMonth() - i, 1)))
  return out
}
export const monthLabel = (k: string) => new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
export const monthRange = (k: string) => [`${k}-01`, `${k}-31`] as const

const txNet = (t: Transaction, s: Settings) => t.iva_included ? t.amount / (1 + s.iva_rate) : t.amount
const txIva = (t: Transaction, s: Settings) => t.iva_included ? t.amount - t.amount / (1 + s.iva_rate) : 0

export interface PnL {
  revenue: number; cogs: number; shipping: number; fees: number; grossProfit: number; grossPct: number
  opexByCat: Record<string, number>; opex: number; otherIncome: number
  profit: number; netPct: number; orders: number; units: number; aov: number
}
export function pnl(d: Data, from: string, to: string): PnL {
  const s = d.settings
  const orders = d.orders.filter(o => isSale(o) && o.order_date >= from && o.order_date <= to)
  const tots = orders.map(o => orderTotals(o, d))
  const revenue = sum(tots.map(t => t.net))
  const cogs = sum(tots.map(t => t.cogs))
  const shipping = sum(orders.map(o => o.shipping_cost))
  const fees = sum(orders.map(o => o.platform_fee))
  const opexByCat: Record<string, number> = {}
  let otherIncome = 0
  for (const t of d.transactions) {
    if (t.tx_date < from || t.tx_date > to) continue
    const g = groupOf(t.category)
    if (t.type === 'egreso' && g === 'opex') opexByCat[t.category] = (opexByCat[t.category] ?? 0) + txNet(t, s)
    if (t.type === 'ingreso' && g === 'otros_ing') otherIncome += txNet(t, s)
  }
  const opex = sum(Object.values(opexByCat))
  const grossProfit = revenue - cogs - shipping - fees
  const profit = grossProfit - opex + otherIncome
  const units = sum(orders.flatMap(o => d.order_items.filter(i => i.order_id === o.id).map(i => i.qty)))
  return { revenue, cogs, shipping, fees, grossProfit, grossPct: revenue > 0 ? grossProfit / revenue : 0, opexByCat, opex, otherIncome, profit, netPct: revenue > 0 ? profit / revenue : 0, orders: orders.length, units, aov: orders.length ? sum(tots.map(t => t.gross)) / orders.length : 0 }
}

export function cashFlow(d: Data, from: string, to: string) {
  const tx = d.transactions.filter(t => t.tx_date >= from && t.tx_date <= to)
  const g = (type: string, grp: string) => sum(tx.filter(t => t.type === type && groupOf(t.category) === grp).map(t => t.amount))
  const inflow = sum(tx.filter(t => t.type === 'ingreso').map(t => t.amount))
  const outflow = sum(tx.filter(t => t.type === 'egreso').map(t => t.amount))
  return {
    inflow, outflow, net: inflow - outflow,
    operating: g('ingreso', 'ventas') + g('ingreso', 'otros_ing') - g('egreso', 'opex') - g('egreso', 'inventario') - g('egreso', 'impuestos'),
    investing: -g('egreso', 'capex'),
    financing: g('ingreso', 'capital') - g('egreso', 'capital'),
  }
}
export function cashBalance(d: Data, upTo = '9999-12-31') {
  return d.settings.opening_cash + sum(d.transactions.filter(t => t.tx_date <= upTo).map(t => t.type === 'ingreso' ? t.amount : -t.amount))
}
export function ivaBalance(d: Data, from: string, to: string) {
  const s = d.settings
  const tx = d.transactions.filter(t => t.tx_date >= from && t.tx_date <= to)
  const charged = sum(tx.filter(t => t.type === 'ingreso' && groupOf(t.category) === 'ventas').map(t => txIva(t, s)))
  const creditable = sum(tx.filter(t => t.type === 'egreso').map(t => txIva(t, s)))
  return { charged, creditable, payable: charged - creditable }
}
export function receivables(d: Data) {
  return d.orders.filter(isSale).map(o => ({ o, t: orderTotals(o, d) })).filter(x => x.t.due > 0.5)
}
// Punto de equilibrio mensual con el margen de contribución de los últimos 90 días
export function breakEven(d: Data) {
  const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 90)
  const iso = (x: Date) => x.toISOString().slice(0, 10)
  const p = pnl(d, iso(start), iso(end))
  const cm = p.revenue > 0 ? p.grossProfit / p.revenue : d.settings.target_margin
  return { contributionPct: cm, revenue: cm > 0 ? d.settings.monthly_fixed_costs / cm : 0 }
}
export function productPerformance(d: Data, from: string, to: string) {
  const orders = d.orders.filter(o => isSale(o) && o.order_date >= from && o.order_date <= to)
  const map = new Map<string, { name: string; qty: number; revenue: number; cost: number }>()
  for (const o of orders) for (const l of d.order_items.filter(i => i.order_id === o.id)) {
    const key = l.product_id ?? l.description
    const row = map.get(key) ?? { name: d.products.find(p => p.id === l.product_id)?.name ?? l.description, qty: 0, revenue: 0, cost: 0 }
    row.qty += l.qty; row.revenue += l.qty * l.unit_price / (1 + d.settings.iva_rate); row.cost += l.qty * l.unit_cost
    map.set(key, row)
  }
  return [...map.values()].map(r => ({ ...r, profit: r.revenue - r.cost, pct: r.revenue ? (r.revenue - r.cost) / r.revenue : 0 })).sort((a, b) => b.profit - a.profit)
}

// ---------- Formato ----------
export const money = (n: number, cur = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n || 0)
export const money0 = (n: number, cur = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n || 0)
export const pct = (n: number) => `${((n || 0) * 100).toFixed(1)}%`
export const num = (n: number, dec = 0) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: dec }).format(n || 0)
export const today = () => new Date().toISOString().slice(0, 10)
