import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useQuestionBank } from '../context/questionBank'
import { DIFFICULTY_META, DIFF_LABEL } from './bankDifficulty'
import { cn } from '@/lib/utils'

export default function MoveQuestionsModal({ open, onClose, onConfirm, count, currentBankId }) {
  const { banks } = useQuestionBank()
  const [targetBankId, setTargetBankId] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const candidates = banks.filter(b => b.id !== currentBankId)

  const handleConfirm = async () => {
    if (!targetBankId || submitting) return
    setSubmitting(true)
    try {
      await onConfirm(targetBankId)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-3 space-y-1">
          <DialogTitle>다른 문제모음으로 이동</DialogTitle>
          <DialogDescription>
            선택한 {count}개 문항을 옮길 문제모음을 선택하세요. 원본 문제모음에서는 제거됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 max-h-[360px] overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              이동할 수 있는 다른 문제모음이 없습니다
            </p>
          ) : (
            <div className="space-y-1.5 py-1">
              {candidates.map(b => {
                const selected = b.id === targetBankId
                const diffMeta = b.difficulty && DIFFICULTY_META[b.difficulty]
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setTargetBankId(b.id)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-center gap-2',
                      selected
                        ? 'border-primary bg-accent'
                        : 'border-border bg-white hover:border-primary/40'
                    )}
                  >
                    <span className={cn(
                      'text-[11px] px-1.5 py-0.5 rounded-md font-medium shrink-0',
                      diffMeta ? diffMeta.cls : 'bg-secondary text-muted-foreground'
                    )}>
                      {b.difficulty ? DIFF_LABEL[b.difficulty] : '미설정'}
                    </span>
                    <span className={cn(
                      'text-sm truncate flex-1',
                      selected ? 'font-semibold text-primary' : 'text-secondary-foreground'
                    )}>
                      {b.name}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
          <Button
            disabled={!targetBankId || submitting || candidates.length === 0}
            onClick={handleConfirm}
          >
            {submitting ? '이동 중' : `${count}개 이동`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
