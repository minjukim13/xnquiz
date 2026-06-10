import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// 단계 표시 + 진행 안내 컴포넌트
// 사용:
//   <StepIndicator
//     steps={[
//       { value: 'info', label: '시험 설정', desc: '...', requirement: '퀴즈 제목을 입력해주세요' },
//       { value: 'questions', label: '문항 추가', desc: '...', requirement: '최소 1개 문항을 추가해주세요' }
//     ]}
//     current='info'
//     onChange={setTab}
//     completedSteps={['info']}    // optional, 완료 표식 표시 + requirement 비노출 판단
//   />
//
// requirement 는 활성 단계가 미완료(completedSteps 에 없음)일 때만 desc 박스에 함께 노출.
export default function StepIndicator({ steps, current, onChange, completedSteps = [] }) {
  const currentIdx = steps.findIndex(s => s.value === current)
  const activeStep = steps[currentIdx]
  const isActiveIncomplete = activeStep && !completedSteps.includes(activeStep.value)

  return (
    <div className="space-y-4">
      <ol className="flex items-stretch gap-2 sm:gap-3">
        {steps.map((step, idx) => {
          const isActive = step.value === current
          const isCompleted = completedSteps.includes(step.value) && !isActive
          const isPending = !isActive && !isCompleted

          return (
            <li key={step.value} className="flex items-center flex-1 min-w-0">
              <button
                type="button"
                onClick={() => onChange(step.value)}
                className={cn(
                  'flex items-center gap-2.5 min-w-0 px-3 py-2 rounded-md transition-all w-full text-left',
                  isActive && 'bg-accent',
                  isPending && 'hover:bg-secondary/60',
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0 text-xs font-semibold',
                    isActive && 'bg-primary text-primary-foreground',
                    isCompleted && 'bg-success text-primary-foreground',
                    isPending && 'bg-secondary text-muted-foreground',
                  )}
                >
                  {isCompleted ? <Check size={13} /> : idx + 1}
                </span>
                <span className={cn(
                  'text-sm font-semibold truncate',
                  isActive && 'text-primary',
                  isCompleted && 'text-foreground',
                  isPending && 'text-muted-foreground',
                )}>
                  {step.label}
                </span>
              </button>
              {idx < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'mx-1 sm:mx-2 h-px flex-1 min-w-[12px] shrink-0',
                    idx < currentIdx ? 'bg-success' : 'bg-border',
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>

      {activeStep?.desc && (
        <div className="px-3 py-2 rounded-md bg-secondary/60 text-xs text-secondary-foreground space-y-1.5">
          <p>
            <span className="font-medium text-foreground">{activeStep.label}</span>
            <span className="mx-1.5 text-muted-foreground">·</span>
            {activeStep.desc}
          </p>
          {activeStep.requirement && isActiveIncomplete && (
            <p className="text-warning-foreground">{activeStep.requirement}</p>
          )}
        </div>
      )}
    </div>
  )
}
