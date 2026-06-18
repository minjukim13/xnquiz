import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuItem, DropdownMenuSeparator,
  Button,
} from 'xn-quiz-prototype'

export function Menu() {
  return (
    <DropdownMenu open>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">퀴즈 관리</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>퀴즈 작업</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>편집</DropdownMenuItem>
        <DropdownMenuItem>복제</DropdownMenuItem>
        <DropdownMenuItem>응시 현황 보기</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>삭제</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
