import {
  Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter,
  Button, Badge,
} from 'xn-quiz-prototype'

export function Basic() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Card>
        <CardHeader>
          <CardTitle>중간고사 퀴즈</CardTitle>
          <CardDescription>객관식 10문항 · 제한시간 30분</CardDescription>
        </CardHeader>
        <CardContent>
          <p style={{ color: 'var(--secondary-foreground)', lineHeight: 1.6 }}>
            응시 기간은 6월 20일 09:00부터 18:00까지입니다. 마감 후에는 자동으로 제출됩니다.
          </p>
        </CardContent>
        <CardFooter>
          <Button size="sm">응시 시작</Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export function WithAction() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Card>
        <CardHeader>
          <CardTitle>3주차 쪽지시험</CardTitle>
          <CardDescription>23명 응시 · 평균 82점</CardDescription>
          <CardAction>
            <Badge>진행중</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p style={{ color: 'var(--secondary-foreground)', lineHeight: 1.6 }}>
            채점이 완료된 응시자는 결과를 바로 확인할 수 있습니다. 남은 응시자는 12명입니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function Compact() {
  return (
    <div style={{ maxWidth: 320 }}>
      <Card size="sm">
        <CardHeader>
          <CardTitle>제출 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <p style={{ color: 'var(--secondary-foreground)' }}>제출 35 · 미제출 10</p>
        </CardContent>
      </Card>
    </div>
  )
}
