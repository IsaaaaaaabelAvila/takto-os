import { insertRow } from './db'
import { costProduct, filamentPerGram } from './calc'
import type { Data, Item, Product } from './types'

// Catálogo real tomado de TAKTO_COSTEO_INVENTARIO.xlsx (gramos y tiempos por lote)
const CATALOG: Omit<Product, 'id'>[] = [
  { sku: 'FLOW-INF', line: 'FLOW', name: 'Infinite', price: 129, batch_units: 1, grams_per_batch: 25.24, print_minutes_per_batch: 67, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 3, active: true },
  { sku: 'MORPH-SPH', line: 'MORPH', name: 'Sphere', price: 199, batch_units: 6, grams_per_batch: 688.83, print_minutes_per_batch: 1924, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 3, active: true },
  { sku: 'ORBIT-GYR', line: 'ORBIT', name: 'Gyro', price: 29, batch_units: 12, grams_per_batch: 139.93, print_minutes_per_batch: 270, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 6, active: true },
  { sku: 'CORE-HON', line: 'CORE', name: 'Honeycomb', price: 79, batch_units: 16, grams_per_batch: 567.75, print_minutes_per_batch: 1640, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 4, active: true },
]
const MATERIALS: Omit<Item, 'id'>[] = [
  { kind: 'filamento', name: 'PLA Sage', color: '#9BAE9D', unit: 'g', unit_cost: 0.45, reorder_point: 1000, active: true },
  { kind: 'filamento', name: 'PLA Blanco', color: '#F8F7F3', unit: 'g', unit_cost: 0.45, reorder_point: 1000, active: true },
  { kind: 'filamento', name: 'PLA Negro', color: '#2B2B2B', unit: 'g', unit_cost: 0.45, reorder_point: 1000, active: true },
  { kind: 'empaque', name: 'Caja Takto chica', color: null, unit: 'pza', unit_cost: 9.5, reorder_point: 20, active: true },
  { kind: 'empaque', name: 'Bolsa de tela', color: null, unit: 'pza', unit_cost: 4, reorder_point: 20, active: true },
]

export async function seedCatalog(data: Data) {
  if (!data.products.length) for (const p of CATALOG) await insertRow('products', p)
  if (!data.items.length) for (const m of MATERIALS) await insertRow('items', m)
}

let seed = 7
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]
const iso = (d: Date) => d.toISOString().slice(0, 10)

