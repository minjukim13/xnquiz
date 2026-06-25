// 과목 기본값과 다르게 설정됐을 때 노출하는 안내 (D-05 R-002)
export default function DefaultOverrideNotice({ show, onRevert }) {
  if (!show) return null
  return (
    <div className="mt-2 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-accent border border-blue-100">
      <span className="text-xs text-accent-foreground">이 과목 기본값과 다르게 설정됩니다</span>
      <button
        type="button"
        onClick={onRevert}
        className="text-xs font-medium text-primary hover:underline shrink-0"
      >
        기본값으로 되돌리기
      </button>
    </div>
  )
}
