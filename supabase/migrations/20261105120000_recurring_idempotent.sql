alter table transactions add column recurring_id uuid references recurring_expenses(id) on delete set null, add column recurring_month text;
create unique index transactions_recurring_once on transactions (recurring_id, recurring_month) where recurring_id is not null;
