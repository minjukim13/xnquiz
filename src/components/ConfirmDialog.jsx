import { useState, useEffect } from 'react'
import {
  AlertDialog as ShadcnAlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AlertCircle, X } from 'lucide-react'

// ── Shared ──────────────────────────────────────────────────────────────────

function DialogIcon() {
  return (
    <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-primary">
      <AlertCircle className="size-[18px]" />
    </div>
  )
}

function parseMessage(message) {
  if (!message) return { isList: false, lines: [], text: '' }
  const lines = message.split('\n').filter(l => l.trim())
  const isList = lines.length > 0 && lines.every(l => l.trimStart().startsWith('- '))
  return { isList, lines, text: message }
}

// ── Confirm ─────────────────────────────────────────────────────────────────
export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = '확인',
  cancelLabel = '취소',
  confirmDanger = false,
}) {
  return (
    <ShadcnAlertDialog open onOpenChange={(open) => { if (!open) onCancel?.() }}>
      <AlertDialogContent className="max-w-sm rounded-2xl gap-5">
        <div>
          <div className="flex items-center gap-2.5">
            <DialogIcon />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          {message && (
            <AlertDialogDescription asChild>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {message}
              </p>
            </AlertDialogDescription>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            variant={confirmDanger ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </ShadcnAlertDialog>
  )
}

// ── Case 1: Alert (Modal) ───────────────────────────────────────────────────
export function AlertDialog({
  title,
  message,
  onClose,
  closeLabel = '확인',
  variant,
}) {
  const { isList, lines, text } = parseMessage(message)

  return (
    <ShadcnAlertDialog open onOpenChange={(open) => { if (!open) onClose?.() }}>
      <AlertDialogContent className="max-w-sm rounded-2xl gap-5">
        <div>
          <div className="flex items-center gap-2.5">
            <DialogIcon />
            <div>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              {isList && (
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  아래 항목을 확인해주세요
                </p>
              )}
            </div>
          </div>

          {message && (
            <AlertDialogDescription asChild>
              <div className="mt-4">
                {isList ? (
                  <div className="rounded-[10px] bg-[#F2F8FF] border border-[#D1E8FF] px-4 py-3.5 space-y-2.5">
                    {lines.map((line, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary" />
                        <span className="text-[13px] text-secondary-foreground">
                          {line.replace(/^\s*-\s*/, '')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                    {text}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>{closeLabel}</Button>
        </div>
      </AlertDialogContent>
    </ShadcnAlertDialog>
  )
}

// ── Case 2: InlineAlert (Toast/Banner) ──────────────────────────────────────
export function InlineAlert({
  message,
  onClose,
  duration = 0,
}) {
  const [phase, setPhase] = useState('entering')

  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase('visible'))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (phase === 'leaving') {
      const timer = setTimeout(() => onClose?.(), 200)
      return () => clearTimeout(timer)
    }
  }, [phase, onClose])

  useEffect(() => {
    if (duration > 0 && phase === 'visible') {
      const timer = setTimeout(() => setPhase('leaving'), duration)
      return () => clearTimeout(timer)
    }
  }, [duration, phase])

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-3 rounded-[10px] border-l-[3px] border-l-primary bg-accent px-4 py-3 transition-all duration-200 ease-out',
        phase === 'visible'
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-2',
      )}
    >
      <AlertCircle className="size-4 shrink-0 text-primary" />
      <span className="flex-1 text-sm font-medium text-foreground">{message}</span>
      {onClose && (
        <button
          onClick={() => setPhase('leaving')}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="닫기"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}
