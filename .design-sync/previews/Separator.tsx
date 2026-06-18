import { Separator } from 'xn-quiz-prototype'

export function Horizontal() {
  return (
    <div style={{ maxWidth: 360 }}>
      <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>중간고사 퀴즈</div>
      <div style={{ color: 'var(--muted-foreground)', fontSize: 13, marginTop: 2 }}>
        객관식 10문항 · 제한시간 30분
      </div>
      <Separator className="my-4" />
      <p style={{ color: 'var(--secondary-foreground)', lineHeight: 1.6, margin: 0 }}>
        응시 기간은 6월 20일 09:00부터 18:00까지이며, 마감 후 자동 제출됩니다.
      </p>
    </div>
  )
}

export function Vertical() {
  return (
    <div style={{ maxWidth: 360 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          height: 24,
          color: 'var(--secondary-foreground)',
          fontSize: 14,
        }}
      >
        <span>응시 45명</span>
        <Separator orientation="vertical" />
        <span>평균 82점</span>
        <Separator orientation="vertical" />
        <span>미채점 3건</span>
      </div>
    </div>
  )
}
