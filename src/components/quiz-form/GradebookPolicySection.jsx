import { Section } from './Section'
import { cn } from '@/lib/utils'

// XQ-D-06 R-007: 성적 반영 방식 (Gradebook 반영). 성적부 본체는 D-11 위임 — 여기서는 방식 선택만.
const GRADEBOOK_POLICIES = [
  { value: 'A', label: '자동 채점 즉시 반영', desc: '제출 즉시 자동 채점 점수를 반영하고, 수동 채점 완료 후 추가로 반영합니다.' },
  { value: 'B', label: '수동 채점 완료 후 일괄 반영', desc: '모든 수동 채점이 끝난 시점에 한 번에 반영합니다. (기본값)' },
  { value: 'C', label: '교수자 수동 확인 후 반영', desc: '교수자가 직접 반영을 실행할 때만 성적에 반영합니다.' },
]

export function GradebookPolicySection({ value = 'B', onChange }) {
  return (
    <Section title="성적 반영 방식">
      <div className="space-y-2">
        {GRADEBOOK_POLICIES.map(p => {
          const active = value === p.value
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              className={cn(
                'w-full text-left px-3.5 py-3 rounded-lg border transition-colors',
                active ? 'border-primary bg-accent' : 'border-border bg-white hover:border-primary/40'
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn(
                  'w-4 h-4 rounded-full border flex items-center justify-center shrink-0',
                  active ? 'border-primary' : 'border-slate-300'
                )}>
                  {active && <span className="w-2 h-2 rounded-full bg-primary" />}
                </span>
                <span className="text-sm font-medium text-foreground">{p.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-6 leading-relaxed">{p.desc}</p>
            </button>
          )
        })}
        <p className="text-xs text-muted-foreground">채점 결과를 성적부에 반영하는 시점을 정합니다. 공개 후에도 변경할 수 있습니다.</p>
      </div>
    </Section>
  )
}