export async function seedDemo(data: Data) {
  await seedCatalog(data)
  const products: Product[] = data.products.length ? data.products : []
  // vuelve a leer lo que acabamos de insertar
  const { loadAll } = await import('./db')
  const d = await loadAll()
  const prods = d.products.length ? d.products : products
  const items = d.items
  const gram = filamentPerGram(items)
  const fil = items.filter(i => i.kind === 'filamento')

  const names = ['Valeria Ortiz', 'Café Raíz', 'Mariana Soto', 'Estudio Brújula', 'Daniel Pérez', 'Lucía Ramos', 'Oficina Nube', 'Andrés Cruz']
  const customers = []
  for (const n of names) customers.push(await insertRow('customers', { name: n, city: pick(['CDMX', 'Guadalajara', 'Monterrey', 'Puebla']) }))

  // compras iniciales de inventario
  const start = new Date(); start.setMonth(start.getMonth() - 5); start.setDate(3)
  await insertRow('transactions', { tx_date: iso(start), type: 'ingreso', category: 'Aportación de capital', amount: 30000, iva_included: false, account: 'banco', description: 'Capital inicial' })
  await insertRow('transactions', { tx_date: iso(start), type: 'egreso', category: 'Equipo y maquinaria', amount: 15625, iva_included: true, account: 'banco', description: 'Impresora 3D' })
  for (const f of fil) {
    await insertRow('stock_movements', { item_id: f.id, qty: 3000, reason: 'compra', ref: 'Inventario inicial', move_date: iso(start) })
    await insertRow('transactions', { tx_date: iso(start), type: 'egreso', category: 'Filamento y materia prima', amount: 1350 * 1.16, iva_included: true, account: 'banco', description: `Compra ${f.name}` })
  }
  for (const f of items.filter(i => i.kind === 'empaque')) await insertRow('stock_movements', { item_id: f.id, qty: 100, reason: 'compra', ref: 'Inventario inicial', move_date: iso(start) })

  const channels = ['directo', 'directo', 'instagram', 'mercado_libre', 'evento']
  const now = new Date()
  let n = 0
  for (let m = 5; m >= 0; m--) {
    const base = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const count = 5 + Math.round(m === 0 ? 3 : (5 - m) * 1.4 + rnd() * 3)
    for (let k = 0; k < count; k++) {
      const day = Math.min(28, 1 + Math.floor(rnd() * 27))
      const date = new Date(base.getFullYear(), base.getMonth(), day)
      if (date > now) continue
      const lines = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => {
        const p = pick(prods)
        const c = costProduct(p, d.settings, gram)
        return { product_id: p.id, description: p.name, qty: 1 + Math.floor(rnd() * 4), unit_price: p.price, unit_cost: Math.round(c.unitCost * 100) / 100 }
      })
      const status = (now.getTime() - date.getTime()) / 864e5 > 12 ? 'entregado' : pick(['confirmado', 'produccion', 'listo', 'enviado', 'entregado'])
      const channel = pick(channels)
      const gross = lines.reduce((a, l) => a + l.qty * l.unit_price, 0)
      const orderId = await insertRow('orders', {
        number: ++n, customer_id: pick(customers).id, channel, status, order_date: iso(date), due_date: iso(new Date(date.getTime() + 7 * 864e5)),
        discount: rnd() < 0.15 ? 20 : 0, shipping_charged: 60, shipping_cost: 55, platform_fee: channel === 'mercado_libre' ? Math.round(gross * 0.13) : 0, stock_deducted: status === 'enviado' || status === 'entregado',
      })
      for (const l of lines) await insertRow('order_items', { ...l, order_id: orderId.id })
      const total = gross + 60 - (rnd() < 0.15 ? 20 : 0)
      const paidFull = status === 'entregado' || status === 'enviado' ? rnd() < 0.9 : false
      const paid = paidFull ? total : status === 'cotizacion' ? 0 : Math.round(total * 0.5)
      if (paid > 0) await insertRow('transactions', { tx_date: iso(date), type: 'ingreso', category: 'Venta de producto', amount: paid, iva_included: true, account: pick(['banco', 'efectivo', 'tarjeta']), description: `Pago pedido #${n}`, order_id: orderId.id })
    }
    // gastos operativos mensuales
    const md = (day: number) => iso(new Date(base.getFullYear(), base.getMonth(), day))
    if (new Date(md(5)) <= now) {
      await insertRow('transactions', { tx_date: md(5), type: 'egreso', category: 'Marketing y publicidad', amount: 600 + Math.round(rnd() * 600), iva_included: true, account: 'tarjeta', description: 'Meta Ads' })
      await insertRow('transactions', { tx_date: md(8), type: 'egreso', category: 'Software y suscripciones', amount: 450, iva_included: true, account: 'tarjeta', description: 'Shopify + dominio' })
      await insertRow('transactions', { tx_date: md(10), type: 'egreso', category: 'Renta y servicios', amount: 900, iva_included: true, account: 'banco', description: 'Luz y espacio' })
    }
    if (m % 2 === 0 && new Date(md(12)) <= now) await insertRow('transactions', { tx_date: md(12), type: 'egreso', category: 'Filamento y materia prima', amount: 2700 * 1.16, iva_included: true, account: 'banco', description: 'Reposición de filamento' })
  }
  // un par de trabajos de producción
  const p0 = prods[0]
  await insertRow('production_jobs', { product_id: p0.id, item_id: fil[0]?.id ?? null, units: 10, est_grams: 252, est_minutes: 670, failed_units: 0, status: 'imprimiendo', scheduled_date: iso(now) })
  await insertRow('production_jobs', { product_id: prods[2].id, item_id: fil[1]?.id ?? null, units: 12, est_grams: 140, est_minutes: 270, failed_units: 0, status: 'en_cola', scheduled_date: iso(now) })
  // inventario de producto terminado
  for (const p of prods) await insertRow('stock_movements', { product_id: p.id, qty: 8 + Math.floor(rnd() * 20), reason: 'produccion', ref: 'Inventario inicial', move_date: iso(start) })
}
