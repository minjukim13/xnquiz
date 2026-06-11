import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const REGRADE_OPTIONS = [
  {
    id: 'award_both',
    title: '이전 정답과 수정된 정답 모두 인정',
    desc: '기존 점수가 낮아지지 않습니다. 새 정답에 맞는 학생에게 추가 점수를 부여합니다.',
    color: 'text-success',
    bg: 'bg-success-bg',
    activeBorder: 'border-success',
    dotColor: 'bg-success',
  },
  {
    id: 'new_answer_only',
    title: '수정된 정답 기준으로만 재채점',
    manualTitle: '현재 정답 기준으로 재채점',
    desc: '새 정답 기준으로 자동 재채점됩니다. 일부 학생의 점수가 낮아질 수 있습니다.',
    manualDesc: '현재 설정된 정답 기준으로 자동 재채점됩니다. 일부 학생의 점수가 변경될 수 있습니다.',
    color: 'text-warning',
    bg: 'bg-warning-bg',
    activeBorder: 'border-warning',
    dotColor: 'bg-warning',
  },
  {
    id: 'full_points',
    title: '모든 학생에게 만점 부여',
    desc: '이 문항에 응시한 학생 전원에게 만점을 부여합니다.',
    color: 'text-primary',
    bg: 'bg-accent',
    activeBorder: 'border-primary',
    dotColor: 'bg-primary',
  },
  {
    id: 'no_regrade',
    title: '재채점 없이 문제만 업데이트',
    desc: '문제 내용만 변경하고 기존 채점 결과를 그대로 유지합니다.',
    color: 'text-secondary-foreground',
    bg: 'bg-secondary',
    activeBorder: 'border-slate-400',
    dotColor: 'bg-slate-500',
  },
]

export default function RegradeOptionsModal({ submittedCount, mode = 'edit', questionLabel, onConfirm, onCancel }) {
  const isManual = mode === 'manual'
  const availableOptions = isManual
    ? REGRADE_OPTIONS.filter(o => o.id === 'new_answer_only' || o.id === 'full_points')
    : REGRADE_OPTIONS
  const [selected, setSelected] = useState(isManual ? 'new_answer_only' : 'award_both')

  return (
    <Dialog open onOpenChange={open => { if (!open) onCancel() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isManual ? '문항 재채점' : '재채점 옵션 선택'}</DialogTitle>
          <DialogDescription>
            {isManual
              ? `${questionLabel ? `${questionLabel} ` : ''}문항을 어떻게 재채점할지 선택하세요`
              : '정답이 변경된 문항에 대해 재채점 방식을 선택하세요'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 문항 정보 */}
          <div className="rounded-lg bg-warning-bg/40 border border-warning-border px-4 py-3">
            <p className="text-[13px] leading-relaxed text-slate-600">
              {isManual ? (
                <>이 문항에 응시한 <span className="font-bold">{submittedCount}명</span>의 학생에 대해 재채점을 실행합니다. 확인 시 즉시 반영됩니다.</>
              ) : (
                <>이미 답안을 제출한 <span className="font-bold">{submittedCount}명</span>의 학생에 대한 재채점 옵션을 선택하십시오. 퀴즈 저장 시 일괄 재채점됩니다.</>
              )}
            </p>
          </div>

          {/* 옵션 목록 */}
          <div className="space-y-2">
            {availableOptions.map(opt => {
              const isActive = selected === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelected(opt.id)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all',
                    isActive
                      ? cn(opt.activeBorder, opt.bg)
                      : 'border-border bg-white hover:bg-slate-50'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all',
                    isActive ? cn(opt.activeBorder, 'bg-white') : 'border-slate-300 bg-white'
                  )}>
                    {isActive && (
                      <div className={cn('w-2 h-2 rounded-full', opt.dotColor)} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-[15px] font-semibold',
                      isActive ? opt.color : 'text-foreground'
                    )}>
                      {isManual && opt.manualTitle ? opt.manualTitle : opt.title}
                    </p>
                    <p className="text-xs mt-0.5 text-muted-foreground leading-relaxed">
                      {isManual && opt.manualDesc ? opt.manualDesc : opt.desc}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onCancel}>
              취소
            </Button>
            <Button onClick={() => onConfirm(selected)}>
              {isManual ? '재채점' : '업데이트'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
