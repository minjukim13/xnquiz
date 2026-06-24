import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export default function AddBankModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [tags, setTags] = useState([])
  const [tagDraft, setTagDraft] = useState('')

  const addTag = () => {
    const t = tagDraft.trim()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagDraft('')
  }

  const diffOptions = [
    { value: '', label: '미설정' },
    { value: 'high', label: '상' },
    { value: 'medium', label: '중' },
    { value: 'low', label: '하' },
  ]

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 문제은행 만들기</DialogTitle>
        </DialogHeader>
        <div>
          <label className="text-xs font-medium block mb-1.5 text-slate-500">이름</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onAdd(name.trim(), difficulty, tags)}
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
          <p className="text-xs mt-3 text-muted-foreground">
            그룹 난이도는 문항 난이도와 독립적인 관리값입니다. 그룹에 어떤 난이도의 문항이든 추가할 수 있습니다.
          </p>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5 text-slate-500">태그 (선택)</label>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-accent text-accent-foreground">
                  {t}
                  <button type="button" onClick={() => setTags(tags.filter(x => x !== t))} className="hover:text-destructive">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            type="text"
            value={tagDraft}
            onChange={e => setTagDraft(e.target.value)}
            onKeyDown={e => { if ((e.key === 'Enter' || e.key === ',') && tagDraft.trim()) { e.preventDefault(); addTag() } }}
            placeholder="키워드 입력 후 Enter (예: 기말고사, SQL)"
            className="w-full text-[15px] px-3 py-2 border border-slate-200 rounded focus:outline-none focus:border-blue-400 text-slate-900"
          />
          <p className="text-xs mt-1.5 text-muted-foreground">여러 과목에 쌓인 문제은행을 빠르게 찾도록 분류 키워드를 답니다.</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
          <Button
            size="sm"
            disabled={!name.trim()}
            onClick={() => name.trim() && onAdd(name.trim(), difficulty, tags)}
          >
            만들기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
