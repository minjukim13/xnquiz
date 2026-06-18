import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
  Button,
} from 'xn-quiz-prototype'

export function Settings() {
  return (
    <Sheet open>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>퀴즈 설정</SheetTitle>
          <SheetDescription>응시 정책과 채점 방식을 설정합니다.</SheetDescription>
        </SheetHeader>
        <div style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14, color: 'var(--secondary-foreground)' }}>
          <div>제한 시간: 30분</div>
          <div>재응시: 1회 허용</div>
          <div>정답 공개: 마감 후</div>
          <div>문항 순서: 무작위</div>
        </div>
        <SheetFooter>
          <Button>저장</Button>
          <Button variant="outline">취소</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
