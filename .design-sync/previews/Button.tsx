import { Button } from 'xn-quiz-prototype'

const row = { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } as const

export function Variants() {
  return (
    <div style={row}>
      <Button>저장</Button>
      <Button variant="outline">취소</Button>
      <Button variant="secondary">미리보기</Button>
      <Button variant="soft">문항 추가</Button>
      <Button variant="ghost">더보기</Button>
      <Button variant="destructive">삭제</Button>
      <Button variant="link">도움말</Button>
    </div>
  )
}

export function Sizes() {
  return (
    <div style={row}>
      <Button size="sm">작게</Button>
      <Button size="default">기본</Button>
      <Button size="lg">크게</Button>
    </div>
  )
}

export function States() {
  return (
    <div style={row}>
      <Button>채점 시작</Button>
      <Button disabled>채점 시작</Button>
      <Button variant="outline" disabled>취소</Button>
    </div>
  )
}
