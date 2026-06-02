import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'

export function Toggle({ checked, onChange, label, description, disabled = false }) {
  return (
    <label className={cn('flex items-start gap-3', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} className="mt-0.5 data-[state=checked]:bg-primary" />
      <div>
        <p className="text-sm font-medium text-secondary-foreground">{label}</p>
        {description && <p className="text-xs mt-0.5 text-muted-foreground">{description}</p>}
      </div>
    </label>
  )
}
