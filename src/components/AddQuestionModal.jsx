import { useState } from 'react'
import { X, Plus, Trash2, CircleDot, ToggleLeft, ListChecks, PenLine, AlignLeft, Hash, ArrowLeftRight, AlignJustify, ChevronDown, Paperclip, Sigma, Type, AlertTriangle } from 'lucide-react'
import { QUIZ_TYPES } from '../data/mockData'
import { DropdownSelect } from './DropdownSelect'

// ── 유형별 아이콘 + 설명 메타 ──────────────────────────────────────────────
const TYPE_META = {
  multiple_choice:          { Icon: CircleDot,      desc: '보기 중 1개 선택',           color: '#6366f1', bg: '#EEF2FF' },
  true_false:               { Icon: ToggleLeft,      desc: '참 또는 거짓 선택',           color: '#059669', bg: '#ECFDF5' },
  multiple_answers:         { Icon: ListChecks,      desc: '보기 여러 개 동시 선택',       color: '#3B82F6', bg: '#EFF6FF' },
  short_answer:             { Icon: PenLine,         desc: '짧은 텍스트로 답변',           color: '#F59E0B', bg: '#FFFBEB' },
  essay:                    { Icon: AlignLeft,       desc: '자유롭게 서술',               color: '#EF4444', bg: '#FEF2F2' },
  numerical:                { Icon: Hash,            desc: '숫자 정답 + 허용 오차 설정',   color: '#8B5CF6', bg: '#F5F3FF' },
  formula:                  { Icon: Sigma,           desc: '변수로 학생마다 다른 답 생성', color: '#0D9488', bg: '#F0FDFA' },
  matching:                 { Icon: ArrowLeftRight,  desc: '왼쪽-오른쪽 항목 연결',       color: '#0891B2', bg: '#ECFEFF' },
  fill_in_multiple_blanks:  { Icon: AlignJustify,   desc: '여러 빈칸 순서대로 채우기',    color: '#EA580C', bg: '#FFF7ED' },
  multiple_dropdowns:       { Icon: ChevronDown,     desc: '드롭다운에서 항목 선택',       color: '#4F46E5', bg: '#EEF2FF' },
  file_upload:              { Icon: Paperclip,       desc: '파일 업로드로 제출',           color: '#64748B', bg: '#F8FAFC' },
  text:                     { Icon: Type,            desc: '채점 없는 안내문 삽입',        color: '#9E9E9E', bg: '#F5F5F5' },
}

