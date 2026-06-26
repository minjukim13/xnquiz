import { useMemo } from 'react'
import { Shuffle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import TypeBadge from './TypeBadge'
import { DiffBadge } from './BankWizardShared'
import { resolveGroupQuestionPoints } from '@/utils/randomGroups'
import { htmlToPlainText } from './RichText'
import { cn } from '@/lib/utils'

const DIFF_ORDER = [
  { key: 'high', label: '상', cls: 'text-red-600' },
  { key: 'medium', label: '중', cls: 'text-amber-600' },
  { key: 'low', label: '하', cls: 'text-green-600' },
  { key: 'none', label: '미설정', cls: 'text-muted-foreground' },
]

// 랜덤 출제 그룹이 어느 문제은행의 어떤 문항과 연결됐는지 확인하는 모달
// 그룹 추가 시점에 복사된 bankSnapshot(풀)을 그대로 보여준다
export default function RandomGroupPreviewModal({ group, open, onOpenChange }) {
  const pool = useMemo(() => group?.bankSnapshot ?? [], [group])

  const diffCounts = useMemo(() => {
    const c = { high: 0, medium: 0, low: 0, none: 0 }
    pool.forEach(q => {
      const k = q.difficulty && c[q.difficulty] !== undefined ? q.difficulty : 'none'
      c[k]++
    })
    return c
  }, [pool])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[calc(100vw-24px)] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">

        {/* ── 헤더 ── */}
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-4 border-b border-border shrink-0 space-y-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Shuffle size={15} />
            </span>
            <div className="min-w-0">
              <DialogTitle className="truncate">{group?.bankName} 문제은행</DialogTitle>
              {group?.bankCourse && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{group.bankCourse}</p>
              )}
            </div>
          </div>
          <DialogDescription className="pt-3">
            학생마다 이 문제은행의 <span className="font-semibold text-foreground">{pool.length}개</span> 문항 중
            {' '}<span className="font-semibold text-foreground">{group?.count}개</span>가 무작위로 출제됩니다.
          </DialogDescription>
        </DialogHeader>

        {/* ── 요약 지표 ── */}
        <div className="px-5 sm:px-6 py-4 border-b border-border shrink-0">
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="연결 문항" value={pool.length} unit="개" />
            <StatCard label="학생별 출제" value={group?.count ?? 0} unit="개" highlight />
            <StatCard
              label="배점"
              value={group?.useDifficultyScoring ? '차등' : (group?.pointsPerQuestion ?? 0)}
              unit={group?.useDifficultyScoring ? '' : '점'}
            />
          </div>

          {/* 난이도 분포 */}
          <div className="flex items-center flex-wrap gap-1.5 mt-3">
            <span className="text-[11px] text-muted-foreground mr-0.5">난이도</span>
            {DIFF_ORDER.map(({ key, label, cls }) => (
              <span
                key={key}
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-secondary',
                  diffCounts[key] === 0 && 'opacity-45'
                )}
              >
                <span className={cn('font-semibold', cls)}>{label}</span>
                <span className="text-secondary-foreground tabular-nums">{diffCounts[key]}</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── 문항 목록 ── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-2">
          {pool.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">연결된 문항이 없습니다</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/70">
              {pool.map((q, i) => (
                <li key={q.id ?? i} className="flex items-start gap-3 px-2 py-3 rounded-lg hover:bg-secondary/40 transition-colors">
                  <span className="mt-0.5 w-6 h-6 rounded-md bg-secondary text-muted-foreground text-[11px] font-semibold flex items-center justify-center shrink-0 tabular-nums">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-foreground leading-snug line-clamp-2">
                      {q.title ? `${q.title} — ${htmlToPlainText(q.text)}` : htmlToPlainText(q.text)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <TypeBadge type={q.type} small />
                      <DiffBadge difficulty={q.difficulty} />
                      <span className="text-[11px] text-muted-foreground tabular-nums">{resolveGroupQuestionPoints(group, q)}점</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatCard({ label, value, unit, highlight }) {
  return (
    <div className={cn(
      'rounded-xl border px-3.5 py-2.5',
      highlight ? 'border-primary/30 bg-accent' : 'border-border bg-secondary/40'
    )}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn('text-[20px] font-bold leading-tight mt-0.5', highlight ? 'text-primary' : 'text-foreground')}>
        {value}{unit && <span className="text-[12px] font-medium text-muted-foreground ml-0.5">{unit}</span>}
      </p>
    </div>
  )
}
