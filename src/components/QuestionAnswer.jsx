import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const BADGE = "text-[12px] font-medium px-1.5 py-0.5 rounded bg-[#EAF8F1] text-[#31B46E] shrink-0"
const PILL_ACTIVE = "bg-[#3182F6] text-white"
const PILL_INACTIVE = "bg-slate-100 text-slate-400"
const ITEM_BADGE = "text-[12px] font-medium px-2 py-0.5 rounded-full bg-[#F2F8FF] text-[#3182F6]"

export default function QuestionAnswer({ q }) {
  const t = q.type
  const ans = q.correctAnswer
  if (t === 'essay' || t === 'file_upload' || t === 'text') return null

  // 참/거짓: pill 칩
  if (t === 'true_false') {
    const correct = typeof ans === 'boolean' ? (ans ? '참' : '거짓') : String(ans)
    return (
      <div className="flex items-center gap-2 mt-1.5">
        <span className={BADGE}>정답</span>
        <div className="flex items-center gap-1">
          {['참', '거짓'].map(opt => (
            <span key={opt} className={cn('px-2 py-0.5 rounded-full text-[12px] font-medium', opt === correct ? PILL_ACTIVE : PILL_INACTIVE)}>{opt}</span>
          ))}
        </div>
      </div>
    )
  }

  // 복수 정답: 개별 배지
  if (t === 'multiple_answers' && Array.isArray(ans)) {
    const items = ans.map(a => typeof a === 'number' ? (q.choices ?? q.options)?.[a] : a).filter(Boolean)
    if (items.length === 0) return null
    return (
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        <span className={BADGE}>정답</span>
        {items.map((item, i) => (
          <span key={i} className={ITEM_BADGE}>{item}</span>
        ))}
      </div>
    )
  }

  // 단답형: 허용 정답 여러 개일 때 개별 배지
  if (t === 'short_answer' && Array.isArray(ans) && ans.length > 1) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        <span className={BADGE}>정답</span>
        {ans.map((item, i) => (
          <span key={i} className={ITEM_BADGE}>{item}</span>
        ))}
      </div>
    )
  }

  // 연결형: 화살표 아이콘
  if (t === 'matching' && q.pairs?.length > 0) {
    return (
      <div className="flex flex-col gap-1 mt-1.5">
        <span className={cn(BADGE, 'self-start')}>정답</span>
        <div className="flex flex-wrap gap-1.5">
          {q.pairs.map((p, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded-full bg-[#F2F8FF] text-[#3182F6]">
              {p.left} <ArrowRight size={10} className="text-[#8B95A1]" /> {p.right}
            </span>
          ))}
        </div>
      </div>
    )
  }

  // 다중빈칸: 개별 배지
  if (t === 'fill_in_multiple_blanks' && Array.isArray(ans) && ans.length > 0) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        <span className={BADGE}>정답</span>
        {ans.map((item, i) => (
          <span key={i} className={ITEM_BADGE}>{item}</span>
        ))}
      </div>
    )
  }

  // 그 외: 텍스트 표시
  let display = ''
  if (t === 'multiple_choice') {
    display = typeof ans === 'string' ? ans : (q.choices ?? q.options)?.[ans] ?? ''
  } else if (t === 'short_answer') {
    display = Array.isArray(ans) ? ans[0] : String(ans ?? '')
  } else if (t === 'numerical') {
    display = `${ans}` + (q.tolerance ? ` (±${q.tolerance})` : '')
  } else {
    display = typeof ans === 'string' ? ans : JSON.stringify(ans ?? '')
  }
  if (!display) return null
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <span className={BADGE}>정답</span>
      <span className="text-[13px] font-medium text-[#333D4B] truncate">{display}</span>
    </div>
  )
}
