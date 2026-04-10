import {
  AlertDialog as ShadcnAlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmDanger ? 'destructive' : 'default'}
            onClick={onConfirm}
            className={cn(!confirmDanger && 'bg-indigo-600 hover:bg-indigo-700')}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </ShadcnAlertDialog>
  )
}

// ── Alert ────────────────────────────────────────────────────────────────────
export function AlertDialog({
  title,
  message,
  onClose,
  closeLabel = '확인',
  variant = 'info',
}) {
  const icons = {
    info: { icon: 'ℹ', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    warning: { icon: '⚠', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    error: { icon: '✕', className: 'bg-red-50 text-red-700 border-red-200' },
  }
  const c = icons[variant] ?? icons.info

  return (
    <ShadcnAlertDialog open onOpenChange={(open) => { if (!open) onClose?.() }}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <span className={cn('shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border', c.className)}>
              {c.icon}
            </span>
            <AlertDialogTitle className="pt-1">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="whitespace-pre-line">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700">
            {closeLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </ShadcnAlertDialog>
  )
}
