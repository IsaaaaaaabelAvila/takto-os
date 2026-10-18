export interface Settings {
  id: number; business_name: string; currency: string; iva_rate: number
  energy_cost_kwh: number; printer_watts: number; machine_cost_per_job: number
  labor_rate_hour: number; filament_markup: number; waste_per_color: number
  target_margin: number; monthly_revenue_goal: number; monthly_fixed_costs: number; opening_cash: number
}
export interface Item { id: string; kind: 'filamento'|'empaque'|'componente'|'otro'; name: string; color?: string|null; unit: string; unit_cost: number; reorder_point: number; active: boolean }
export interface Product {
  id: string; sku?: string|null; line?: string|null; name: string; price: number; batch_units: number
  grams_per_batch: number; print_minutes_per_batch: number; colors: number
  labor_minutes_per_batch: number; other_cost_per_batch: number; reorder_point: number; active: boolean
}
export interface Customer { id: string; name: string; email?: string|null; phone?: string|null; city?: string|null; notes?: string|null; created_at?: string }
export type OrderStatus = 'cotizacion'|'confirmado'|'produccion'|'listo'|'enviado'|'entregado'|'cancelado'
export interface Order {
  id: string; number: number; customer_id?: string|null; channel: string; status: OrderStatus
  order_date: string; due_date?: string|null; discount: number; shipping_charged: number
  shipping_cost: number; platform_fee: number; stock_deducted: boolean; notes?: string|null
}
export interface OrderItem { id: string; order_id: string; product_id?: string|null; description: string; qty: number; unit_price: number; unit_cost: number }
export interface ProductionJob {
  id: string; product_id: string; order_id?: string|null; item_id?: string|null; units: number
  est_grams: number; actual_grams?: number|null; est_minutes: number; actual_minutes?: number|null
  failed_units: number; status: 'en_cola'|'imprimiendo'|'terminado'|'cancelado'
  scheduled_date?: string|null; completed_at?: string|null; notes?: string|null
}
export interface StockMovement { id: string; item_id?: string|null; product_id?: string|null; qty: number; reason: 'compra'|'produccion'|'venta'|'merma'|'ajuste'|'devolucion'; ref?: string|null; move_date: string }
export interface Transaction { id: string; tx_date: string; type: 'ingreso'|'egreso'; category: string; amount: number; iva_included: boolean; account: string; description?: string|null; order_id?: string|null }

export interface Data {
  settings: Settings; items: Item[]; products: Product[]; customers: Customer[]; orders: Order[]
  order_items: OrderItem[]; production_jobs: ProductionJob[]; stock_movements: StockMovement[]; transactions: Transaction[]
}
export type TableName = Exclude<keyof Data, 'settings'>