// ── 유형별 미리보기 ────────────────────────────────────────────────────────
function TypePreview({ type }) {
  if (!type) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: '#BDBDBD' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#F5F5F5' }}>
          <span style={{ fontSize: 16 }}>?</span>
        </div>
        <p className="text-xs text-center leading-relaxed">유형에 마우스를 올리면<br />예시 문항이 표시됩니다</p>
      </div>
    )
  }

  const previewMap = {
    multiple_choice: (
      <>
        <p className="text-xs font-semibold mb-2" style={{ color: '#424242' }}>Q. 다음 중 소수(prime number)는?</p>
        {[['① 1', false], ['② 2', true], ['③ 4', false], ['④ 6', false]].map(([opt, correct], i) => (
          <div key={i} className="flex items-center gap-1.5 py-0.5">
            <div className="w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center"
              style={{ borderColor: correct ? '#6366f1' : '#D1D5DB', background: correct ? '#6366f1' : '#fff' }}>
              {correct && <div className="w-1 h-1 rounded-full bg-white" />}
            </div>
            <span className="text-xs" style={{ color: correct ? '#4338ca' : '#616161', fontWeight: correct ? 500 : 400 }}>{opt}</span>
          </div>
        ))}
        <p className="text-xs mt-2" style={{ color: '#9E9E9E' }}>보기 중 1개 선택, 자동채점</p>
      </>
    ),
    true_false: (
      <>
        <p className="text-xs font-semibold mb-2" style={{ color: '#424242' }}>Q. 지구는 태양 주위를 공전한다.</p>
        <div className="flex gap-2 mb-2">
          {['참 (True)', '거짓 (False)'].map((label, i) => (
            <div key={i} className="flex-1 text-center py-1.5 rounded text-xs font-medium"
              style={{ background: i === 0 ? '#EEF2FF' : '#F5F5F5', border: `1px solid ${i === 0 ? '#6366f1' : '#E0E0E0'}`, color: i === 0 ? '#4338ca' : '#616161' }}>
              {label}
            </div>
          ))}
        </div>
        <p className="text-xs" style={{ color: '#9E9E9E' }}>참/거짓 중 1개 선택, 자동채점</p>
      </>
    ),
    multiple_answers: (
      <>
        <p className="text-xs font-semibold mb-2" style={{ color: '#424242' }}>Q. 다음 중 포유류를 모두 고르시오.</p>
        {[['고래', true], ['상어', false], ['박쥐', true], ['개구리', false]].map(([opt, correct], i) => (
          <div key={i} className="flex items-center gap-1.5 py-0.5">
            <div className="w-3 h-3 rounded flex-shrink-0 flex items-center justify-center"
              style={{ background: correct ? '#6366f1' : '#fff', border: `1px solid ${correct ? '#6366f1' : '#D1D5DB'}` }}>
              {correct && <span style={{ color: '#fff', fontSize: 8 }}>✓</span>}
            </div>
            <span className="text-xs" style={{ color: correct ? '#4338ca' : '#616161' }}>{opt}</span>
          </div>
        ))}
        <p className="text-xs mt-2" style={{ color: '#9E9E9E' }}>여러 개 선택 가능, 자동채점</p>
      </>
    ),
    short_answer: (
      <>
        <p className="text-xs font-semibold mb-2" style={{ color: '#424242' }}>Q. 대한민국의 수도는?</p>
        <div className="rounded px-2 py-1 text-xs mb-1" style={{ border: '1px solid #E0E0E0', color: '#9E9E9E' }}>서울 입력...</div>
        <p className="text-xs" style={{ color: '#6366f1' }}>정답: 서울, Seoul (복수 정답 가능)</p>
        <p className="text-xs mt-1" style={{ color: '#9E9E9E' }}>짧은 텍스트, 부분 자동채점</p>
      </>
    ),
    essay: (
      <>
        <p className="text-xs font-semibold mb-2" style={{ color: '#424242' }}>Q. 기후 변화의 원인과 해결 방안을 서술하시오.</p>
        <div className="rounded px-2 py-2 text-xs mb-1" style={{ border: '1px solid #E0E0E0', color: '#9E9E9E', minHeight: 36 }}>자유롭게 서술...</div>
        <p className="text-xs" style={{ color: '#9E9E9E' }}>자유 서술형, 교수자 직접 채점</p>
      </>
    ),
    numerical: (
      <>
        <p className="text-xs font-semibold mb-2" style={{ color: '#424242' }}>Q. 원주율을 소수점 2자리까지 입력하시오.</p>
        <div className="flex items-center gap-2 mb-1">
          <div className="rounded px-2 py-1 text-xs font-medium" style={{ border: '1px solid #6366f1', color: '#4338ca' }}>3.14</div>
          <span className="text-xs" style={{ color: '#9E9E9E' }}>± 0.01 허용</span>
        </div>
        <p className="text-xs" style={{ color: '#9E9E9E' }}>숫자 입력, 오차 범위 설정 가능</p>
      </>
    ),
    matching: (
      <>
        <p className="text-xs font-semibold mb-2" style={{ color: '#424242' }}>Q. 단어와 뜻을 연결하시오.</p>
        {[['사과', 'Apple'], ['바나나', 'Banana'], ['포도', 'Grape']].map(([l, r], i) => (
          <div key={i} className="flex items-center gap-1 py-0.5">
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#EEF2FF', color: '#4338ca' }}>{l}</span>
            <span className="text-xs" style={{ color: '#9E9E9E' }}>→</span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#F0FDF4', color: '#166534' }}>{r}</span>
          </div>
        ))}
        <p className="text-xs mt-1.5" style={{ color: '#9E9E9E' }}>항목 연결, 자동채점</p>
      </>
    ),
    formula: (
      <>
        <p className="text-xs font-semibold mb-2" style={{ color: '#424242' }}>Q. a개의 과일이 b개 바구니에 담겨 있을 때, 총 과일 수는?</p>
        <div className="rounded p-2 mb-2 space-y-1" style={{ background: '#F0FDFA', border: '1px solid #99F6E4' }}>
          <div className="flex gap-2 text-xs">
            <span className="font-medium" style={{ color: '#0F766E' }}>a</span>
            <span style={{ color: '#9E9E9E' }}>= 1~10 정수</span>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="font-medium" style={{ color: '#0F766E' }}>b</span>
            <span style={{ color: '#9E9E9E' }}>= 2~5 정수</span>
          </div>
          <div className="flex gap-1.5 items-center text-xs mt-1.5 pt-1.5" style={{ borderTop: '1px solid #99F6E4' }}>
            <span style={{ color: '#424242' }}>수식:</span>
            <span className="font-mono font-medium px-1.5 rounded" style={{ background: '#CCFBF1', color: '#0D9488' }}>a * b</span>
          </div>
        </div>
        <p className="text-xs" style={{ color: '#9E9E9E' }}>학생마다 a, b 값 다름 → 정답 자동계산</p>
      </>
    ),
    fill_in_multiple_blanks: (
      <>
        <p className="text-xs font-semibold mb-2" style={{ color: '#424242' }}>Q. 빈칸을 순서대로 채우세요.</p>
        <p className="text-xs leading-relaxed mb-2" style={{ color: '#424242' }}>
          <span className="px-1 py-0.5 rounded font-medium" style={{ background: '#EEF2FF', color: '#4338ca', border: '1px dashed #6366f1' }}>봄</span>
          {' '}다음은{' '}
          <span className="px-1 py-0.5 rounded font-medium" style={{ background: '#EEF2FF', color: '#4338ca', border: '1px dashed #6366f1' }}>여름</span>
          {' '}이다.
        </p>
        <p className="text-xs" style={{ color: '#9E9E9E' }}>빈칸 여러 개, 각각 채점</p>
      </>
    ),
    multiple_dropdowns: (
      <>
        <p className="text-xs font-semibold mb-2" style={{ color: '#424242' }}>Q. 알맞은 단어를 선택하세요.</p>
        <p className="text-xs leading-relaxed mb-2" style={{ color: '#424242' }}>
          계절은{' '}
          <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: '#EEF2FF', color: '#4338ca', border: '1px solid #6366f1' }}>봄 ▾</span>
          {' '}이고, 색은{' '}
          <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: '#EEF2FF', color: '#4338ca', border: '1px solid #6366f1' }}>파랑 ▾</span>
          {' '}이다.
        </p>
        <p className="text-xs" style={{ color: '#9E9E9E' }}>드롭다운 선택, 자동채점</p>
      </>
    ),
    text: (
      <>
        <div className="rounded px-3 py-2.5 mb-2 text-xs leading-relaxed" style={{ background: '#F5F5F5', color: '#424242', border: '1px solid #E0E0E0' }}>
          이번 시험은 총 10문항으로 구성되어 있습니다. 계산기 사용은 허용되지 않으며, 모든 풀이 과정을 작성해 주세요.
        </div>
        <p className="text-xs" style={{ color: '#9E9E9E' }}>채점 없음, 학생에게 안내문으로 표시</p>
      </>
    ),
    file_upload: (
      <>
        <p className="text-xs font-semibold mb-2" style={{ color: '#424242' }}>Q. 완성된 보고서를 제출하시오.</p>
        <div className="rounded px-2 py-3 text-center mb-1" style={{ border: '2px dashed #E0E0E0' }}>
          <p className="text-xs" style={{ color: '#9E9E9E' }}>파일을 드래그하거나 클릭</p>
          <p className="text-xs mt-0.5" style={{ color: '#BDBDBD' }}>PDF, DOC, DOCX, HWP</p>
        </div>
        <p className="text-xs" style={{ color: '#9E9E9E' }}>파일 업로드, 교수자 직접 채점</p>
      </>
    ),
  }

  return (
    <div>
      <p className="text-xs font-semibold mb-2.5 pb-2" style={{ color: '#6366f1', borderBottom: '1px solid #EEF2FF' }}>
        {QUIZ_TYPES[type]?.label} 예시
      </p>
      {previewMap[type] ?? <p className="text-xs" style={{ color: '#9E9E9E' }}>미리보기 없음</p>}
    </div>
  )
}

