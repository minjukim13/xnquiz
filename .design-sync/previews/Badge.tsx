import { Badge } from 'xn-quiz-prototype'

const row = { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } as const

export function Variants() {
  return (
    <div style={row}>
      <Badge>진행중</Badge>
      <Badge variant="secondary">마감</Badge>
      <Badge variant="destructive">채점 오류</Badge>
      <Badge variant="soft">재응시 허용</Badge>
      <Badge variant="outline">임시저장</Badge>
      <Badge variant="ghost">미배정</Badge>
    </div>
  )
}

export function Counts() {
  return (
    <div style={row}>
      <Badge>응시 32명</Badge>
      <Badge variant="soft">문항 24개</Badge>
      <Badge variant="secondary">3주차</Badge>
      <Badge variant="destructive">미채점 5건</Badge>
    </div>
  )
}

export function Link() {
  return (
    <div style={row}>
      <Badge variant="link">채점 대시보드 열기</Badge>
      <Badge variant="link">문제은행 보기</Badge>
    </div>
  )
}
