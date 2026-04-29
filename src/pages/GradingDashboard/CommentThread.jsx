import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { getCommentThread, appendCommentMessage, markCommentThreadRead } from './utils'

function formatStamp(iso) {
  if (!iso) return ''
  // 마이그레이션 표시 메시지 (epoch 0) 는 시간 숨김
  const t = new Date(iso).getTime()
  if (t <= 0) return '이전 코멘트'
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  return sameDay
    ? d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    : d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}

function MessageBubble({ message, isOwn }) {
  const senderLabel = message.sender === 'professor' ? '교수자' : '학생'
  return (
    <div className={cn('flex flex-col mb-2', isOwn ? 'items-end' : 'items-start')}>
      {!isOwn && (
        <span className="text-[11px] text-muted-foreground mb-0.5 px-1">{senderLabel}</span>
      )}
      <div className={cn(
        'max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed',
        isOwn ? 'bg-primary text-white rounded-br-sm' : 'bg-slate-100 text-foreground rounded-bl-sm'
      )}>
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
      </div>
      <span className="text-[10px] text-muted-foreground mt-0.5 px-1 tabular-nums">{formatStamp(message.createdAt)}</span>
    </div>
  )
}

// role: 'professor' | 'student' — 발신자(=본인)
// readOnly: true 면 입력창 숨김 (예: 교수자가 학생 thread 를 미리보기 모드로 볼 때)
export default function CommentThread({ quizId, studentId, role, readOnly = false, className, onChanged }) {
  const ownSender = role === 'professor' ? 'professor' : 'student'
  const [thread, setThread] = useState(() => getCommentThread(quizId, studentId))
  const [draft, setDraft] = useState('')
  const scrollRef = useRef(null)

  // 학생/퀴즈 전환 시 thread 재로드 + 읽음 처리
  useEffect(() => {
    const t = getCommentThread(quizId, studentId)
    /* eslint-disable react-hooks/set-state-in-effect -- reload on entity switch */
    setThread(t)
    setDraft('')
    /* eslint-enable react-hooks/set-state-in-effect */
    markCommentThreadRead(quizId, studentId, ownSender)
  }, [quizId, studentId, ownSender])

  // 메시지 추가/변경 시 하단 스크롤
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [thread.messages.length])

  const handleSend = useCallback(() => {
    const text = draft.trim()
    if (!text) return
    const msg = appendCommentMessage(quizId, studentId, ownSender, text)
    if (!msg) return
    setThread(prev => ({ ...prev, messages: [...prev.messages, msg] }))
    setDraft('')
    onChanged?.()
  }, [draft, quizId, studentId, ownSender, onChanged])

  const handleKeyDown = (e) => {
    // Enter = 전송 / Shift+Enter = 줄바꿈
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isEmpty = thread.messages.length === 0

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 bg-slate-50/40">
        {isEmpty ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-muted-foreground">아직 코멘트가 없습니다</p>
          </div>
        ) : (
          thread.messages.map(m => (
            <MessageBubble key={m.id} message={m} isOwn={m.sender === ownSender} />
          ))
        )}
      </div>

      {!readOnly && (
        <div className="border-t border-slate-100 p-3 bg-white flex items-stretch gap-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={role === 'professor' ? '학생에게 전달할 코멘트' : '교수자에게 답변하기'}
            rows={2}
            className="flex-1 text-[13px] resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-200 text-foreground placeholder:text-muted-foreground leading-relaxed"
          />
          <Button size="sm" onClick={handleSend} disabled={!draft.trim()} className="shrink-0 h-auto w-24 text-sm">
            <Send size={14} />
            전송
          </Button>
        </div>
      )}
    </div>
  )
}
