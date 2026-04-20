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

function DialogIcon({ tone = 'info' }) {
  const isDestructive = tone === 'destructive'
  return (
    <div
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full',
        isDestructive ? 'bg-destructive-soft' : 'bg-accent',
      )}
    >
      <AlertCircle
        className={cn('size-4', isDestructive ? 'text-destructive' : 'text-primary')}
      />
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
      <AlertDialogContent
        className="w-[400px] max-w-[400px] rounded-2xl px-7 py-8 gap-6 [word-break:keep-all] sm:max-w-[400px]"
      >
        <div>
          <div className="flex items-center gap-3">
            <DialogIcon tone={confirmDanger ? 'destructive' : 'info'} />
            <AlertDialogTitle className="text-[17px] font-semibold text-foreground">{title}</AlertDialogTitle>
          </div>
          {message && (
            <AlertDialogDescription asChild>
              <p className="mt-2 text-[14px] leading-[1.6] text-secondary-foreground whitespace-pre-line">
                {message}
              </p>
            </AlertDialogDescription>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-secondary px-5 py-2.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-border"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors',
              confirmDanger
                ? 'bg-destructive hover:bg-destructive-hover'
                : 'bg-primary hover:bg-primary-hover',
            )}
          >
            {confirmLabel}
          </button>
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
  variant = 'info',
}) {
  const { isList, lines, text } = parseMessage(message)
  const tone = variant === 'error' ? 'destructive' : 'info'

  return (
    <ShadcnAlertDialog open onOpenChange={(open) => { if (!open) onClose?.() }}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <div>
          <div className="flex items-start gap-2">
            <DialogIcon tone={tone} />
            <div>
              <AlertDialogTitle className="text-[17px] font-semibold leading-[1.45]">{title}</AlertDialogTitle>
              {isList && (
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  아래 항목을 확인해주세요
                </p>
              )}
            </div>
          </div>

          {message && (
            <AlertDialogDescription asChild>
              <div className="mt-2 pl-6">
                {isList ? (
                  <div className="rounded-[10px] bg-accent border border-primary/15 px-4 py-3.5 space-y-2.5">
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
                  <p className="text-[13px] leading-[1.6] text-muted-foreground whitespace-pre-line">
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
