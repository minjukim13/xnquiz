import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useQuestionBank } from '../context/questionBank'
import { cn } from '@/lib/utils'

export default function MoveQuestionsModal({ count, currentBankId, onClose, onMove }) {
  const { banks, getBankQuestions } = useQuestionBank()
  const [targetId, setTargetId] = useState(null)
  const [keepOriginal, setKeepOriginal] = useState(false)

  const targets = banks.filter(b => b.id !== currentBankId)

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>다른 문제은행으로 이동</DialogTitle>
          <DialogDescription>
            선택한 문항 {count}개를 옮길 문제은행을 선택하세요.
          </DialogDescription>
        </DialogHeader>

        {targets.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            이동할 수 있는 다른 문제은행이 없습니다.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
            {targets.map(b => {
              const selected = targetId === b.id
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setTargetId(b.id)}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-lg border text-left transition-all',
                    selected
                      ? 'border-primary bg-accent'
                      : 'border-border bg-white hover:bg-secondary'
                  )}
                >
                  <div className="min-w-0">
                    <p className={cn('text-sm font-medium truncate', selected ? 'text-primary' : 'text-foreground')}>
                      {b.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      문항 {getBankQuestions(b.id).length}개
                    </p>
                  </div>
                  {selected && <Check size={16} className="text-primary shrink-0" />}
                </button>
              )
            })}
          </div>
        )}

        <div
          onClick={() => setKeepOriginal(v => !v)}
          className="flex items-start gap-2.5 px-1 cursor-pointer select-none"
        >
          <Checkbox checked={keepOriginal} onChange={() => setKeepOriginal(v => !v)} className="mt-0.5" aria-label="현재 문제은행에도 남기기" />
          <span className="text-sm text-secondary-foreground">
            현재 문제은행에도 남기기
            <span className="block text-[11px] text-muted-foreground mt-0.5">
              체크하면 원본을 그대로 두고 선택한 문제은행으로 복사합니다.
            </span>
          </span>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
          <Button
            size="sm"
            disabled={!targetId}
            onClick={() => targetId && onMove(targetId, keepOriginal)}
          >
            {keepOriginal ? '복사' : '이동'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
