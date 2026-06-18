import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Button,
} from 'xn-quiz-prototype'

export function Confirm() {
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>퀴즈를 삭제할까요?</DialogTitle>
          <DialogDescription>
            삭제한 퀴즈는 복구할 수 없습니다. 응시 기록과 채점 결과도 함께 삭제됩니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">취소</Button>
          <Button variant="destructive">삭제</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