// ── 폼 초기값 ───────────────────────────────────────────────────────────────
function initForm(type) {
  const base = { text: '', points: 5, difficulty: '', groupTag: '' }
  switch (type) {
    case 'multiple_choice':         return { ...base, options: ['', '', '', ''], correctIdx: 0 }
    case 'true_false':              return { ...base, correctBool: true }
    case 'multiple_answers':        return { ...base, options: ['', '', '', ''], correctIdxs: [], scoringMode: 'all_correct' }
    case 'short_answer':            return { ...base, acceptedAnswers: [''] }
    case 'essay':                   return { ...base, rubric: '' }
    case 'numerical':               return { ...base, correctNum: '', tolerance: '0' }
    case 'formula':                 return { ...base, variables: [{ name: '', min: '1', max: '10', decimals: '0' }], formula: '', tolerance: '0' }
    case 'matching':                return { ...base, pairs: [{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }] }
    case 'fill_in_multiple_blanks': return { ...base, blanks: ['', ''] }
    case 'multiple_dropdowns':      return { ...base, dropdowns: [{ label: '', options: ['', ''], answerIdx: 0 }] }
    case 'file_upload':             return base
    case 'text':                    return { text: '', points: 0, difficulty: '', groupTag: '' }
    default:                        return base
  }
}

// ── 폼 → 문항 객체 ─────────────────────────────────────────────────────────
function buildQuestion(type, form) {
  const base = { type, text: form.text.trim(), points: Number(form.points) || 5, difficulty: form.difficulty || '', groupTag: (form.groupTag || '').trim() }
  switch (type) {
    case 'multiple_choice': {
      const filtered = form.options.filter(o => o.trim())
      return { ...base, options: filtered, choices: filtered, correctAnswer: filtered[form.correctIdx] ?? filtered[0] }
    }
    case 'true_false':              return { ...base, correctAnswer: form.correctBool ? '참' : '거짓', choices: ['참', '거짓'] }
    case 'multiple_answers': {
      const filtered = form.options.filter(o => o.trim())
      return { ...base, options: filtered, choices: filtered, correctAnswer: form.correctIdxs.map(i => filtered[i]).filter(Boolean), scoringMode: form.scoringMode ?? 'all_correct' }
    }
    case 'short_answer':            return { ...base, correctAnswer: form.acceptedAnswers.filter(a => a.trim()) }
    case 'essay':                   return { ...base, rubric: form.rubric }
    case 'numerical':               return { ...base, correctAnswer: Number(form.correctNum), tolerance: Number(form.tolerance) || 0 }
    case 'formula':                 return { ...base, variables: form.variables.filter(v => v.name.trim()), formula: form.formula.trim(), tolerance: Number(form.tolerance) || 0 }
    case 'matching':                return { ...base, pairs: form.pairs.filter(p => p.left.trim() && p.right.trim()) }
    case 'fill_in_multiple_blanks': return { ...base, correctAnswer: form.blanks.filter(b => b.trim()) }
    case 'multiple_dropdowns':      return { ...base, dropdowns: form.dropdowns }
    case 'file_upload':             return base
    case 'text':                    return { type, text: form.text.trim(), points: 0, difficulty: '', groupTag: '' }
    default:                        return base
  }
}

// ── 유효성 검사 ─────────────────────────────────────────────────────────────
function evalFormulaPreview(formula, variables) {
  try {
    const validVars = variables.filter(v => v.name.trim())
    if (!validVars.length || !formula.trim()) return null
    let expr = formula.trim()
    for (const v of validVars) {
      const mid = ((Number(v.min) || 1) + (Number(v.max) || 10)) / 2
      expr = expr.replace(new RegExp(`\\b${v.name}\\b`, 'g'), String(mid))
    }
    expr = expr.replace(/\^/g, '**')
    if (/[^0-9+\-*/().\s*]/.test(expr.replace(/\*\*/g, 'XX'))) return null
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + expr + ')')()
    return isNaN(result) || !isFinite(result) ? null : result
  } catch { return null }
}

function isValid(type, form) {
  if (type === 'text') return form.text?.trim().length > 0
  if (!form.text?.trim()) return false
  switch (type) {
    case 'multiple_choice':         return form.options.filter(o => o.trim()).length >= 2
    case 'multiple_answers':        return form.options.filter(o => o.trim()).length >= 2 && form.correctIdxs.length >= 1
    case 'short_answer':            return form.acceptedAnswers.some(a => a.trim())
    case 'numerical':               return form.correctNum !== '' && !isNaN(Number(form.correctNum))
    case 'formula': {
      const validVars = (form.variables || []).filter(v => v.name.trim())
      if (validVars.length === 0 || !form.formula?.trim()) return false
      return evalFormulaPreview(form.formula, validVars) !== null
    }
    case 'matching':                return form.pairs.filter(p => p.left.trim() && p.right.trim()).length >= 2
    case 'fill_in_multiple_blanks': return form.blanks.some(b => b.trim())
    default:                        return true
  }
}

