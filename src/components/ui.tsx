import { X } from 'lucide-react'
import type { ReactNode, ButtonHTMLAttributes } from 'react'

export function Card({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-white border border-sand rounded-xl ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {action}
        </header>
      )}
      <div className="p-5 pt-3">{children}</div>
    </section>
  )
}

export function Stat({ label, value, sub, tone, hint }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'bad' | 'warn'; hint?: string }) {
  const color = tone === 'good' ? 'text-sage-dark' : tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : ''
  return (
    <div className="bg-white border border-sand rounded-xl p-4" title={hint}>
      <div className="text-xs text-[#6b6f72] font-medium">{label}</div>
      <div className={`text-2xl font-semibold mt-1 tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-xs text-[#6b6f72] mt-1">{sub}</div>}
    </div>
  )
}

export function Btn({ variant = 'primary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const v = variant === 'primary' ? 'bg-graphite text-white hover:bg-black' : variant === 'danger' ? 'text-bad border border-bad/30 hover:bg-bad/5' : 'border border-fog hover:bg-sand/60'
  return <button {...p} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40 ${v} ${className}`} />
}

const BADGE: Record<string, string> = {
  cotizacion: 'bg-sand text-graphite', confirmado: 'bg-sage/25 text-sage-dark', produccion: 'bg-warn/15 text-warn',
  listo: 'bg-sage/40 text-graphite', enviado: 'bg-sage/50 text-graphite', entregado: 'bg-sage-dark text-white', cancelado: 'bg-bad/10 text-bad',
  en_cola: 'bg-sand text-graphite', imprimiendo: 'bg-warn/15 text-warn', terminado: 'bg-sage-dark text-white',
}
export const STATUS_LABEL: Record<string, string> = {
  cotizacion: 'Cotización', confirmado: 'Confirmado', produccion: 'En producción', listo: 'Listo', enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado',
  en_cola: 'En cola', imprimiendo: 'Imprimiendo', terminado: 'Terminado', cancelado_job: 'Cancelado',
}
export function Badge({ s, children }: { s: string; children?: ReactNode }) {
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${BADGE[s] ?? 'bg-sand'}`}>{children ?? STATUS_LABEL[s] ?? s}</span>
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-graphite/40 flex items-start justify-center p-4 overflow-auto" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-soft rounded-2xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} my-8`}>
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-sand" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <div className={className}><label>{label}</label>{children}</div>
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {sub && <p className="text-sm text-[#6b6f72] mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-sm text-[#6b6f72] text-center py-10">{children}</div>
}

export function Bar({ value, max, tone = 'sage' }: { value: number; max: number; tone?: 'sage' | 'bad' | 'warn' }) {
  const w = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const c = tone === 'bad' ? 'bg-bad' : tone === 'warn' ? 'bg-warn' : 'bg-sage'
  return <div className="h-2 rounded-full bg-sand overflow-hidden"><div className={`h-full ${c}`} style={{ width: `${w}%` }} /></div>
}

export function downloadCSV(name: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  a.download = name; a.click()
}
