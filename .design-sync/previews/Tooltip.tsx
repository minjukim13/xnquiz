import {
  TooltipProvider, Tooltip, TooltipTrigger, TooltipContent,
  Button,
} from 'xn-quiz-prototype'

export function Open() {
  return (
    <TooltipProvider>
      <Tooltip open>
        <TooltipTrigger asChild>
          <Button variant="outline">채점 기준</Button>
        </TooltipTrigger>
        <TooltipContent>채점 기준을 변경하면 기존 응시도 재채점됩니다.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
