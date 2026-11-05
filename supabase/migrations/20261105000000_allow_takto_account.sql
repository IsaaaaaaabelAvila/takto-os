do $$ declare t text; begin
  foreach t in array array['settings','items','products','customers','orders','order_items',
                           'production_jobs','stock_movements','transactions','recurring_expenses'] loop
    execute format('drop policy if exists "owner full access" on %I', t);
    execute format($p$create policy "owner full access" on %I for all to authenticated
      using ((select auth.jwt() ->> 'email') in ('avilaisabel1218@gmail.com','contacto.takto@gmail.com'))
      with check ((select auth.jwt() ->> 'email') in ('avilaisabel1218@gmail.com','contacto.takto@gmail.com'))$p$, t);
  end loop;
end $$;
