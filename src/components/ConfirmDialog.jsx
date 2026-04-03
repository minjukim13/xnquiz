/**
 * 재사용 가능한 커스텀 다이얼로그 컴포넌트
 *
 * ConfirmDialog — 확인/취소 선택이 필요한 경우 (window.confirm 대체)
 * AlertDialog   — 단순 안내 알림 (window.alert 대체)
 */

// ── Confirm ─────────────────────────────────────────────────────────────────
export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = '확인',
  cancelLabel = '취소',
  confirmDanger = false,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div
        className="relative bg-white w-full max-w-sm rounded-xl overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
      >
        <div className="px-6 pt-6 pb-2">
          <p className="text-base font-semibold mb-2" style={{ color: '#222222' }}>{title}</p>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#616161' }}>{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4">
          <button
            onClick={onCancel}
            className="text-sm px-4 py-2 rounded-lg transition-colors font-medium"
            style={{ color: '#616161', background: '#F5F5F5' }}
            onMouseEnter={e => e.currentTarget.style.background = '#EEEEEE'}
            onMouseLeave={e => e.currentTarget.style.background = '#F5F5F5'}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="text-sm px-4 py-2 rounded-lg transition-colors font-medium text-white"
            style={{ background: confirmDanger ? '#EF2B2A' : '#6366f1' }}
            onMouseEnter={e => e.currentTarget.style.background = confirmDanger ? '#c91f1e' : '#4f46e5'}
            onMouseLeave={e => e.currentTarget.style.background = confirmDanger ? '#EF2B2A' : '#6366f1'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Alert ────────────────────────────────────────────────────────────────────
export function AlertDialog({
  title,
  message,
  onClose,
  closeLabel = '확인',
  variant = 'info', // 'info' | 'warning' | 'error'
}) {
  const colors = {
    info:    { icon: 'ℹ', bg: '#EEF2FF', text: '#4338CA', border: '#c7d2fe' },
    warning: { icon: '⚠', bg: '#FFFBEB', text: '#92400E', border: '#fde68a' },
    error:   { icon: '✕', bg: '#FFF0EF', text: '#B91C1C', border: '#fecaca' },
  }
  const c = colors[variant] ?? colors.info

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative bg-white w-full max-w-sm rounded-xl overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
      >
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-start gap-3 mb-3">
            <span
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
            >
              {c.icon}
            </span>
            <p className="text-base font-semibold pt-1" style={{ color: '#222222' }}>{title}</p>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#616161' }}>{message}</p>
        </div>
        <div className="flex justify-end px-6 py-4">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg transition-colors font-medium text-white"
            style={{ background: '#6366f1' }}
            onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
            onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
