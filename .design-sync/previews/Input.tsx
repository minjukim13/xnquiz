import { Input } from 'xn-quiz-prototype'

export function Default() {
  return (
    <div style={{ maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Input placeholder="퀴즈 제목을 입력하세요" />
      <Input defaultValue="중간고사 대비 퀴즈" />
    </div>
  )
}

export function Disabled() {
  return (
    <div style={{ maxWidth: 280 }}>
      <Input defaultValue="마감된 퀴즈" disabled />
    </div>
  )
}

export function Invalid() {
  return (
    <div style={{ maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Input defaultValue="" placeholder="필수 입력 항목" aria-invalid={true} />
      <span style={{ fontSize: 12, color: 'var(--destructive)' }}>제목을 입력해 주세요.</span>
    </div>
  )
}
