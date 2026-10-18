import { insertRow } from './db'
import { costProduct, filamentPerGram } from './calc'
import type { Data, Item, Product } from './types'

// Catálogo real de TAKTO_Productos.xlsx (minutos de impresión deducidos del costo por pieza de la hoja)
const CATALOG: Omit<Product, 'id'>[] = [
  { sku: 'FLOW-001', line: 'FLOW', name: 'Infinite', price: 0, batch_units: 8, grams_per_batch: 201.45, print_minutes_per_batch: 465, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'FLOW-002', line: 'FLOW', name: 'Low', price: 0, batch_units: 8, grams_per_batch: 150.08, print_minutes_per_batch: 376, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'FLOW-003', line: 'FLOW', name: 'Rounded', price: 0, batch_units: 8, grams_per_batch: 191.07, print_minutes_per_batch: 418, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'FLOW-004', line: 'FLOW', name: 'Prism', price: 0, batch_units: 8, grams_per_batch: 217.18, print_minutes_per_batch: 607, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'FLOW-005', line: 'FLOW', name: 'Mosaic', price: 0, batch_units: 8, grams_per_batch: 235.76, print_minutes_per_batch: 666, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'FLOW-006', line: 'FLOW', name: 'Hollow', price: 0, batch_units: 8, grams_per_batch: 180.51, print_minutes_per_batch: 594, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'FLOW-007', line: 'FLOW', name: 'Hex', price: 0, batch_units: 8, grams_per_batch: 202.08, print_minutes_per_batch: 538, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'FLOW-008', line: 'FLOW', name: 'Slate', price: 0, batch_units: 8, grams_per_batch: 81.99, print_minutes_per_batch: 242, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'MORPH-001', line: 'MORPH', name: 'Sphere', price: 0, batch_units: 6, grams_per_batch: 688.83, print_minutes_per_batch: 1924, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'MORPH-002', line: 'MORPH', name: 'Spike', price: 0, batch_units: 4, grams_per_batch: 613.11, print_minutes_per_batch: 2183, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'MORPH-003', line: 'MORPH', name: 'Bloom', price: 0, batch_units: 6, grams_per_batch: 693.64, print_minutes_per_batch: 2119, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'MORPH-004', line: 'MORPH', name: 'Pocket', price: 0, batch_units: 9, grams_per_batch: 268.2, print_minutes_per_batch: 856, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'MORPH-005', line: 'MORPH', name: 'Cascade', price: 0, batch_units: 4, grams_per_batch: 358.18, print_minutes_per_batch: 1203, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'MORPH-006', line: 'MORPH', name: 'Tower', price: 0, batch_units: 9, grams_per_batch: 745.52, print_minutes_per_batch: 2501, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'MORPH-007', line: 'MORPH', name: 'Ripple', price: 0, batch_units: 6, grams_per_batch: 536.88, print_minutes_per_batch: 1201, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'MORPH-008', line: 'MORPH', name: 'Spiral', price: 0, batch_units: 6, grams_per_batch: 493.16, print_minutes_per_batch: 1247, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'MORPH-009', line: 'MORPH', name: 'Flux', price: 0, batch_units: 6, grams_per_batch: 787.52, print_minutes_per_batch: 2310, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'ORBIT-001', line: 'ORBIT', name: 'Gyro', price: 0, batch_units: 12, grams_per_batch: 139.93, print_minutes_per_batch: 270, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'ORBIT-002', line: 'ORBIT', name: 'Arc', price: 0, batch_units: 9, grams_per_batch: 211.12, print_minutes_per_batch: 318, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'ORBIT-003', line: 'ORBIT', name: 'Gear', price: 0, batch_units: 9, grams_per_batch: 136.71, print_minutes_per_batch: 481, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'ORBIT-004', line: 'ORBIT', name: 'Planetary', price: 0, batch_units: 4, grams_per_batch: 112.54, print_minutes_per_batch: 330, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'ORBIT-005', line: 'ORBIT', name: 'Tracks', price: 0, batch_units: 10, grams_per_batch: 293.68, print_minutes_per_batch: 1105, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'ORBIT-006', line: 'ORBIT', name: 'Pivot', price: 0, batch_units: 16, grams_per_batch: 185.64, print_minutes_per_batch: 644, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'ORBIT-007', line: 'ORBIT', name: 'Ring', price: 0, batch_units: 21, grams_per_batch: 53.5, print_minutes_per_batch: 172, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'CORE-001', line: 'CORE', name: 'Honeycomb', price: 0, batch_units: 16, grams_per_batch: 567.75, print_minutes_per_batch: 1640, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'CORE-002', line: 'CORE', name: 'Hexa', price: 0, batch_units: 7, grams_per_batch: 481.59, print_minutes_per_batch: 1498, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'CORE-003', line: 'CORE', name: 'Grate', price: 0, batch_units: 49, grams_per_batch: 528.41, print_minutes_per_batch: 2112, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'CORE-004', line: 'CORE', name: 'Grid', price: 0, batch_units: 16, grams_per_batch: 488.48, print_minutes_per_batch: 2048, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'CORE-005', line: 'CORE', name: 'Matrix', price: 0, batch_units: 4, grams_per_batch: 496.35, print_minutes_per_batch: 2161, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
  { sku: 'CORE-006', line: 'CORE', name: 'Fabric', price: 0, batch_units: 1, grams_per_batch: 51, print_minutes_per_batch: 331, colors: 1, labor_minutes_per_batch: 0, other_cost_per_batch: 0, reorder_point: 0, active: true },
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
        return { product_id: p.id, description: p.name, qty: 1 + Math.floor(rnd() * 4), unit_price: p.price || Math.ceil(c.unitCost * 2 * (1 + d.settings.iva_rate)), unit_cost: Math.round(c.unitCost * 100) / 100 }
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
