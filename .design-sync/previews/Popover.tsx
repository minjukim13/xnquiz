import {
  Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription,
  Button,
} from 'xn-quiz-prototype'

export function Open() {
  return (
    <Popover open>
      <PopoverTrigger asChild>
        <Button variant="outline">응시 상태 필터</Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <PopoverHeader>
          <PopoverTitle>응시 상태</PopoverTitle>
          <PopoverDescription>표시할 응시 상태를 선택하세요.</PopoverDescription>
        </PopoverHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, fontSize: 13, color: 'var(--secondary-foreground)' }}>
          <span>진행중 (23)</span>
          <span>채점중 (8)</span>
          <span>마감 (14)</span>
        </div>
      </PopoverContent>
    </Popover>
  )
}
