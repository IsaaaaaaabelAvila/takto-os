import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, insertRow, loadAll, removeRow, saveSettings, supabase, updateRow, wipeLocal, isCloud } from './db'
import { costProduct, filamentPerGram, orderTotals, productUnitCost, sum, today } from './calc'
import type { Data, Item, Order, OrderItem, OrderStatus, Product, ProductionJob, Settings, TableName, Transaction } from './types'

const EMPTY: Data = { settings: DEFAULT_SETTINGS, items: [], products: [], customers: [], orders: [], order_items: [], production_jobs: [], stock_movements: [], transactions: [] }

interface Ctx {
  data: Data; loading: boolean; error: string | null; cloud: boolean
  reload: () => Promise<void>
  add: <T extends object>(t: TableName, row: T) => Promise<T & { id: string }>
  edit: (t: TableName, id: string, patch: object) => Promise<void>
  del: (t: TableName, id: string) => Promise<void>
  setSettings: (p: Partial<Settings>) => Promise<void>
  createOrder: (o: Partial<Order>, lines: Omit<OrderItem, 'id' | 'order_id'>[], deposit?: number) => Promise<string>
  setOrderStatus: (o: Order, s: OrderStatus) => Promise<void>
  addPayment: (o: Order, amount: number, account: string, date?: string) => Promise<void>
  completeJob: (j: ProductionJob, actualGrams: number, actualMinutes: number, failed: number) => Promise<void>
  purchase: (item: Item, qty: number, totalPaid: number, ivaIncluded: boolean, date?: string) => Promise<void>
  adjustStock: (target: { item?: Item; product?: Product }, qty: number, reason: 'ajuste' | 'merma', note?: string) => Promise<void>
  loadDemo: () => Promise<void>
  resetLocal: () => Promise<void>
  session: boolean; signOut: () => Promise<void>
}
const C = createContext<Ctx>(null as never)
export const useStore = () => useContext(C)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState(!isCloud)

  const reload = useCallback(async () => {
    try { setData(await loadAll()); setError(null) } catch (e) { setError((e as Error).message) } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!supabase) { void reload(); return }
    void supabase.auth.getSession().then(({ data: s }) => { setSession(!!s.session); if (s.session) void reload(); else setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(!!s); if (s) void reload() })
    return () => sub.subscription.unsubscribe()
  }, [reload])

  const add: Ctx['add'] = async (t, row) => { const r = await insertRow(t, row); await reload(); return r }
  const edit: Ctx['edit'] = async (t, id, p) => { await updateRow(t, id, p); await reload() }
  const del: Ctx['del'] = async (t, id) => { await removeRow(t, id); await reload() }
  const setSettings: Ctx['setSettings'] = async p => { await saveSettings(p); await reload() }

  const createOrder: Ctx['createOrder'] = async (o, lines, deposit = 0) => {
    const order = await insertRow('orders', { channel: 'directo', status: 'confirmado', order_date: today(), discount: 0, shipping_charged: 0, shipping_cost: 0, platform_fee: 0, stock_deducted: false, ...o })
    for (const l of lines) await insertRow('order_items', { ...l, order_id: order.id })
    if (deposit > 0) await insertRow('transactions', { tx_date: today(), type: 'ingreso', category: 'Venta de producto', amount: deposit, iva_included: true, account: 'efectivo', description: `Anticipo pedido`, order_id: order.id })
    await reload()
    return order.id
  }

  const setOrderStatus: Ctx['setOrderStatus'] = async (o, s) => {
    const lines = data.order_items.filter(i => i.order_id === o.id && i.product_id)
    let deducted = o.stock_deducted
    if ((s === 'enviado' || s === 'entregado') && !deducted) {
      for (const l of lines) await insertRow('stock_movements', { product_id: l.product_id, qty: -l.qty, reason: 'venta', ref: `Pedido #${o.number}`, move_date: today() })
      deducted = true
    } else if ((s === 'cancelado' || s === 'cotizacion') && deducted) {
      for (const l of lines) await insertRow('stock_movements', { product_id: l.product_id, qty: l.qty, reason: 'devolucion', ref: `Pedido #${o.number} cancelado`, move_date: today() })
      deducted = false
    }
    await updateRow('orders', o.id, { status: s, stock_deducted: deducted })
    await reload()
  }

  const addPayment: Ctx['addPayment'] = async (o, amount, account, date) => {
    await insertRow('transactions', { tx_date: date ?? today(), type: 'ingreso', category: 'Venta de producto', amount, iva_included: true, account, description: `Pago pedido #${o.number}`, order_id: o.id })
    await reload()
  }

  const completeJob: Ctx['completeJob'] = async (j, grams, minutes, failed) => {
    if (j.item_id && grams > 0) await insertRow('stock_movements', { item_id: j.item_id, qty: -grams, reason: 'produccion', ref: `Trabajo ${j.id.slice(0, 6)}`, move_date: today() })
    const good = Math.max(0, j.units - failed)
    if (good > 0) await insertRow('stock_movements', { product_id: j.product_id, qty: good, reason: 'produccion', ref: `Trabajo ${j.id.slice(0, 6)}`, move_date: today() })
    await updateRow('production_jobs', j.id, { status: 'terminado', actual_grams: grams, actual_minutes: minutes, failed_units: failed, completed_at: new Date().toISOString() })
    await reload()
  }

  const purchase: Ctx['purchase'] = async (item, qty, totalPaid, ivaIncluded, date) => {
    const net = ivaIncluded ? totalPaid / (1 + data.settings.iva_rate) : totalPaid
    const stock = sum(data.stock_movements.filter(m => m.item_id === item.id).map(m => m.qty))
    const onHand = Math.max(0, stock)
    const newCost = qty > 0 ? (onHand * item.unit_cost + net) / (onHand + qty) : item.unit_cost // costo promedio ponderado
    await insertRow('stock_movements', { item_id: item.id, qty, reason: 'compra', ref: 'Compra', move_date: date ?? today() })
    await updateRow('items', item.id, { unit_cost: Math.round(newCost * 10000) / 10000 })
    await insertRow('transactions', { tx_date: date ?? today(), type: 'egreso', category: item.kind === 'empaque' ? 'Empaque' : 'Filamento y materia prima', amount: totalPaid, iva_included: ivaIncluded, account: 'efectivo', description: `Compra ${item.name}` })
    await reload()
  }

  const adjustStock: Ctx['adjustStock'] = async (t, qty, reason, note) => {
    await insertRow('stock_movements', { item_id: t.item?.id ?? null, product_id: t.product?.id ?? null, qty, reason, ref: note ?? null, move_date: today() })
    await reload()
  }

  const loadDemo = async () => { const { seedDemo } = await import('./demo'); await seedDemo(data); await reload() }
  const resetLocal = async () => { wipeLocal(); await reload() }
  const signOut = async () => { await supabase?.auth.signOut(); setSession(false) }

  return <C.Provider value={{ data, loading, error, cloud: isCloud, reload, add, edit, del, setSettings, createOrder, setOrderStatus, addPayment, completeJob, purchase, adjustStock, loadDemo, resetLocal, session, signOut }}>{children}</C.Provider>
}

export { orderTotals, costProduct, filamentPerGram, productUnitCost }
export type { Transaction }
