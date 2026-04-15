import { CheckCircle2 } from 'lucide-react'

/**
 * 공통 토스트 컴포넌트
 * @param {string} message - 토스트 메시지
 * @param {{ label: string, onClick: () => void }} [action] - 액션 버튼 (바로가기 등)
 */
export function Toast({ message, action }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 text-sm text-white bg-slate-900 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
      <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
      <span className="font-medium">{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
