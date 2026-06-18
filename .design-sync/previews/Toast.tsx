import { Toast } from 'xn-quiz-prototype'

// Toast is position:fixed (bottom-right of the viewport). A transformed wrapper
// becomes the containing block for the fixed child, so it renders inside the
// card instead of escaping off-screen.
const frame = { position: 'relative', transform: 'translateZ(0)', width: '100%', height: 120 } as const

export function Saved() {
  return (
    <div style={frame}>
      <Toast message="퀴즈가 저장되었습니다." />
    </div>
  )
}

export function WithAction() {
  return (
    <div style={frame}>
      <Toast message="채점이 완료되었습니다." action={{ label: '결과 보기', onClick: () => {} }} />
    </div>
  )
}
