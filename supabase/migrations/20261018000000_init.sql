-- Takto OS: schema inicial
create extension if not exists pgcrypto;

-- Parámetros del negocio (una sola fila)
create table settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default 'Takto',
  currency text not null default 'MXN',
  iva_rate numeric not null default 0.16,
  energy_cost_kwh numeric not null default 27,
  printer_watts numeric not null default 150,
  machine_cost_per_job numeric not null default 42.81,
  labor_rate_hour numeric not null default 0,
  filament_markup numeric not null default 0.30,
  waste_per_color numeric not null default 0.02,
  target_margin numeric not null default 0.50,
  monthly_revenue_goal numeric not null default 20000,
  monthly_fixed_costs numeric not null default 3000,
  opening_cash numeric not null default 0,
  updated_at timestamptz not null default now()
);
insert into settings default values;

-- Insumos: filamento, empaque, componentes
create table items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('filamento','empaque','componente','otro')),
  name text not null,
  color text,
  unit text not null default 'g',
  unit_cost numeric not null default 0,   -- costo por unidad (g, pza)
  reorder_point numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Productos terminados (catálogo con datos de costeo por lote)
create table products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  line text,                               -- FLOW, MORPH, ORBIT, CORE...
  name text not null,
  price numeric not null default 0,        -- precio de venta público (con IVA)
  batch_units int not null default 1,
  grams_per_batch numeric not null default 0,
  print_minutes_per_batch numeric not null default 0,
  colors int not null default 1,
  labor_minutes_per_batch numeric not null default 0,
  other_cost_per_batch numeric not null default 0,
  reorder_point numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text, phone text, city text, notes text,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  number serial,
  customer_id uuid references customers(id) on delete set null,
  channel text not null default 'directo',
  status text not null default 'cotizacion'
    check (status in ('cotizacion','confirmado','produccion','listo','enviado','entregado','cancelado')),
  order_date date not null default current_date,
  due_date date,
  discount numeric not null default 0,
  shipping_charged numeric not null default 0,
  shipping_cost numeric not null default 0,
  platform_fee numeric not null default 0,
  stock_deducted boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  description text not null,
  qty numeric not null default 1,
  unit_price numeric not null default 0,   -- con IVA
  unit_cost numeric not null default 0     -- costo sin IVA al momento de la venta
);

create table production_jobs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete restrict,
  order_id uuid references orders(id) on delete set null,
  item_id uuid references items(id) on delete set null,  -- filamento usado
  units int not null default 1,
  est_grams numeric not null default 0,
  actual_grams numeric,
  est_minutes numeric not null default 0,
  actual_minutes numeric,
  failed_units int not null default 0,
  status text not null default 'en_cola' check (status in ('en_cola','imprimiendo','terminado','cancelado')),
  scheduled_date date default current_date,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- Libro de movimientos de inventario (el stock = suma de movimientos)
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  qty numeric not null,
  reason text not null check (reason in ('compra','produccion','venta','merma','ajuste','devolucion')),
  ref text,
  move_date date not null default current_date,
  created_at timestamptz not null default now(),
  check ((item_id is null) <> (product_id is null))
);

-- Libro de ingresos y egresos (flujo de caja)
create table transactions (
  id uuid primary key default gen_random_uuid(),
  tx_date date not null default current_date,
  type text not null check (type in ('ingreso','egreso')),
  category text not null,
  amount numeric not null check (amount >= 0),     -- monto total pagado (con IVA)
  iva_included boolean not null default true,
  account text not null default 'efectivo',
  description text,
  order_id uuid references orders(id) on delete set null,
  created_at timestamptz not null default now()
);

create index on order_items(order_id);
create index on stock_movements(item_id);
create index on stock_movements(product_id);
create index on transactions(tx_date);
create index on orders(status);

-- Acceso: por ahora un solo usuario autenticado administra todo el negocio.
do $$ declare t text; begin
  foreach t in array array['settings','items','products','customers','orders','order_items',
                           'production_jobs','stock_movements','transactions'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "auth full access" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
