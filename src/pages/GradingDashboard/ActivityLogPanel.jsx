import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Play, ArrowRightLeft, Pencil, EyeOff, Eye, Save, Send, FileText } from 'lucide-react'
import {
  buildActivityLogKey,
  loadActivityLog,
  summarizeActivityLog,
  ACTIVITY_TYPES,
} from '@/utils/activityLog'

const TYPE_META = {
  [ACTIVITY_TYPES.START]: { label: '응시 시작', icon: Play, className: 'text-emerald-700 bg-emerald-50' },
  [ACTIVITY_TYPES.NAVIGATE]: { label: '문항 이동', icon: ArrowRightLeft, className: 'text-blue-700 bg-blue-50' },
  [ACTIVITY_TYPES.ANSWER_CHANGE]: { label: '답변 변경', icon: Pencil, className: 'text-violet-700 bg-violet-50' },
  [ACTIVITY_TYPES.FOCUS_LOSS]: { label: '포커스 이탈', icon: EyeOff, className: 'text-amber-700 bg-amber-50' },
  [ACTIVITY_TYPES.FOCUS_GAIN]: { label: '포커스 복귀', icon: Eye, className: 'text-slate-600 bg-slate-100' },
  [ACTIVITY_TYPES.AUTOSAVE]: { label: '자동 저장', icon: Save, className: 'text-slate-500 bg-slate-50' },
  [ACTIVITY_TYPES.SUBMIT]: { label: '제출', icon: Send, className: 'text-primary bg-accent' },
}

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  } catch {
    return '-'
  }
}

function formatDateTime(ts) {
  try {
    return new Date(ts).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return '-'
  }
}

function formatDuration(sec) {
  if (sec == null) return '-'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m === 0) return `${s}초`
  return `${m}분 ${s}초`
}

function describeEntry(entry, questions) {
  const findQ = qId => questions.find(q => q.id === qId)
  switch (entry.type) {
    case ACTIVITY_TYPES.NAVIGATE: {
      const toQ = questions[entry.to]
      return `${entry.from + 1}번 → ${entry.to + 1}번${toQ ? ` (${toQ.text?.slice(0, 20) || ''}${(toQ.text?.length ?? 0) > 20 ? '…' : ''})` : ''}`
    }
    case ACTIVITY_TYPES.ANSWER_CHANGE: {
      const q = findQ(entry.qId)
      if (!q) return '문항 답변 수정'
      return `Q${q.order ?? ''} ${q.text?.slice(0, 30) || ''}${(q.text?.length ?? 0) > 30 ? '…' : ''}`
    }
    case ACTIVITY_TYPES.SUBMIT:
      return entry.auto ? '시간 초과로 자동 제출' : '학생 제출'
    case ACTIVITY_TYPES.START:
      return '응시 페이지 진입'
    case ACTIVITY_TYPES.AUTOSAVE:
      return '응시 세션 저장'
    case ACTIVITY_TYPES.FOCUS_LOSS:
      return '탭/창 전환'
    case ACTIVITY_TYPES.FOCUS_GAIN:
      return '화면으로 복귀'
    default:
      return ''
  }
}

export default function ActivityLogPanel({ student, quizId, questions }) {
  const key = buildActivityLogKey(quizId, student.id)
  const log = useMemo(() => loadActivityLog(key), [key])
  const summary = useMemo(() => summarizeActivityLog(log), [log])

  if (!log.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 gap-2 text-center">
        <FileText size={28} className="text-muted-foreground/40" />
        <p className="text-sm font-medium text-slate-700">기록된 활동 로그가 없습니다</p>
        <p className="text-xs text-muted-foreground">
          이 학생이 응시한 기록이 아직 없거나, 활동 로그 기능 도입 이전에 응시한 경우입니다.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* 요약 */}
      <div className="grid grid-cols-4 gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <SummaryCell label="응시 시작" value={summary.startedAt ? formatDateTime(summary.startedAt) : '-'} />
        <SummaryCell label="소요 시간" value={formatDuration(summary.durationSec)} accent={summary.autoSubmitted ? 'amber' : undefined} />
        <SummaryCell label="포커스 이탈" value={`${summary.focusLossCount}회`} accent={summary.focusLossCount > 0 ? 'amber' : undefined} />
        <SummaryCell label="답변 변경" value={`${summary.answerChangeCount}회`} />
      </div>

      {/* 타임라인 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {log.map((entry, idx) => {
          const meta = TYPE_META[entry.type] || { label: entry.type, icon: FileText, className: 'text-slate-500 bg-slate-50' }
          const Icon = meta.icon
          return (
            <div
              key={`${entry.ts}-${idx}`}
              className="flex items-start gap-3 px-4 py-2.5 border-b border-slate-50 hover:bg-slate-50/60"
            >
              <span className="w-16 shrink-0 text-xs font-mono tabular-nums text-muted-foreground pt-0.5">
                {formatTime(entry.ts)}
              </span>
              <span className={cn('shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium', meta.className)}>
                <Icon size={11} />
                {meta.label}
              </span>
              <span className="flex-1 min-w-0 text-[13px] text-slate-700 truncate">
                {describeEntry(entry, questions)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SummaryCell({ label, value, accent }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className={cn(
        'text-sm font-semibold',
        accent === 'amber' ? 'text-amber-700' : 'text-foreground'
      )}>
        {value}
      </p>
    </div>
  )
}
