import { Card, CardContent } from '@/components/ui/card'

export function Section({ title, right, children }) {
  return (
    <Card className="border-slate-300">
      <CardContent className="px-5 py-3 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h2 className="text-sm font-semibold">{title}</h2>
          {right}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}
