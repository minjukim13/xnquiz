import { Skeleton } from 'xn-quiz-prototype'

export function QuizCard() {
  return (
    <div
      style={{
        maxWidth: 360,
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 20,
        background: 'var(--card)',
      }}
    >
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-56" style={{ marginTop: 12 }} />
      <Skeleton className="h-4 w-48" style={{ marginTop: 8 }} />
      <Skeleton className="h-9 w-24" style={{ marginTop: 20, borderRadius: 8 }} />
    </div>
  )
}

export function ListRows() {
  return (
    <div style={{ maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton className="h-10 w-10" style={{ borderRadius: 9999 }} />
          <div style={{ flex: 1 }}>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" style={{ marginTop: 8 }} />
          </div>
          <Skeleton className="h-6 w-12" />
        </div>
      ))}
    </div>
  )
}