// ── 유형별 전용 폼 ──────────────────────────────────────────────────────────
function TypeForm({ type, form, setForm }) {
  const upd = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const inputCls = 'flex-1 text-sm px-2.5 py-1.5 bg-white focus:outline-none'
  const inputStyle = { border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }
  const focusBorder = e => { e.currentTarget.style.borderColor = '#6366f1' }
  const blurBorder  = e => { e.currentTarget.style.borderColor = '#E0E0E0' }

  const TrashBtn = ({ onClick }) => (
    <button type="button" onClick={onClick} style={{ color: '#BDBDBD', flexShrink: 0 }}
      onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
      onMouseLeave={e => e.currentTarget.style.color = '#BDBDBD'}>
      <Trash2 size={13} />
    </button>
  )

  const AddBtn = ({ onClick, label }) => (
    <button type="button" onClick={onClick} className="flex items-center gap-1 text-xs" style={{ color: '#6366f1' }}>
      <Plus size={12} />{label}
    </button>
  )

  const Label = ({ children, required }) => (
    <label className="text-sm font-medium block mb-1.5" style={{ color: '#424242' }}>
      {children}{required && <span className="ml-0.5" style={{ color: '#EF2B2A' }}>*</span>}
    </label>
  )

  switch (type) {
    case 'multiple_choice':
      return (
        <div className="space-y-3">
          <Label required>보기 옵션</Label>
          <div className="space-y-2">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <button type="button" onClick={() => upd('correctIdx', i)}
                  className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                  style={{ borderColor: form.correctIdx === i ? '#6366f1' : '#BDBDBD', background: form.correctIdx === i ? '#6366f1' : '#fff' }}>
                  {form.correctIdx === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </button>
                <input type="text" value={opt} placeholder={`보기 ${i + 1}`}
                  onChange={e => { const n = [...form.options]; n[i] = e.target.value; upd('options', n) }}
                  className={inputCls} style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
                {form.options.length > 2 && (
                  <TrashBtn onClick={() => {
                    const n = form.options.filter((_, j) => j !== i)
                    upd('options', n)
                    if (form.correctIdx >= n.length) upd('correctIdx', 0)
                  }} />
                )}
              </div>
            ))}
          </div>
          {form.options.length < 6 && <AddBtn onClick={() => upd('options', [...form.options, ''])} label="보기 추가" />}
          <p className="text-xs" style={{ color: '#9E9E9E' }}>라디오 버튼을 클릭해 정답을 지정하세요</p>
        </div>
      )

    case 'true_false':
      return (
        <div>
          <Label required>정답</Label>
          <div className="flex gap-2">
            {[true, false].map(val => (
              <button key={String(val)} type="button" onClick={() => upd('correctBool', val)}
                className="flex-1 py-2 text-sm font-medium rounded transition-all"
                style={{
                  background: form.correctBool === val ? '#EEF2FF' : '#F5F5F5',
                  border: `1px solid ${form.correctBool === val ? '#6366f1' : '#E0E0E0'}`,
                  color: form.correctBool === val ? '#4338ca' : '#616161',
                }}>
                {val ? '참 (True)' : '거짓 (False)'}
              </button>
            ))}
          </div>
        </div>
      )

    case 'multiple_answers':
      return (
        <div className="space-y-3">
          <Label required>보기 옵션</Label>
          <div className="space-y-2">
            {form.options.map((opt, i) => {
              const isCorrect = form.correctIdxs.includes(i)
              return (
                <div key={i} className="flex items-center gap-2">
                  <button type="button" onClick={() => upd('correctIdxs', isCorrect ? form.correctIdxs.filter(x => x !== i) : [...form.correctIdxs, i])}
                    className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-all"
                    style={{ background: isCorrect ? '#6366f1' : '#fff', border: `1px solid ${isCorrect ? '#6366f1' : '#BDBDBD'}` }}>
                    {isCorrect && <span style={{ color: '#fff', fontSize: 9 }}>✓</span>}
                  </button>
                  <input type="text" value={opt} placeholder={`보기 ${i + 1}`}
                    onChange={e => { const n = [...form.options]; n[i] = e.target.value; upd('options', n) }}
                    className={inputCls} style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
                  {form.options.length > 2 && (
                    <TrashBtn onClick={() => {
                      const n = form.options.filter((_, j) => j !== i)
                      const nc = form.correctIdxs.filter(x => x !== i).map(x => x > i ? x - 1 : x)
                      upd('options', n); upd('correctIdxs', nc)
                    }} />
                  )}
                </div>
              )
            })}
          </div>
          {form.options.length < 8 && <AddBtn onClick={() => upd('options', [...form.options, ''])} label="보기 추가" />}
          <p className="text-xs" style={{ color: '#9E9E9E' }}>체크박스를 클릭해 정답을 복수 지정하세요</p>
        </div>
      )

    case 'short_answer':
      return (
        <div className="space-y-2">
          <Label required>허용 정답</Label>
          {form.acceptedAnswers.map((ans, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="text" value={ans}
                onChange={e => { const n = [...form.acceptedAnswers]; n[i] = e.target.value; upd('acceptedAnswers', n) }}
                placeholder={i === 0 ? '정답 입력 (예: 서울)' : '대체 정답 (예: Seoul)'}
                className={inputCls} style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
              {form.acceptedAnswers.length > 1 && <TrashBtn onClick={() => upd('acceptedAnswers', form.acceptedAnswers.filter((_, j) => j !== i))} />}
            </div>
          ))}
          {form.acceptedAnswers.length < 5 && <AddBtn onClick={() => upd('acceptedAnswers', [...form.acceptedAnswers, ''])} label="대체 정답 추가" />}
          <p className="text-xs" style={{ color: '#9E9E9E' }}>대소문자 구분 없이 채점, 복수 정답 설정 가능</p>
        </div>
      )

    case 'essay':
      return (
        <div>
          <Label>채점 루브릭 (선택)</Label>
          <textarea value={form.rubric} onChange={e => upd('rubric', e.target.value)}
            placeholder="채점 기준을 입력하세요 (학생에게는 표시되지 않음)"
            rows={3}
            className="w-full bg-white text-sm px-2.5 py-2 focus:outline-none resize-none"
            style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
            onFocus={focusBorder} onBlur={blurBorder} />
          <p className="text-xs mt-1" style={{ color: '#9E9E9E' }}>서술형은 교수자가 직접 채점합니다</p>
        </div>
      )

    case 'numerical':
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>정답 (숫자)</Label>
              <input type="number" value={form.correctNum} placeholder="예: 3.14"
                onChange={e => upd('correctNum', e.target.value)}
                className="w-full text-sm px-2.5 py-1.5 bg-white focus:outline-none"
                style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
                onFocus={focusBorder} onBlur={blurBorder} />
            </div>
            <div>
              <Label>허용 오차</Label>
              <input type="number" value={form.tolerance} placeholder="예: 0.01" min="0"
                onChange={e => upd('tolerance', e.target.value)}
                className="w-full text-sm px-2.5 py-1.5 bg-white focus:outline-none"
                style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
                onFocus={focusBorder} onBlur={blurBorder} />
            </div>
          </div>
          {form.correctNum !== '' && (
            <p className="text-xs" style={{ color: '#9E9E9E' }}>
              정답 범위: {Number(form.correctNum) - Number(form.tolerance || 0)} ~ {Number(form.correctNum) + Number(form.tolerance || 0)}
            </p>
          )}
        </div>
      )

    case 'matching':
      return (
        <div className="space-y-3">
          <Label required>연결 항목</Label>
          <div className="space-y-2">
            {form.pairs.map((pair, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={pair.left} placeholder={`왼쪽 ${i + 1}`}
                  onChange={e => { const n = [...form.pairs]; n[i] = { ...n[i], left: e.target.value }; upd('pairs', n) }}
                  className={inputCls} style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
                <span className="text-xs flex-shrink-0" style={{ color: '#9E9E9E' }}>↔</span>
                <input type="text" value={pair.right} placeholder={`오른쪽 ${i + 1}`}
                  onChange={e => { const n = [...form.pairs]; n[i] = { ...n[i], right: e.target.value }; upd('pairs', n) }}
                  className={inputCls} style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
                {form.pairs.length > 2 && <TrashBtn onClick={() => upd('pairs', form.pairs.filter((_, j) => j !== i))} />}
              </div>
            ))}
          </div>
          {form.pairs.length < 8 && <AddBtn onClick={() => upd('pairs', [...form.pairs, { left: '', right: '' }])} label="항목 추가" />}
        </div>
      )

    case 'formula': {
      const vars = (form.variables || [])
      const preview = evalFormulaPreview(form.formula, vars.filter(v => v.name.trim()))
      const exampleLabel = vars.filter(v => v.name.trim()).map(v => {
        const mid = ((Number(v.min) || 1) + (Number(v.max) || 10)) / 2
        return `${v.name}=${mid}`
      }).join(', ')
      return (
        <div className="space-y-4">
          {/* 변수 설정 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label required>변수 설정</Label>
              <span className="text-xs" style={{ color: '#9E9E9E' }}>학생마다 범위 안에서 무작위 값 부여</span>
            </div>
            <div className="grid gap-1 mb-1 px-0.5" style={{ gridTemplateColumns: '2.5rem 1fr auto 1fr 2.5rem 1.5rem' }}>
              {['변수명', '최솟값', '', '최댓값', '소수점', ''].map((h, i) => (
                <span key={i} className="text-xs" style={{ color: '#9E9E9E' }}>{h}</span>
              ))}
            </div>
            <div className="space-y-1.5">
              {vars.map((v, i) => (
                <div key={i} className="grid items-center gap-1.5" style={{ gridTemplateColumns: '2.5rem 1fr auto 1fr 2.5rem 1.5rem' }}>
                  <input type="text" value={v.name} placeholder="a"
                    maxLength={4}
                    onChange={e => { const n = [...vars]; n[i] = { ...n[i], name: e.target.value }; upd('variables', n) }}
                    className="text-sm px-2 py-1.5 bg-white font-mono text-center focus:outline-none"
                    style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#0D9488' }}
                    onFocus={focusBorder} onBlur={blurBorder} />
                  <input type="number" value={v.min} placeholder="1"
                    onChange={e => { const n = [...vars]; n[i] = { ...n[i], min: e.target.value }; upd('variables', n) }}
                    className="text-sm px-2 py-1.5 bg-white text-center focus:outline-none"
                    style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
                    onFocus={focusBorder} onBlur={blurBorder} />
                  <span className="text-xs text-center" style={{ color: '#9E9E9E' }}>~</span>
                  <input type="number" value={v.max} placeholder="10"
                    onChange={e => { const n = [...vars]; n[i] = { ...n[i], max: e.target.value }; upd('variables', n) }}
                    className="text-sm px-2 py-1.5 bg-white text-center focus:outline-none"
                    style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
                    onFocus={focusBorder} onBlur={blurBorder} />
                  <input type="number" value={v.decimals} placeholder="0" min="0" max="4"
                    onChange={e => { const n = [...vars]; n[i] = { ...n[i], decimals: e.target.value }; upd('variables', n) }}
                    className="text-sm px-2 py-1.5 bg-white text-center focus:outline-none"
                    style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
                    onFocus={focusBorder} onBlur={blurBorder} />
                  {vars.length > 1
                    ? <TrashBtn onClick={() => upd('variables', vars.filter((_, j) => j !== i))} />
                    : <span />}
                </div>
              ))}
            </div>
            {vars.length < 4 && (
              <AddBtn onClick={() => upd('variables', [...vars, { name: '', min: '1', max: '10', decimals: '0' }])} label="변수 추가" />
            )}
          </div>

          {/* 수식 입력 */}
          <div>
            <Label required>수식</Label>
            <p className="text-xs mb-1.5" style={{ color: '#9E9E9E' }}>위에서 정의한 변수명을 그대로 입력하세요. 사칙연산(+, -, *, /) 및 ^(거듭제곱) 사용 가능</p>
            <input type="text" value={form.formula} placeholder="예: a * b + 10"
              onChange={e => upd('formula', e.target.value)}
              className="w-full text-sm px-2.5 py-1.5 bg-white font-mono focus:outline-none"
              style={{ border: `1px solid ${form.formula && preview === null ? '#EF4444' : '#E0E0E0'}`, borderRadius: 4, color: '#222222' }}
              onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
              onBlur={e => e.currentTarget.style.borderColor = (form.formula && preview === null) ? '#EF4444' : '#E0E0E0'} />
            {form.formula && preview !== null && exampleLabel && (
              <div className="mt-1.5 px-2.5 py-1.5 rounded text-xs flex items-center gap-1.5" style={{ background: '#F0FDFA', border: '1px solid #99F6E4' }}>
                <span style={{ color: '#0F766E' }}>예시 ({exampleLabel})</span>
                <span style={{ color: '#9E9E9E' }}>→</span>
                <span className="font-medium font-mono" style={{ color: '#0D9488' }}>정답 = {Number(preview.toFixed(6))}</span>
              </div>
            )}
            {form.formula && preview === null && (
              <p className="mt-1 text-xs" style={{ color: '#EF4444' }}>수식을 확인해 주세요 (변수명 오타, 잘못된 기호 등)</p>
            )}
          </div>

          {/* 허용 오차 */}
          <div>
            <Label>허용 오차</Label>
            <div className="flex items-center gap-2">
              <input type="number" value={form.tolerance} min="0" placeholder="0"
                onChange={e => upd('tolerance', e.target.value)}
                className="w-28 text-sm px-2.5 py-1.5 bg-white focus:outline-none"
                style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
                onFocus={focusBorder} onBlur={blurBorder} />
              <span className="text-xs" style={{ color: '#9E9E9E' }}>계산 결과 ± 이 값 범위 내면 정답 처리 (0 = 완전 일치)</span>
            </div>
          </div>
        </div>
      )
    }

    case 'fill_in_multiple_blanks':
      return (
        <div className="space-y-2">
          <Label required>빈칸 정답</Label>
          {form.blanks.map((blank, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs w-12 flex-shrink-0 text-right" style={{ color: '#9E9E9E' }}>빈칸 {i + 1}</span>
              <input type="text" value={blank} placeholder={`${i + 1}번째 빈칸 정답`}
                onChange={e => { const n = [...form.blanks]; n[i] = e.target.value; upd('blanks', n) }}
                className={inputCls} style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
              {form.blanks.length > 2 && <TrashBtn onClick={() => upd('blanks', form.blanks.filter((_, j) => j !== i))} />}
            </div>
          ))}
          {form.blanks.length < 6 && <AddBtn onClick={() => upd('blanks', [...form.blanks, ''])} label="빈칸 추가" />}
          <p className="text-xs" style={{ color: '#9E9E9E' }}>문제 텍스트에 [1], [2] 등으로 빈칸 위치를 표시하세요</p>
        </div>
      )

    case 'multiple_dropdowns':
      return (
        <div className="space-y-3">
          <Label required>드롭다운 항목</Label>
          {form.dropdowns.map((dd, i) => (
            <div key={i} className="rounded p-2.5 space-y-2" style={{ background: '#F8F9FA', border: '1px solid #E0E0E0' }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: '#616161' }}>드롭다운 {i + 1}</span>
                {form.dropdowns.length > 1 && (
                  <button type="button" onClick={() => upd('dropdowns', form.dropdowns.filter((_, j) => j !== i))}
                    className="ml-auto" style={{ color: '#BDBDBD' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#BDBDBD'}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <input type="text" value={dd.label} placeholder="라벨 (예: 계절)"
                onChange={e => { const n = [...form.dropdowns]; n[i] = { ...n[i], label: e.target.value }; upd('dropdowns', n) }}
                className="w-full text-sm px-2.5 py-1 bg-white focus:outline-none"
                style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
                onFocus={focusBorder} onBlur={blurBorder} />
              <div className="space-y-1">
                {dd.options.map((opt, j) => (
                  <div key={j} className="flex items-center gap-1.5">
                    <button type="button" onClick={() => { const n = [...form.dropdowns]; n[i] = { ...n[i], answerIdx: j }; upd('dropdowns', n) }}
                      className="w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center"
                      style={{ borderColor: dd.answerIdx === j ? '#6366f1' : '#BDBDBD', background: dd.answerIdx === j ? '#6366f1' : '#fff' }}>
                      {dd.answerIdx === j && <div className="w-1 h-1 rounded-full bg-white" />}
                    </button>
                    <input type="text" value={opt} placeholder={`선택지 ${j + 1}`}
                      onChange={e => {
                        const nd = [...form.dropdowns]; const no = [...nd[i].options]; no[j] = e.target.value
                        nd[i] = { ...nd[i], options: no }; upd('dropdowns', nd)
                      }}
                      className="flex-1 text-xs px-2 py-1 bg-white focus:outline-none"
                      style={{ border: '1px solid #E0E0E0', borderRadius: 4, color: '#222222' }}
                      onFocus={focusBorder} onBlur={blurBorder} />
                    {dd.options.length > 2 && (
                      <button type="button" onClick={() => {
                        const nd = [...form.dropdowns]; const no = nd[i].options.filter((_, oi) => oi !== j)
                        nd[i] = { ...nd[i], options: no, answerIdx: Math.min(dd.answerIdx, no.length - 1) }; upd('dropdowns', nd)
                      }} style={{ color: '#BDBDBD', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                        onMouseLeave={e => e.currentTarget.style.color = '#BDBDBD'}>
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {dd.options.length < 5 && (
                <button type="button" onClick={() => { const n = [...form.dropdowns]; n[i] = { ...n[i], options: [...n[i].options, ''] }; upd('dropdowns', n) }}
                  className="flex items-center gap-1 text-xs" style={{ color: '#6366f1' }}>
                  <Plus size={10} /> 선택지 추가
                </button>
              )}
            </div>
          ))}
          {form.dropdowns.length < 4 && (
            <AddBtn onClick={() => upd('dropdowns', [...form.dropdowns, { label: '', options: ['', ''], answerIdx: 0 }])} label="드롭다운 추가" />
          )}
        </div>
      )

    case 'text':
      return (
        <div className="rounded p-3 text-xs" style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', color: '#9E9E9E' }}>
          위 안내문 내용만 입력하면 됩니다. 배점, 난이도, 그룹은 적용되지 않습니다.
        </div>
      )

    case 'file_upload':
      return (
        <div className="text-center py-3 rounded" style={{ background: '#F8F9FA', border: '1px solid #E0E0E0' }}>
          <p className="text-sm" style={{ color: '#9E9E9E' }}>문제 내용과 배점만 입력하면 됩니다.</p>
          <p className="text-xs mt-1" style={{ color: '#BDBDBD' }}>허용 파일: PDF, DOC, DOCX, HWP, ZIP</p>
          <p className="text-xs mt-0.5" style={{ color: '#BDBDBD' }}>채점은 교수자가 직접 수행합니다.</p>
        </div>
      )

    default:
      return null
  }
}

// ── 문항 객체 → 폼 상태 변환 ────────────────────────────────────────────────
function questionToForm(q) {
  const base = { text: q.text || '', points: q.points ?? 5, difficulty: q.difficulty || '', groupTag: q.groupTag || '' }
  // mock 데이터는 choices 필드를 사용하고, AddQuestionModal은 options를 사용
  const opts = q.options?.length ? [...q.options] : q.choices?.length ? [...q.choices] : ['', '', '', '']
  switch (q.type) {
    case 'multiple_choice': {
      let idx = q.correctAnswer ?? 0
      // correctAnswer가 문자열이면 choices/options에서 인덱스 찾기
      if (typeof idx === 'string') idx = opts.findIndex(o => o === idx)
      if (idx < 0) idx = 0
      return { ...base, options: opts, correctIdx: idx }
    }
    case 'true_false': {
      let val = q.correctAnswer ?? true
      if (val === '참' || val === 'true' || val === 'True') val = true
      else if (val === '거짓' || val === 'false' || val === 'False') val = false
      return { ...base, correctBool: val }
    }
    case 'multiple_answers': {
      let idxs = Array.isArray(q.correctAnswer) ? [...q.correctAnswer] : []
      // correctAnswer가 문자열 배열이면 인덱스로 변환
      if (idxs.length > 0 && typeof idxs[0] === 'string') {
        idxs = idxs.map(a => opts.findIndex(o => o === a)).filter(i => i >= 0)
      }
      return { ...base, options: opts, correctIdxs: idxs, scoringMode: q.scoringMode ?? 'all_correct' }
    }
    case 'short_answer':
      return { ...base, acceptedAnswers: Array.isArray(q.correctAnswer) && q.correctAnswer.length ? [...q.correctAnswer] : typeof q.correctAnswer === 'string' ? [q.correctAnswer] : [''] }
    case 'essay':
      return { ...base, rubric: q.rubric || '' }
    case 'numerical':
      return { ...base, correctNum: q.correctAnswer != null ? String(q.correctAnswer) : '', tolerance: q.tolerance != null ? String(q.tolerance) : '0' }
    case 'formula':
      return { ...base, variables: q.variables?.length ? q.variables.map(v => ({ ...v })) : [{ name: '', min: '1', max: '10', decimals: '0' }], formula: q.formula || '', tolerance: q.tolerance != null ? String(q.tolerance) : '0' }
    case 'matching':
      return { ...base, pairs: q.pairs?.length ? q.pairs.map(p => ({ ...p })) : [{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }] }
    case 'fill_in_multiple_blanks':
      return { ...base, blanks: Array.isArray(q.correctAnswer) && q.correctAnswer.length ? [...q.correctAnswer] : ['', ''] }
    case 'multiple_dropdowns':
      return { ...base, dropdowns: q.dropdowns?.length ? q.dropdowns.map(d => ({ ...d, options: [...d.options] })) : [{ label: '', options: ['', ''], answerIdx: 0 }] }
    case 'file_upload':
      return base
    case 'text':
      return { text: q.text || '', points: 0, difficulty: '', groupTag: '' }
    default:
      return base
  }
}

// ── 메인 모달 ──────────────────────────────────────────────────────────────
export default function AddQuestionModal({ onClose, onAdd, bankDifficulty = '', initialQuestion = null, submittedCount = 0 }) {
  const isEditMode = !!initialQuestion
  const [step, setStep] = useState(isEditMode ? 'form' : 'type')
  const [selectedType, setSelectedType] = useState(isEditMode ? initialQuestion.type : null)
  const [hoveredType, setHoveredType] = useState(null)
  const [form, setForm] = useState(() => {
    if (isEditMode) {
      const f = questionToForm(initialQuestion)
      if (bankDifficulty) f.difficulty = bankDifficulty
      return f
    }
    return { text: '', points: 5 }
  })

  const handleSelectType = (type) => {
    setSelectedType(type)
    const f = initForm(type)
    if (bankDifficulty) f.difficulty = bankDifficulty
    setForm(f)
    setStep('form')
  }

  const handleBack = () => {
    if (isEditMode) { onClose(); return }
    setStep('type')
    setSelectedType(null)
    setHoveredType(null)
  }

  const handleAdd = () => {
    if (!isValid(selectedType, form)) return
    onAdd(buildQuestion(selectedType, form))
    onClose()
  }

  const typeInfo = selectedType ? QUIZ_TYPES[selectedType] : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full sm:max-w-2xl bg-white"
        style={{ border: '1px solid #E0E0E0', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #EEEEEE' }}>
          <div>
            <h3 className="font-semibold" style={{ color: '#222222' }}>{isEditMode ? '문항 편집' : '문항 직접 추가'}</h3>
            {step === 'form' && typeInfo && (
              <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#9E9E9E' }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: typeInfo.autoGrade === null ? '#9E9E9E' : typeInfo.autoGrade === false ? '#B43200' : typeInfo.autoGrade === 'partial' ? '#f59e0b' : '#01A900' }} />
                {typeInfo.label} · {typeInfo.autoGrade === null ? '채점 없음' : typeInfo.autoGrade === false ? '수동채점' : typeInfo.autoGrade === 'partial' ? '부분자동' : '자동채점'}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ color: '#9E9E9E' }}
            onMouseEnter={e => e.currentTarget.style.color = '#424242'}
            onMouseLeave={e => e.currentTarget.style.color = '#9E9E9E'}>
            <X size={18} />
          </button>
        </div>

        {step === 'type' ? (
          /* 유형 선택 — 좌: 목록, 우: 미리보기 */
          <div className="flex" style={{ minHeight: 360 }}>
            <div className="flex-1 p-4" style={{ borderRight: '1px solid #EEEEEE' }}>
              <p className="text-sm mb-3" style={{ color: '#616161' }}>추가할 문항 유형을 선택하세요</p>
              <div className="grid grid-cols-2 gap-2 overflow-y-auto scrollbar-thin" style={{ maxHeight: 320 }}>
                {Object.entries(QUIZ_TYPES).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => handleSelectType(key)}
                    onMouseEnter={() => setHoveredType(key)}
                    onMouseLeave={() => setHoveredType(null)}
                    className="flex items-center gap-2.5 p-3 text-left transition-all rounded"
                    style={{
                      border: `1px solid ${hoveredType === key ? (TYPE_META[key]?.color ?? '#6366f1') : '#E0E0E0'}`,
                      background: hoveredType === key ? (TYPE_META[key]?.bg ?? '#EEF2FF') : 'transparent',
                    }}
                  >
                    {(() => {
                      const meta = TYPE_META[key]
                      return meta ? (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: meta.bg, border: `1px solid ${meta.color}22` }}>
                          <meta.Icon size={15} style={{ color: meta.color }} />
                        </div>
                      ) : (
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#9E9E9E' }} />
                      )
                    })()}
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#222222' }}>{val.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#757575' }}>{TYPE_META[key]?.desc ?? ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {/* 미리보기 패널 (데스크톱만) */}
            <div className="w-56 p-4 hidden sm:flex flex-col" style={{ background: '#FAFAFA' }}>
              <TypePreview type={hoveredType} />
            </div>
          </div>
        ) : (
          /* 문항 폼 */
          <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
            {isEditMode && submittedCount > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-md" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: '#EA580C' }} />
                <p className="text-xs leading-relaxed" style={{ color: '#9A3412' }}>
                  이 문항은 이미 <span className="font-bold">{submittedCount}명</span>이 응시했습니다. 수정 시 기존 제출 답안과 채점 결과에 영향을 줄 수 있습니다.
                </p>
              </div>
            )}
            {/* 문제 내용 */}
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: '#424242' }}>
                {selectedType === 'text' ? '안내문 내용' : selectedType === 'formula' ? '문제 설명' : '문제 내용'}
                {' '}<span style={{ color: '#EF2B2A' }}>*</span>
              </label>
              <textarea
                value={form.text}
                onChange={e => setForm(prev => ({ ...prev, text: e.target.value }))}
                placeholder={
                  selectedType === 'text'
                    ? '학생에게 표시할 안내문을 입력하세요 (예: 이번 시험은 오픈북으로 진행됩니다.)'
                    : selectedType === 'formula'
                    ? '예: a명의 학생이 b권의 책을 가지고 있을 때, 총 책의 수는?  (변수는 아래에서 정의)'
                    : '문제를 입력하세요...'
                }
                rows={3}
                autoFocus
                className="w-full bg-white text-sm px-3 py-2 rounded focus:outline-none resize-none"
                style={{ border: '1px solid #E0E0E0', color: '#222222' }}
                onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                onBlur={e => e.currentTarget.style.borderColor = '#E0E0E0'}
              />
            </div>

            {/* 배점 / 난이도 / 그룹 — text 유형은 숨김 */}
            {selectedType !== 'text' && <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: '#424242' }}>배점 <span style={{ color: '#EF4444' }}>*</span></label>
                <input type="number" value={form.points} min={0.5} step={0.5}
                  onChange={e => setForm(prev => ({ ...prev, points: e.target.value }))}
                  className="w-full bg-white text-sm px-3 py-2 rounded focus:outline-none"
                  style={{ border: '1px solid #E0E0E0', color: '#222222' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                  onBlur={e => e.currentTarget.style.borderColor = '#E0E0E0'}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: '#424242' }}>난이도</label>
                {bankDifficulty ? (
                  <div className="text-sm px-3 py-2 flex items-center gap-2" style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 4, color: '#424242' }}>
                    <span className="font-medium">{bankDifficulty === 'high' ? '상' : bankDifficulty === 'medium' ? '중' : '하'}</span>
                    <span className="text-xs" style={{ color: '#9E9E9E' }}>이 문제은행 고정</span>
                  </div>
                ) : (
                  <DropdownSelect
                    value={form.difficulty || ''}
                    onChange={v => setForm(prev => ({ ...prev, difficulty: v }))}
                    options={[
                      { value: '', label: '미지정' },
                      { value: 'high', label: '상' },
                      { value: 'medium', label: '중' },
                      { value: 'low', label: '하' },
                    ]}
                  />
                )}
              </div>
            </div>}

            {selectedType !== 'text' && <div style={{ borderTop: '1px solid #EEEEEE' }} />}

            {/* 유형별 전용 폼 */}
            <TypeForm type={selectedType} form={form} setForm={setForm} />

            {/* 하단 버튼 */}
            <div className="flex items-center justify-between pt-1">
              {!isEditMode && (
                <button onClick={handleBack}
                  className="text-sm transition-colors"
                  style={{ color: '#9E9E9E' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#424242'}
                  onMouseLeave={e => e.currentTarget.style.color = '#9E9E9E'}>
                  ← 유형 변경
                </button>
              )}
              {isEditMode && <div />}
              <div className="flex gap-2">
              <button onClick={onClose}
                className="text-sm px-4 py-2 rounded transition-colors"
                style={{ color: '#424242', border: '1px solid #E0E0E0' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                취소
              </button>
              <button
                disabled={!isValid(selectedType, form)}
                onClick={handleAdd}
                className="text-sm text-white bg-[#3182F6] hover:bg-[#1B64DA] disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors font-medium">
                {isEditMode ? '변경' : '추가'}
              </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
