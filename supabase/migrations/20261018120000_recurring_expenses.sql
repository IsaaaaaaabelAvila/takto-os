create table recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Renta y servicios',
  amount numeric not null check (amount >= 0),
  iva_included boolean not null default false,
  account text not null default 'banco',
  day_of_month int not null default 1 check (day_of_month between 1 and 28),
  start_month text not null,
  last_generated text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table recurring_expenses enable row level security;
create policy "owner full access" on recurring_expenses for all to authenticated
  using ((select auth.jwt() ->> 'email') = 'avilaisabel1218@gmail.com')
  with check ((select auth.jwt() ->> 'email') = 'avilaisabel1218@gmail.com');
