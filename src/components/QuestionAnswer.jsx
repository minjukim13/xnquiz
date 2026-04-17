import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const BADGE = "text-[12px] font-medium px-1.5 py-0.5 rounded bg-correct-bg text-correct shrink-0"
const PILL_ACTIVE = "bg-primary text-primary-foreground"
const PILL_INACTIVE = "bg-slate-100 text-muted-foreground"
const ITEM_BADGE = "text-[12px] font-medium px-2 py-0.5 rounded-full bg-accent text-primary"

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

  // 연결형: 정답 배지 우측에 라벨→정답 + 오답 보기
  if (t === 'matching' && q.pairs?.length > 0) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
        <span className={BADGE}>정답</span>
        {q.pairs.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded-full bg-accent text-primary">
            {p.left} <ArrowRight size={10} className="text-muted-foreground" /> {p.right}
          </span>
        ))}
        {q.distractors?.length > 0 && (
          <>
            <span className="text-[11px] text-muted-foreground shrink-0 ml-1">오답 보기</span>
            {q.distractors.map((d, i) => (
              <span key={i} className="text-[12px] px-2 py-0.5 rounded-full bg-slate-100 text-muted-foreground">{d}</span>
            ))}
          </>
        )}
      </div>
    )
  }

  // 드롭다운: 정답 배지 우측에 라벨→정답
  if (t === 'multiple_dropdowns' && Array.isArray(q.dropdowns) && q.dropdowns.length > 0) {
    const items = q.dropdowns
      .map(dd => ({ label: dd.label, answer: dd.options?.[dd.answerIdx] }))
      .filter(it => it.answer)
    if (items.length === 0) return null
    return (
      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
        <span className={BADGE}>정답</span>
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded-full bg-accent text-primary">
            {it.label && <>{it.label} <ArrowRight size={10} className="text-muted-foreground" /></>}
            {it.answer}
          </span>
        ))}
      </div>
    )
  }

  // 수식형: 수식 + 허용 오차 표시 (학생마다 값이 달라 단일 정답 없음)
  if (t === 'formula' && q.formula) {
    const tolText = q.tolerance
      ? ` (±${q.tolerance}${q.toleranceType === 'percent' ? '%' : ''})`
      : ''
    return (
      <div className="flex items-center gap-2 mt-1.5">
        <span className={BADGE}>정답</span>
        <span className="text-[13px] font-mono font-medium text-foreground truncate">
          {q.formula}{tolText}
        </span>
      </div>
    )
  }

  // 다중빈칸: 개별 배지 (복수 정답 지원)
  if (t === 'fill_in_multiple_blanks' && Array.isArray(ans) && ans.length > 0) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        <span className={BADGE}>정답</span>
        {ans.map((item, i) => {
          const answers = Array.isArray(item) ? item : [item]
          return (
            <span key={i} className={ITEM_BADGE}>
              {answers.join(' / ')}
            </span>
          )
        })}
      </div>
    )
  }

  // 그 외: 텍스트 표시 (알려진 타입만)
  let display = ''
  if (t === 'multiple_choice') {
    display = typeof ans === 'string' ? ans : (q.choices ?? q.options)?.[ans] ?? ''
  } else if (t === 'short_answer') {
    display = Array.isArray(ans) ? ans[0] : String(ans ?? '')
  } else if (t === 'numerical') {
    if (ans === undefined || ans === null || ans === '') return null
    display = `${ans}` + (q.tolerance ? ` (±${q.tolerance})` : '')
  } else {
    return null
  }
  if (!display) return null
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <span className={BADGE}>정답</span>
      <span className="text-[13px] font-medium text-foreground truncate">{display}</span>
    </div>
  )
}
