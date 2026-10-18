import { useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { BarChart3, Boxes, Calculator, ClipboardList, Cog, LayoutDashboard, LogOut, Printer, Users, Wallet } from 'lucide-react'
import { useStore } from './lib/store'
import { supabase } from './lib/db'
import { Btn, Field } from './components/ui'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Production from './pages/Production'
import Inventory from './pages/Inventory'
import Products from './pages/Products'
import Finance from './pages/Finance'
import Customers from './pages/Customers'
import Reports from './pages/Reports'
import SettingsPage from './pages/Settings'

const NAV = [
  { to: '/', label: 'Panel', icon: LayoutDashboard },
  { to: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/produccion', label: 'Producción', icon: Printer },
  { to: '/inventario', label: 'Inventario', icon: Boxes },
  { to: '/productos', label: 'Productos y costeo', icon: Calculator },
  { to: '/finanzas', label: 'Finanzas', icon: Wallet },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/ajustes', label: 'Ajustes', icon: Cog },
]

function Login() {
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState('')
  const go = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase!.auth.signInWithPassword({ email, password: pw })
    if (error) setErr(error.message)
  }
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form onSubmit={go} className="bg-white border border-sand rounded-2xl p-8 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3"><img src="/logo.png" className="h-10" alt="" /><div className="font-semibold text-lg tracking-wide">TAKTO OS</div></div>
        <Field label="Correo"><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></Field>
        <Field label="Contraseña"><input type="password" value={pw} onChange={e => setPw(e.target.value)} required /></Field>
        {err && <p className="text-sm text-bad">{err}</p>}
        <Btn className="w-full justify-center">Entrar</Btn>
      </form>
    </div>
  )
}

export default function App() {
  const { session, loading, error, cloud, signOut, data } = useStore()
  if (cloud && !session) return <Login />
  return (
    <div className="min-h-screen md:flex">
      <aside className="md:w-60 md:min-h-screen md:sticky md:top-0 md:h-screen bg-graphite text-soft flex md:flex-col overflow-x-auto md:overflow-visible">
        <div className="hidden md:flex items-center gap-3 px-5 py-6">
          <img src="/logo.png" className="h-9 rounded bg-soft p-1" alt="" />
          <div><div className="font-semibold tracking-[0.2em] text-sm">TAKTO</div><div className="text-[11px] text-fog">Centro de control</div></div>
        </div>
        <nav className="flex md:flex-col gap-1 p-2 md:px-3 md:flex-1">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition ${isActive ? 'bg-sage text-graphite font-medium' : 'text-fog hover:bg-white/10'}`}>
              <n.icon size={17} />{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block p-4 text-[11px] text-fog border-t border-white/10">
          {cloud ? <button onClick={signOut} className="flex items-center gap-2 hover:text-white"><LogOut size={14} />Cerrar sesión</button> : 'Modo local (datos solo en este navegador)'}
          <div className="mt-1">{data.settings.currency} · IVA {Math.round(data.settings.iva_rate * 100)}%</div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-8 max-w-[1400px]">
        {error && <div className="mb-4 p-3 rounded-lg bg-bad/10 text-bad text-sm">Error al cargar datos: {error}</div>}
        {loading ? <div className="text-sm text-[#6b6f72]">Cargando…</div> : (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pedidos" element={<Orders />} />
            <Route path="/produccion" element={<Production />} />
            <Route path="/inventario" element={<Inventory />} />
            <Route path="/productos" element={<Products />} />
            <Route path="/finanzas" element={<Finance />} />
            <Route path="/clientes" element={<Customers />} />
            <Route path="/reportes" element={<Reports />} />
            <Route path="/ajustes" element={<SettingsPage />} />
          </Routes>
        )}
      </main>
    </div>
  )
}
