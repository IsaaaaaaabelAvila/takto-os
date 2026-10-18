# Takto OS

Sistema integral para el negocio de impresión 3D Takto: pedidos, producción, inventario,
costeo, finanzas (P&L, flujo de efectivo, IVA, cuentas por cobrar) y reportes.

React + Vite + Tailwind + Supabase (Postgres). Sin Supabase configurado corre en **modo local**
(localStorage) para probar.

## Correr
```bash
npm install
npm run dev
```

## Conectar Supabase
1. Crea un proyecto en supabase.com.
2. Ejecuta `supabase/migrations/20261018000000_init.sql` en el SQL Editor.
3. En Authentication → Users crea tu usuario (correo y contraseña) y desactiva "Allow new users to sign up". Las políticas RLS solo permiten el correo del dueño.
4. Copia `.env.example` a `.env.local` y llena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## Modelo financiero
- Costo por pieza = filamento (con merma por color) + energía + máquina + mano de obra + otros, sobre piezas por lote.
- Estado de resultados acumulado: ventas netas (sin IVA) − costo de lo vendido − envíos/comisiones − gastos operativos.
- Compras de material = inventario (costo promedio ponderado); equipo = inversión. Ninguno es gasto del mes.
- Flujo de efectivo por operación / inversión / financiamiento; IVA trasladado vs. acreditable; punto de equilibrio.
