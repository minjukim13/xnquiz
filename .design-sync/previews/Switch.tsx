import { Switch } from 'xn-quiz-prototype'

const rowItem = { display: 'flex', alignItems: 'center', gap: 8 } as const
const column = { display: 'flex', flexDirection: 'column', gap: 12 } as const
const label = { fontSize: 14, color: '#191F28' } as const

export function OnOff() {
  return (
    <div style={column}>
      <div style={rowItem}>
        <Switch defaultChecked id="reveal" />
        <span style={label}>정답 즉시 공개</span>
      </div>
      <div style={rowItem}>
        <Switch id="retake" />
        <span style={label}>재응시 허용</span>
      </div>
    </div>
  )
}

export function Disabled() {
  return (
    <div style={column}>
      <div style={rowItem}>
        <Switch defaultChecked disabled id="shuffle" />
        <span style={{ ...label, color: '#8B95A1' }}>문항 순서 섞기 (잠금)</span>
      </div>
      <div style={rowItem}>
        <Switch disabled id="late" />
        <span style={{ ...label, color: '#8B95A1' }}>지각 제출 허용 (잠금)</span>
      </div>
    </div>
  )
}

export function Sizes() {
  return (
    <div style={column}>
      <div style={rowItem}>
        <Switch size="sm" defaultChecked id="sm-toggle" />
        <span style={label}>자동 채점 (작게)</span>
      </div>
      <div style={rowItem}>
        <Switch size="default" defaultChecked id="lg-toggle" />
        <span style={label}>점수 공개 (기본)</span>
      </div>
    </div>
  )
}
