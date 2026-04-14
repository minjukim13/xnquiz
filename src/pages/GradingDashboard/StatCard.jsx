import { cn } from '@/lib/utils'

// ─── 공용 컴포넌트 ─────────────────────────────────────────────────────────
export default function StatCard({ label, value, unit, accent }) {
  return (
    <div className="bg-white p-3 text-center border border-slate-200 rounded-lg">
      <div className="flex items-baseline justify-center gap-0.5 flex-wrap">
        <span className={cn('text-xl font-bold', accent ? 'text-primary' : 'text-slate-900')}>{value}</span>
        {unit && <span className="text-xs text-slate-400">{unit}</span>}
      </div>
      <div className="text-xs mt-1 text-slate-500">{label}</div>
    </div>
  )
}
