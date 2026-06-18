import { StatusBadge } from 'xn-quiz-prototype'

const row = { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } as const

export function Statuses() {
  return (
    <div style={row}>
      <StatusBadge status="open" />
      <StatusBadge status="grading" />
      <StatusBadge status="closed" />
      <StatusBadge status="draft" />
      <StatusBadge status="scheduled" />
    </div>
  )
}

export function WithoutDot() {
  return (
    <div style={row}>
      <StatusBadge status="open" showDot={false} />
      <StatusBadge status="grading" showDot={false} />
      <StatusBadge status="closed" showDot={false} />
      <StatusBadge status="draft" showDot={false} />
      <StatusBadge status="scheduled" showDot={false} />
    </div>
  )
}
