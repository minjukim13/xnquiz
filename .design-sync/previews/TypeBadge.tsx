import { TypeBadge } from 'xn-quiz-prototype'

const row = { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } as const

export function Types() {
  return (
    <div style={row}>
      <TypeBadge type="multiple_choice" />
      <TypeBadge type="true_false" />
      <TypeBadge type="multiple_answers" />
      <TypeBadge type="short_answer" />
      <TypeBadge type="essay" />
      <TypeBadge type="numerical" />
    </div>
  )
}

export function MoreTypes() {
  return (
    <div style={row}>
      <TypeBadge type="formula" />
      <TypeBadge type="matching" />
      <TypeBadge type="fill_in_multiple_blanks" />
      <TypeBadge type="multiple_dropdowns" />
      <TypeBadge type="file_upload" />
      <TypeBadge type="text" />
    </div>
  )
}

export function Small() {
  return (
    <div style={row}>
      <TypeBadge type="multiple_choice" small />
      <TypeBadge type="essay" small />
      <TypeBadge type="numerical" small />
      <TypeBadge type="matching" small />
    </div>
  )
}
