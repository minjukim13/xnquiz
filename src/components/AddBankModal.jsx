import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { DIFF_LABEL } from './BankWizardShared'

export default function AddBankModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [difficulty, setDifficulty] = useState('')

  const diffOptions = [
    { value: '', label: '미지정' },
    { value: 'high', label: '상' },
    { value: 'medium', label: '중' },
    { value: 'low', label: '하' },
  ]

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>새 문제은행 만들기</DialogTitle>
        </DialogHeader>
        <div>
          <label className="text-xs font-medium block mb-1.5 text-slate-500">이름</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onAdd(name.trim(), difficulty)}
            placeholder="문제은행 이름 (예: 기말고사 문제은행)"
            autoFocus
            className="w-full text-[15px] px-3 py-2 border border-slate-200 rounded focus:outline-none focus:border-blue-400 text-slate-900"
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5 text-slate-500">난이도</label>
          <div className="flex gap-2">
            {diffOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDifficulty(opt.value)}
                className={cn(
                  'flex-1 text-xs py-1.5 font-medium rounded transition-all border',
                  difficulty === opt.value
                    ? 'border-blue-400 bg-accent text-primary'
                    : cn(
                        'border-slate-200',
                        opt.value === 'high' ? 'text-red-600'
                          : opt.value === 'medium' ? 'text-amber-600'
                          : opt.value === 'low' ? 'text-green-600'
                          : 'text-slate-500'
                      )
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {difficulty && (
            <p className="text-xs mt-3 text-muted-foreground">
              난이도 '{DIFF_LABEL[difficulty]}'인 문항만 추가할 수 있습니다
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
          <Button
            size="sm"
            disabled={!name.trim()}
            onClick={() => name.trim() && onAdd(name.trim(), difficulty)}
          >
            만들기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
