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


function CloseButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="닫기"
      className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <X className="size-4" />
    </button>
  )
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
      <AlertDialogContent className="w-[340px] max-w-[340px] rounded-2xl p-6 gap-0 [word-break:keep-all] sm:max-w-[340px]">
        <CloseButton onClick={onCancel} />

        <div className="flex flex-col items-center text-center">
          <DialogIcon tone={confirmDanger ? 'destructive' : 'info'} />
          <AlertDialogTitle className="mt-3 text-[16px] font-semibold text-foreground leading-[1.4]">
            {title}
          </AlertDialogTitle>
          {message && (
            <AlertDialogDescription asChild>
              <p className="mt-1.5 text-[13px] leading-[1.55] text-muted-foreground whitespace-pre-line">
                {message}
              </p>
            </AlertDialogDescription>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            {cancelLabel}
          </Button>
          <Button
            variant={confirmDanger ? 'destructive' : 'default'}
            onClick={onConfirm}
            className="flex-1"
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
  variant = 'info',
}) {
  const tone = variant === 'error' ? 'destructive' : 'info'

  return (
    <ShadcnAlertDialog open onOpenChange={(open) => { if (!open) onClose?.() }}>
      <AlertDialogContent className="w-[320px] max-w-[320px] rounded-2xl p-6 gap-0 sm:max-w-[320px]">
        <CloseButton onClick={onClose} />

        <div className="flex flex-col items-center text-center">
          <DialogIcon tone={tone} />
          <AlertDialogTitle className="mt-3 text-[16px] font-semibold text-foreground leading-[1.4]">
            {title}
          </AlertDialogTitle>
          {message && (
            <AlertDialogDescription asChild>
              <p className="mt-1.5 text-[13px] leading-[1.55] text-muted-foreground whitespace-pre-line">
                {message}
              </p>
            </AlertDialogDescription>
          )}
        </div>

        <Button onClick={onClose} className="mt-5 w-full">{closeLabel}</Button>
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
