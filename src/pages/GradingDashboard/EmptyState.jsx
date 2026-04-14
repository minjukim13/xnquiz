import { FileText } from 'lucide-react'

export default function EmptyState({ message }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-white border border-border rounded-xl min-h-[300px]">
      <div className="text-center px-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <FileText size={22} className="text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
      </div>
    </div>
  )
}
