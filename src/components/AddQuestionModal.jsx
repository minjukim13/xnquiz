import { useState, useRef, useLayoutEffect } from 'react'
import { Plus, Trash2, CircleDot, ToggleLeft, ListChecks, PenLine, AlignLeft, Hash, ArrowLeftRight, AlignJustify, ChevronDown, Paperclip, Sigma, Type, Check, AlertCircle, X } from 'lucide-react'
import { QUIZ_TYPES } from '../data/mockData'
import { DropdownSelect } from './DropdownSelect'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import QuestionTypePreview from './QuestionTypePreview'
import { evalFormulaPreview } from '@/utils/formulaEngine'
import {
  countBlanks,
  countDropdowns,
  hasAllBlankPlaceholders,
  hasAllDropdownPlaceholders,
  maxBlankNumber,
  maxDropdownNumber,
  removeAndShiftBlank,
  removeAndShiftDropdown,
} from '@/utils/placeholderUtils'
import { RichTextEditor, richTextHasContent } from './RichText'
import RegradeOptionsModal from './RegradeOptionsModal'

// ── 유형별 아이콘 + 설명 메타 ──────────
export const TYPE_META = {
  multiple_choice:          { Icon: CircleDot,      desc: '보기 중 1개 선택' },
  true_false:               { Icon: ToggleLeft,      desc: '참 또는 거짓 선택' },
  multiple_answers:         { Icon: ListChecks,      desc: '보기 여러 개 동시 선택' },
  short_answer:             { Icon: PenLine,         desc: '짧은 텍스트로 답변' },
  essay:                    { Icon: AlignLeft,       desc: '자유롭게 서술' },
  numerical:                { Icon: Hash,            desc: '숫자 정답 + 허용 오차 설정' },
  formula:                  { Icon: Sigma,           desc: '변수로 학생마다 다른 답 생성' },
  matching:                 { Icon: ArrowLeftRight,  desc: '왼쪽-오른쪽 항목 연결' },
  fill_in_multiple_blanks:  { Icon: AlignJustify,    desc: '여러 빈칸 순서대로 채우기' },
  multiple_dropdowns:       { Icon: ChevronDown,     desc: '드롭다운에서 항목 선택' },
  file_upload:              { Icon: Paperclip,       desc: '파일 업로드로 제출' },
  text:                     { Icon: Type,            desc: '채점 없는 안내문 삽입' },
}
export const TYPE_TW = {
  multiple_choice:         { text: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-400', iconBorder: 'border-indigo-500/15' },
  true_false:              { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-400', iconBorder: 'border-emerald-600/15' },
  multiple_answers:        { text: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-400', iconBorder: 'border-blue-500/15' },
  short_answer:            { text: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-400', iconBorder: 'border-amber-500/15' },
  essay:                   { text: 'text-red-500', bg: 'bg-red-50', border: 'border-red-400', iconBorder: 'border-red-500/15' },
  numerical:               { text: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-400', iconBorder: 'border-violet-500/15' },
  formula:                 { text: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-400', iconBorder: 'border-teal-600/15' },
  matching:                { text: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-400', iconBorder: 'border-cyan-600/15' },
  fill_in_multiple_blanks: { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-400', iconBorder: 'border-orange-600/15' },
  multiple_dropdowns:      { text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-500', iconBorder: 'border-indigo-600/15' },
  file_upload:             { text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-300', iconBorder: 'border-slate-500/15' },
  text:                    { text: 'text-muted-foreground', bg: 'bg-neutral-100', border: 'border-neutral-300', iconBorder: 'border-neutral-400/15' },
}
export const getTypeTw = (key) => TYPE_TW[key] ?? { text: 'text-muted-foreground', bg: 'bg-neutral-100', border: 'border-neutral-300', iconBorder: 'border-neutral-400/15' }


// ── 부분 점수 정책 옵션 (URD-010) ──────────────────────────────────────────
const SCORING_MODE_LABEL = {
  all_correct: '미적용 (모든 정답을 맞혀야 만점)',
  partial: '적용 (정답 비율에 따라 부분 점수)',
}
const PENALTY_METHOD_LABEL = {
  none: '정답 비율만 반영',
  right_minus_wrong: '정답 비율 반영 + 오답 차감',
  formula_scoring: '정답 비율 반영 + 추측 보정 감점',
}

function getGlobalScoringDefaults() {
  try {
    const raw = localStorage.getItem('xnq_global_settings')
    const gs = raw ? JSON.parse(raw) : {}
    return {
      scoringMode: gs.multipleAnswersScoringMode || 'all_correct',
      penaltyMethod: gs.penaltyMethod || 'none',
    }
  } catch {
    return { scoringMode: 'all_correct', penaltyMethod: 'none' }
  }
}

function describeScoringPolicy(scoringMode, penaltyMethod) {
  if (scoringMode === 'all_correct') return SCORING_MODE_LABEL.all_correct
  return `적용 · ${PENALTY_METHOD_LABEL[penaltyMethod] || PENALTY_METHOD_LABEL.none}`
}

// ── 정답 판정(대소문자·공백·유사 표현) 과목 기본값 + 문항 override (7.5) ──────
function getGlobalJudgmentDefaults() {
  try {
    const gs = JSON.parse(localStorage.getItem('xnq_global_settings') || '{}')
    return {
      caseSensitive: !!gs.caseSensitive,
      whitespaceSensitive: !!gs.whitespaceSensitive,
      fuzzyMatch: !!gs.shortAnswerFuzzy,
      fuzzyDistance: Number(gs.shortAnswerFuzzyDistance ?? 1) || 1,
    }
  } catch {
    return { caseSensitive: false, whitespaceSensitive: false, fuzzyMatch: false, fuzzyDistance: 1 }
  }
}

function getGlobalMatchingDefault() {
  try {
    const gs = JSON.parse(localStorage.getItem('xnq_global_settings') || '{}')
    return gs.matchingPartial ? 'partial' : 'all_correct'
  } catch { return 'all_correct' }
}

function describeJudgment(j) {
  const parts = [j.caseSensitive ? '대소문자 구분' : '대소문자 무시', j.whitespaceSensitive ? '공백 구분' : '공백 무시']
  if (j.fuzzyMatch) parts.push(`유사 허용 ${j.fuzzyDistance}글자`)
  return parts.join(' · ')
}

// 단답형/빈칸 정답 판정 문항 단위 override
function ShortAnswerJudgmentPolicy({ form, setForm }) {
  const upd = (key, val) => setForm(prev => ({ ...prev, [key]: val }))
  const globalDesc = describeJudgment(getGlobalJudgmentDefaults())
  const Chip = ({ active, onClick, children }) => (
    <button type="button" onClick={onClick}
      className={cn('px-2.5 py-1 rounded-md text-[13px] border transition-colors',
        active ? 'border-primary bg-accent text-primary font-medium' : 'border-border bg-white text-slate-600 hover:border-slate-300')}>
      {children}
    </button>
  )
  return (
    <div className="mt-2 pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <Label>정답 판정</Label>
        <span className="text-xs text-muted-foreground">퀴즈 기본값: <span className="text-foreground font-medium">{globalDesc}</span></span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <PolicySourceOption active={!form.overrideJudgment} onClick={() => upd('overrideJudgment', false)} title="퀴즈 기본값 사용" desc="퀴즈 기본 설정의 정답 판정 기준을 따릅니다" />
        <PolicySourceOption active={!!form.overrideJudgment} onClick={() => upd('overrideJudgment', true)} title="이 문항만 다르게 설정" desc="이 문항에 한해 별도 판정 기준을 적용합니다" />
      </div>
      {form.overrideJudgment && (
        <div className="mt-3 rounded-lg border border-border bg-slate-50/60 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-slate-600">영문 대소문자</span>
            <div className="flex gap-1.5">
              <Chip active={!form.caseSensitive} onClick={() => upd('caseSensitive', false)}>무시</Chip>
              <Chip active={!!form.caseSensitive} onClick={() => upd('caseSensitive', true)}>구분</Chip>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-slate-600">띄어쓰기</span>
            <div className="flex gap-1.5">
              <Chip active={!form.whitespaceSensitive} onClick={() => upd('whitespaceSensitive', false)}>무시</Chip>
              <Chip active={!!form.whitespaceSensitive} onClick={() => upd('whitespaceSensitive', true)}>구분</Chip>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[13px] text-slate-600">유사 표현(오탈자)</span>
            <div className="flex gap-1.5 items-center">
              <Chip active={!form.fuzzyMatch} onClick={() => upd('fuzzyMatch', false)}>불허</Chip>
              <Chip active={!!form.fuzzyMatch} onClick={() => upd('fuzzyMatch', true)}>허용</Chip>
              {form.fuzzyMatch && [1, 2].map(d => (
                <Chip key={d} active={(Number(form.fuzzyDistance) || 1) === d} onClick={() => upd('fuzzyDistance', d)}>{d}글자</Chip>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 짝짓기(연결형) 부분 점수 문항 단위 override
function MatchingScoringPolicy({ form, setForm }) {
  const upd = (key, val) => setForm(prev => ({ ...prev, [key]: val }))
  const globalDesc = getGlobalMatchingDefault() === 'partial' ? '적용 (맞힌 연결 비율만큼 부분 점수)' : '미적용 (모두 맞혀야 만점)'
  return (
    <div className="mt-2 pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <Label>부분 점수</Label>
        <span className="text-xs text-muted-foreground">퀴즈 기본값: <span className="text-foreground font-medium">{globalDesc}</span></span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <PolicySourceOption active={!form.overrideScoring} onClick={() => upd('overrideScoring', false)} title="퀴즈 기본값 사용" desc="퀴즈 기본 설정의 부분 점수 정책을 따릅니다" />
        <PolicySourceOption active={!!form.overrideScoring} onClick={() => upd('overrideScoring', true)} title="이 문항만 다르게 설정" desc="이 문항에 한해 별도 정책을 적용합니다" />
      </div>
      {form.overrideScoring && (
        <div className="mt-3 rounded-lg border border-border bg-slate-50/60 p-3 space-y-1.5">
          <RadioRow active={form.scoringMode === 'all_correct'} onClick={() => upd('scoringMode', 'all_correct')} label="미적용 (모든 연결을 맞혀야 만점)" />
          <RadioRow active={form.scoringMode === 'partial'} onClick={() => upd('scoringMode', 'partial')} label="적용 (맞힌 연결 개수 비율만큼 부분 점수)" />
        </div>
      )}
    </div>
  )
}

// ── 폼 초기값 ───────────────────────────────────────────────────────────────
export function initForm(type) {
  const base = { title: '', text: '', points: 5, difficulty: '', correct_comments: '', incorrect_comments: '', neutral_comments: '' }
  switch (type) {
    case 'multiple_choice':         return { ...base, options: ['', '', '', ''], optionComments: ['', '', '', ''], correctIdx: 0 }
    case 'true_false':              return { ...base, correctBool: true, trueComment: '', falseComment: '' }
    case 'multiple_answers':        return { ...base, options: ['', '', '', ''], optionComments: ['', '', '', ''], correctIdxs: [0], overrideScoring: false, scoringMode: 'all_correct', penaltyMethod: 'none' }
    case 'short_answer':            { const j = getGlobalJudgmentDefaults(); return { ...base, acceptedAnswers: [''], overrideJudgment: false, caseSensitive: j.caseSensitive, whitespaceSensitive: j.whitespaceSensitive, fuzzyMatch: j.fuzzyMatch, fuzzyDistance: j.fuzzyDistance } }
    case 'essay':                   return { ...base, rubric: '' }
    case 'numerical':               return { ...base, correctNum: '', tolerance: '0' }
    case 'formula':                 return { ...base, variables: [{ name: '', min: '1', max: '10', decimals: '0' }], formula: '', tolerance: '0', toleranceType: 'absolute', answerDecimals: '2', solutions: [] }
    case 'matching':                return { ...base, pairs: [{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }], distractors: [], overrideScoring: false, scoringMode: getGlobalMatchingDefault() }
    case 'fill_in_multiple_blanks': return { ...base, blanks: [] }
    case 'multiple_dropdowns':      return { ...base, dropdowns: [] }
    case 'file_upload':             return base
    case 'text':                    return { title: '', text: '', points: 0, difficulty: '' }
    default:                        return base
  }
}

// 코멘트 필드만 추출 (빈 값 제거)
function pickComments(form) {
  const c = {}
  if (form.correct_comments?.trim())   c.correct_comments   = form.correct_comments.trim()
  if (form.incorrect_comments?.trim()) c.incorrect_comments = form.incorrect_comments.trim()
  if (form.neutral_comments?.trim())   c.neutral_comments   = form.neutral_comments.trim()
  return c
}

// ── 폼 → 문항 객체 ─────────────────────────────────────────────────────────
export function buildQuestion(type, form) {
  // 본문 text 는 RichTextEditor 의 HTML 문자열일 수 있음 (이미지/iframe 인라인 포함)
  const base = { type, title: (form.title || '').trim(), text: form.text || '', points: Number.isFinite(Number(form.points)) ? Number(form.points) : 0, difficulty: form.difficulty || '', ...pickComments(form) }
  switch (type) {
    case 'multiple_choice': {
      const pairs = form.options.map((o, i) => ({ text: o, comment: form.optionComments?.[i] || '' }))
      const filtered = pairs.filter(p => richTextHasContent(p.text))
      const opts = filtered.map(p => p.text)
      const comments = filtered.map(p => p.comment)
      const result = { ...base, options: opts, choices: opts, correctAnswer: opts[form.correctIdx] ?? opts[0] }
      if (comments.some(c => (c || '').trim())) result.optionComments = comments
      return result
    }
    case 'true_false': {
      const result = { ...base, correctAnswer: form.correctBool ? '참' : '거짓', choices: ['참', '거짓'] }
      if ((form.trueComment || '').trim()) result.trueComment = form.trueComment.trim()
      if ((form.falseComment || '').trim()) result.falseComment = form.falseComment.trim()
      return result
    }
    case 'multiple_answers': {
      const pairs = form.options.map((o, i) => ({ text: o, comment: form.optionComments?.[i] || '' }))
      const filtered = pairs.filter(p => richTextHasContent(p.text))
      const opts = filtered.map(p => p.text)
      const comments = filtered.map(p => p.comment)
      const scoringOverride = form.overrideScoring
        ? {
            scoringMode: form.scoringMode || 'all_correct',
            penaltyMethod: form.scoringMode === 'partial' ? (form.penaltyMethod || 'none') : 'none',
          }
        : {}
      const result = { ...base, options: opts, choices: opts, correctAnswer: form.correctIdxs.map(i => opts[i]).filter(Boolean), ...scoringOverride }
      if (comments.some(c => (c || '').trim())) result.optionComments = comments
      return result
    }
    case 'short_answer':            return { ...base, correctAnswer: form.acceptedAnswers.filter(a => a.trim()), ...(form.overrideJudgment ? { caseSensitive: !!form.caseSensitive, whitespaceSensitive: !!form.whitespaceSensitive, fuzzyMatch: !!form.fuzzyMatch, fuzzyDistance: Number(form.fuzzyDistance) || 1 } : {}) }
    case 'essay':                   return { ...base, rubric: form.rubric }
    case 'numerical':               return { ...base, correctAnswer: Number(form.correctNum), tolerance: Number(form.tolerance) || 0 }
    case 'formula':                 return { ...base, variables: form.variables.filter(v => v.name.trim()), formula: form.formula.trim(), tolerance: Number(form.tolerance) || 0, toleranceType: form.toleranceType || 'absolute', answerDecimals: Number.isFinite(Number(form.answerDecimals)) ? Number(form.answerDecimals) : 2, solutions: form.solutions || [] }
    case 'matching':                return { ...base, pairs: form.pairs.filter(p => p.left.trim() && p.right.trim()), distractors: (form.distractors || []).filter(d => d.trim()), ...(form.overrideScoring ? { scoringMode: form.scoringMode || 'all_correct' } : {}) }
    case 'fill_in_multiple_blanks': return { ...base, correctAnswer: form.blanks.map(b => b.filter(a => a.trim())).filter(b => b.length > 0) }
    case 'multiple_dropdowns':      return { ...base, dropdowns: form.dropdowns.map(d => {
      const opts = d.options.filter(o => o.trim())
      const idx = Math.max(0, Math.min(d.answerIdx ?? 0, opts.length - 1))
      return { options: opts, answerIdx: idx }
    }) }
    case 'file_upload':             return base
    case 'text':                    return { type, title: (form.title || '').trim(), text: form.text || '', points: 0, difficulty: '' }
    default:                        return base
  }
}


// ── 유효성 검사 ─────────────────────────────────────────────────────────────

export function isValid(type, form) {
  if (type === 'text') return richTextHasContent(form.text)
  if (!richTextHasContent(form.text)) return false
  // 배점: 빈값/비숫자/음수 차단, 0 허용
  if (form.points === '' || form.points === null || form.points === undefined) return false
  const pointsNum = Number(form.points)
  if (!Number.isFinite(pointsNum) || pointsNum < 0) return false
  switch (type) {
    case 'multiple_choice':         return form.options.filter(o => richTextHasContent(o)).length >= 2
    case 'multiple_answers':        return form.options.filter(o => richTextHasContent(o)).length >= 3 && form.correctIdxs.length >= 1
    case 'short_answer':            return form.acceptedAnswers.some(a => a.trim())
    case 'numerical':               return form.correctNum !== '' && !isNaN(Number(form.correctNum))
    case 'formula': {
      const validVars = (form.variables || []).filter(v => v.name.trim())
      if (validVars.length === 0 || !form.formula?.trim()) return false
      return evalFormulaPreview(form.formula, validVars) !== null
    }
    case 'matching':                return form.pairs.filter(p => p.left.trim() && p.right.trim()).length >= 2
    case 'fill_in_multiple_blanks': {
      if (!Array.isArray(form.blanks) || form.blanks.length === 0) return false
      if (countBlanks(form.text) !== form.blanks.length) return false
      if (!hasAllBlankPlaceholders(form.text, form.blanks.length)) return false
      return form.blanks.every(b => b.some(a => a.trim()))
    }
    case 'multiple_dropdowns': {
      if (!Array.isArray(form.dropdowns) || form.dropdowns.length === 0) return false
      if (countDropdowns(form.text) !== form.dropdowns.length) return false
      if (!hasAllDropdownPlaceholders(form.text, form.dropdowns.length)) return false
      return form.dropdowns.every(d => d.options.filter(o => o.trim()).length >= 2)
    }
    default:                        return true
  }
}

// ── 자동 높이 조정 textarea (줄바꿈 지원, 답변 입력용) ────────────────────
function AnswerTextarea({ value, onChange, placeholder, className }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(className, 'resize-none overflow-hidden leading-5')}
    />
  )
}

// ── 보기 입력 — 단순 텍스트 기본, 필요 시 '서식'으로 리치 에디터 전환 (FRD D-03 R-003) ──
function HybridTextField({ value, onChange, placeholder, onDelete }) {
  // 기존 데이터(HTML 태그/미디어 포함)는 리치 모드로 시작
  const [rich, setRich] = useState(() => /<[a-z!/][\s\S]*>/i.test(value || ''))
  if (rich) {
    return (
      <RichTextEditor
        value={value}
        placeholder={placeholder}
        minHeight="min-h-[44px]"
        onChange={onChange}
        onDelete={onDelete}
      />
    )
  }
  return (
    <div className="flex items-start gap-1.5">
      <AnswerTextarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 text-[15px] px-2.5 py-1.5 bg-white focus:outline-none border border-border rounded-lg text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
      <button
        type="button"
        onClick={() => setRich(true)}
        title="서식·수식·이미지 추가"
        aria-label="서식 추가"
        className="mt-0.5 p-1.5 rounded-md border border-border text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors shrink-0"
      >
        <PenLine size={14} />
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="보기 삭제"
          aria-label="보기 삭제"
          className="mt-0.5 p-1.5 rounded-md border border-border text-slate-400 hover:text-destructive hover:border-destructive/40 transition-colors shrink-0"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

// ── 보기별 코멘트 입력 (Canvas "이 답변을 선택한 경우의 의견") ─────────────
// 코멘트가 있으면 자동 펼침, 없으면 토글 버튼만 노출
// 펼친 상태는 박스로 감싸 아래 보기 입력창과 시각적으로 명확히 구분한다 (XQ 피드백)
function OptionCommentField({ value, onChange, indent = true }) {
  const hasValue = !!(value || '').trim()
  const [open, setOpen] = useState(hasValue)
  const visible = open || hasValue
  return (
    <div className={cn(indent && 'ml-7', 'mt-3')}>
      {!visible ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary hover:bg-secondary px-1.5 py-1 -ml-1.5 rounded-md transition-colors"
        >
          <Plus size={10} /> 이 답변 선택 시 피드백
        </button>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-secondary/50 p-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-medium text-secondary-foreground">
              이 답변을 선택한 경우의 의견
            </span>
            {!hasValue && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded-md border border-border bg-white/60 hover:bg-white transition-colors"
              >
                <X size={11} /> 접기
              </button>
            )}
          </div>
          <AnswerTextarea
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder="예: 이 답을 고른 경우 한 번 더 확인해 보세요."
            className="w-full bg-white text-[13px] px-2.5 py-1.5 focus:outline-none border border-border rounded-md text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
      )}
    </div>
  )
}

// ── 폼 내부에서 반복 사용되는 정적 컴포넌트 ───────────────────────────────
function TrashBtn({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="text-muted-foreground shrink-0 hover:text-destructive transition-colors">
      <Trash2 size={13} />
    </button>
  )
}

function AddBtn({ onClick, label }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 text-xs text-indigo-500">
      <Plus size={12} />{label}
    </button>
  )
}

function Label({ children, required }) {
  return (
    <label className="text-[15px] font-medium block mb-1.5 text-foreground">
      {children}{required && <span className="ml-0.5 text-destructive">*</span>}
    </label>
  )
}

// ── 복수 선택 문항 단위 부분 점수 정책 (URD-010) ──────────────────────────
function MultipleAnswersScoringPolicy({ form, setForm }) {
  const upd = (key, val) => setForm(prev => ({ ...prev, [key]: val }))
  const globalDefault = getGlobalScoringDefaults()
  const globalDesc = describeScoringPolicy(globalDefault.scoringMode, globalDefault.penaltyMethod)

  return (
    <div className="mt-2 pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <Label>부분 점수 정책</Label>
        <span className="text-xs text-muted-foreground">퀴즈 기본값: <span className="text-foreground font-medium">{globalDesc}</span></span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <PolicySourceOption
          active={!form.overrideScoring}
          onClick={() => upd('overrideScoring', false)}
          title="퀴즈 기본값 사용"
          desc="퀴즈 기본 설정에서 정의한 정책을 따릅니다"
        />
        <PolicySourceOption
          active={!!form.overrideScoring}
          onClick={() => upd('overrideScoring', true)}
          title="이 문항만 다르게 설정"
          desc="이 문항에 한해 별도의 정책을 적용합니다"
        />
      </div>

      {form.overrideScoring && (
        <div className="mt-3 rounded-lg border border-border bg-slate-50/60 p-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1.5">적용 여부</p>
            <div className="space-y-1.5">
              {Object.entries(SCORING_MODE_LABEL).map(([value, label]) => (
                <RadioRow
                  key={value}
                  active={form.scoringMode === value}
                  onClick={() => {
                    setForm(prev => ({
                      ...prev,
                      scoringMode: value,
                      penaltyMethod: value === 'all_correct' ? 'none' : prev.penaltyMethod,
                    }))
                  }}
                  label={label}
                />
              ))}
            </div>
          </div>

          {form.scoringMode === 'partial' && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1.5">적용 시 산정 방식</p>
              <div className="space-y-1.5">
                {Object.entries(PENALTY_METHOD_LABEL).map(([value, label]) => (
                  <RadioRow
                    key={value}
                    active={form.penaltyMethod === value}
                    onClick={() => upd('penaltyMethod', value)}
                    label={label}
                  />
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">오답 차감이 적용되어도 문항 점수는 0점 미만으로 내려가지 않습니다.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PolicySourceOption({ active, onClick, title, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left p-2.5 rounded-lg border transition-all',
        active ? 'border-primary bg-accent' : 'border-border bg-white hover:border-slate-300'
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn(
          'mt-0.5 w-4 h-4 rounded-full border-[1.5px] shrink-0 flex items-center justify-center',
          active ? 'border-primary' : 'border-slate-300'
        )}>
          {active && <span className="w-2 h-2 rounded-full bg-primary" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className={cn('text-[14px] font-medium', active ? 'text-primary' : 'text-slate-700')}>{title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
        </div>
      </div>
    </button>
  )
}

function RadioRow({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-left text-[13px] transition-all',
        active ? 'border-primary bg-white text-primary' : 'border-transparent bg-white/60 text-slate-600 hover:border-slate-200'
      )}
    >
      <span className={cn(
        'w-3.5 h-3.5 rounded-full border-[1.5px] shrink-0 flex items-center justify-center',
        active ? 'border-primary' : 'border-slate-300'
      )}>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
      </span>
      <span>{label}</span>
    </button>
  )
}

// ── 유형별 전용 폼 ──────────────────────────────────────────────────────────
export function TypeForm({ type, form, setForm, textareaRef }) {
  const upd = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const insertAtCursor = (tag) => {
    const el = textareaRef?.current
    const current = form.text || ''
    if (el) {
      const start = el.selectionStart ?? current.length
      const end = el.selectionEnd ?? current.length
      const newText = current.slice(0, start) + tag + current.slice(end)
      setTimeout(() => {
        try {
          el.focus()
          el.setSelectionRange(start + tag.length, start + tag.length)
        } catch { /* ignore */ }
      }, 0)
      return newText
    }
    return current + (current.endsWith(' ') || current.length === 0 ? '' : ' ') + tag
  }

  const insertBlankTag = () => {
    const num = (form.blanks?.length || 0) + 1
    const tag = `[빈칸${num}]`
    const newText = insertAtCursor(tag)
    setForm(prev => ({ ...prev, text: newText, blanks: [...(prev.blanks || []), ['']] }))
  }
  const insertDropdownTag = () => {
    const num = (form.dropdowns?.length || 0) + 1
    const tag = `[드롭다운${num}]`
    const newText = insertAtCursor(tag)
    setForm(prev => ({
      ...prev,
      text: newText,
      dropdowns: [...(prev.dropdowns || []), { options: ['', ''], answerIdx: 0 }],
    }))
  }

  const inputCls = 'flex-1 text-[15px] px-2.5 py-1.5 bg-white focus:outline-none border border-border rounded-lg text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30'

  switch (type) {
    case 'multiple_choice':
      return (
        <div className="space-y-3">
          <Label required>보기 옵션</Label>
          <p className="text-xs text-muted-foreground -mt-1">보기는 단순 텍스트로 입력하고, 필요하면 '서식'을 눌러 이미지·수식을 추가할 수 있습니다</p>
          <div className="space-y-5">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-start gap-2">
                <button type="button" onClick={() => upd('correctIdx', i)}
                  title={form.correctIdx === i ? '정답' : '정답으로 지정'}
                  className={cn(
                    'w-5 h-5 mt-2 rounded-full flex-shrink-0 flex items-center justify-center transition-all',
                    form.correctIdx === i ? 'bg-indigo-500' : 'border border-neutral-300 bg-white hover:border-indigo-400'
                  )}>
                  {form.correctIdx === i && <Check size={12} strokeWidth={3} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <HybridTextField value={opt} placeholder={`보기 ${i + 1}`}
                    onChange={val => { const n = [...form.options]; n[i] = val; upd('options', n) }}
                    onDelete={form.options.length > 2 ? () => {
                      setForm(prev => {
                        const newOptions = prev.options.filter((_, j) => j !== i)
                        const newComments = (prev.optionComments || []).filter((_, j) => j !== i)
                        let newIdx = prev.correctIdx
                        if (newIdx === i) newIdx = 0
                        else if (newIdx > i) newIdx -= 1
                        if (newIdx >= newOptions.length) newIdx = 0
                        return { ...prev, options: newOptions, optionComments: newComments, correctIdx: newIdx }
                      })
                    } : undefined} />
                  <OptionCommentField
                    value={form.optionComments?.[i] || ''}
                    onChange={val => setForm(prev => {
                      const n = [...(prev.optionComments || prev.options.map(() => ''))]
                      n[i] = val
                      return { ...prev, optionComments: n }
                    })}
                    indent={false}
                  />
                </div>
              </div>
            ))}
          </div>
          {form.options.length < 10 && (
            <AddBtn
              onClick={() => setForm(prev => ({
                ...prev,
                options: [...prev.options, ''],
                optionComments: [...(prev.optionComments || prev.options.map(() => '')), ''],
              }))}
              label="보기 추가"
            />
          )}
        </div>
      )

    case 'true_false':
      return (
        <div className="space-y-3">
          <Label required>정답</Label>
          <div className="flex gap-2">
            {[true, false].map(val => (
              <button key={String(val)} type="button" onClick={() => upd('correctBool', val)}
                className={cn(
                  'flex-1 py-2 text-[15px] font-medium rounded transition-all border',
                  form.correctBool === val
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-neutral-100 border-neutral-200 text-neutral-500'
                )}>
                {val ? '참 (True)' : '거짓 (False)'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div>
              <span className="text-[12px] font-medium text-secondary-foreground">참 선택 시 의견</span>
              <OptionCommentField
                value={form.trueComment || ''}
                onChange={val => upd('trueComment', val)}
                indent={false}
              />
            </div>
            <div>
              <span className="text-[12px] font-medium text-secondary-foreground">거짓 선택 시 의견</span>
              <OptionCommentField
                value={form.falseComment || ''}
                onChange={val => upd('falseComment', val)}
                indent={false}
              />
            </div>
          </div>
        </div>
      )

    case 'multiple_answers':
      return (
        <div className="space-y-3">
          <Label required>보기 옵션</Label>
          <p className="text-xs text-muted-foreground -mt-1">보기는 단순 텍스트로 입력하고, 필요하면 '서식'을 눌러 이미지·수식을 추가할 수 있습니다</p>
          <div className="space-y-5">
            {form.options.map((opt, i) => {
              const isCorrect = form.correctIdxs.includes(i)
              return (
                <div key={i} className="flex items-start gap-2">
                  <button type="button" onClick={() => upd('correctIdxs', isCorrect ? form.correctIdxs.filter(x => x !== i) : [...form.correctIdxs, i])}
                    className={cn(
                      'w-4 h-4 mt-2.5 rounded flex-shrink-0 flex items-center justify-center transition-all border',
                      isCorrect ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-neutral-400'
                    )}>
                    {isCorrect && <span className="text-white text-[9px]">✓</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <HybridTextField value={opt} placeholder={`보기 ${i + 1}`}
                      onChange={val => { const n = [...form.options]; n[i] = val; upd('options', n) }}
                      onDelete={form.options.length > 3 ? () => {
                        setForm(prev => {
                          const newOptions = prev.options.filter((_, j) => j !== i)
                          const newComments = (prev.optionComments || []).filter((_, j) => j !== i)
                          const newCorrectIdxs = prev.correctIdxs.filter(x => x !== i).map(x => x > i ? x - 1 : x)
                          return { ...prev, options: newOptions, optionComments: newComments, correctIdxs: newCorrectIdxs }
                        })
                      } : undefined} />
                    <OptionCommentField
                      value={form.optionComments?.[i] || ''}
                      onChange={val => setForm(prev => {
                        const n = [...(prev.optionComments || prev.options.map(() => ''))]
                        n[i] = val
                        return { ...prev, optionComments: n }
                      })}
                      indent={false}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {form.options.length < 10 && (
            <AddBtn
              onClick={() => setForm(prev => ({
                ...prev,
                options: [...prev.options, ''],
                optionComments: [...(prev.optionComments || prev.options.map(() => '')), ''],
              }))}
              label="보기 추가"
            />
          )}

          <MultipleAnswersScoringPolicy form={form} setForm={setForm} />
        </div>
      )

    case 'short_answer':
      return (
        <div className="space-y-2">
          <Label required>허용 정답</Label>
          {form.acceptedAnswers.map((ans, i) => (
            <div key={i} className="flex items-center gap-2">
              <AnswerTextarea value={ans}
                onChange={e => { const n = [...form.acceptedAnswers]; n[i] = e.target.value; upd('acceptedAnswers', n) }}
                placeholder={i === 0 ? '정답 입력 (예: 서울)' : '대체 정답 (예: Seoul)'}
                className={inputCls} />
              {form.acceptedAnswers.length > 1 && <TrashBtn onClick={() => upd('acceptedAnswers', form.acceptedAnswers.filter((_, j) => j !== i))} />}
            </div>
          ))}
          {form.acceptedAnswers.length < 5 && <AddBtn onClick={() => upd('acceptedAnswers', [...form.acceptedAnswers, ''])} label="대체 정답 추가" />}

          <ShortAnswerJudgmentPolicy form={form} setForm={setForm} />
        </div>
      )

    case 'essay':
      return (
        <div>
          <Label>채점 루브릭</Label>
          <textarea value={form.rubric} onChange={e => upd('rubric', e.target.value)}
            placeholder="채점 기준을 입력하세요 (학생에게는 표시되지 않음)"
            rows={3}
            className="w-full bg-white text-[15px] px-2.5 py-2 focus:outline-none resize-none border border-neutral-200 rounded text-foreground focus:border-indigo-500" />
        </div>
      )

    case 'numerical':
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label required>정답 (숫자)</Label>
              <input type="number" value={form.correctNum} placeholder="예: 3.14"
                onChange={e => upd('correctNum', e.target.value)}
                className="w-full text-[15px] px-2.5 py-1.5 bg-white focus:outline-none border border-neutral-200 rounded text-foreground focus:border-indigo-500" />
            </div>
            <div>
              <Label>허용 오차</Label>
              <input type="number" value={form.tolerance} placeholder="예: 0.01" min="0"
                onChange={e => upd('tolerance', e.target.value)}
                className="w-full text-[15px] px-2.5 py-1.5 bg-white focus:outline-none border border-neutral-200 rounded text-foreground focus:border-indigo-500" />
            </div>
          </div>
          {form.correctNum !== '' && (
            <p className="text-xs text-muted-foreground">
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
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input type="text" value={pair.left} placeholder={`왼쪽 ${i + 1}`}
                  onChange={e => { const n = [...form.pairs]; n[i] = { ...n[i], left: e.target.value }; upd('pairs', n) }}
                  className={inputCls} />
                <span className="text-xs flex-shrink-0 text-muted-foreground self-center hidden sm:inline">↔</span>
                <span className="text-xs flex-shrink-0 text-muted-foreground self-center sm:hidden text-center">↕</span>
                <div className="flex items-center gap-2">
                  <input type="text" value={pair.right} placeholder={`오른쪽 ${i + 1}`}
                    onChange={e => { const n = [...form.pairs]; n[i] = { ...n[i], right: e.target.value }; upd('pairs', n) }}
                    className={inputCls} />
                  {form.pairs.length > 2 && <TrashBtn onClick={() => upd('pairs', form.pairs.filter((_, j) => j !== i))} />}
                </div>
              </div>
            ))}
          </div>
          {form.pairs.length < 10 && <AddBtn onClick={() => upd('pairs', [...form.pairs, { left: '', right: '' }])} label="항목 추가" />}

          {/* 오답 보기 */}
          <div className="border-t border-border pt-3">
            <label className="text-[15px] font-medium block mb-1 text-foreground">오답 보기</label>
            <p className="text-xs mb-2 text-muted-foreground">우측에만 표시되는 오답 보기를 추가하면 난이도가 올라갑니다</p>
            <div className="space-y-2">
              {(form.distractors || []).map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={d} placeholder={`오답 보기 ${i + 1}`}
                    onChange={e => { const n = [...(form.distractors || [])]; n[i] = e.target.value; upd('distractors', n) }}
                    className={inputCls} />
                  <TrashBtn onClick={() => upd('distractors', (form.distractors || []).filter((_, j) => j !== i))} />
                </div>
              ))}
            </div>
            {(form.distractors || []).length < 4 && (
              <div className="mt-2">
                <AddBtn onClick={() => upd('distractors', [...(form.distractors || []), ''])} label="오답 보기 추가" />
              </div>
            )}
          </div>

          <MatchingScoringPolicy form={form} setForm={setForm} />
        </div>
      )

    case 'formula': {
      const vars = (form.variables || [])
      const validVars = vars.filter(v => v.name.trim())
      const preview = evalFormulaPreview(form.formula, validVars)
      const exampleLabel = validVars.map(v => {
        const mid = ((Number(v.min) || 1) + (Number(v.max) || 10)) / 2
        return `${v.name}=${mid}`
      }).join(', ')
      const answerDec = Number(form.answerDecimals) || 0
      const varInputCls = 'text-[15px] px-2 py-1.5 bg-white text-center focus:outline-none border border-border rounded-lg text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30'
      return (
        <div className="space-y-5">
          {/* 변수 설정 */}
          <div>
            <div className="mb-2.5">
              <Label required>변수 설정</Label>
            </div>
            {(() => {
              const showDel = vars.length > 1
              const cols = showDel ? '4.5rem 1fr 0.75rem 1fr 4.5rem 1.5rem' : '4.5rem 1fr 0.75rem 1fr 4.5rem'
              const headers = showDel ? ['변수명', '최솟값', '', '최댓값', '소수점', ''] : ['변수명', '최솟값', '', '최댓값', '소수점']
              return <>
                <div className="grid gap-1.5 mb-1.5 px-0.5" style={{ gridTemplateColumns: cols }}>
                  {headers.map((h, i) => (
                    <span key={i} className="text-xs text-muted-foreground">{h}</span>
                  ))}
                </div>
                <div className="space-y-2">
                  {vars.map((v, i) => (
                    <div key={i} className="grid items-center gap-2" style={{ gridTemplateColumns: cols }}>
                      <input type="text" value={v.name} placeholder="a"
                        maxLength={4}
                        onChange={e => { const filtered = e.target.value.replace(/[^a-zA-Z0-9]/g, '').replace(/^[0-9]+/, ''); const n = [...vars]; n[i] = { ...n[i], name: filtered }; upd('variables', n) }}
                        className={cn(varInputCls, 'font-mono placeholder:font-sans text-teal-600')} />
                      <input type="number" value={v.min} placeholder="1"
                        onChange={e => { const n = [...vars]; n[i] = { ...n[i], min: e.target.value }; upd('variables', n) }}
                        className={varInputCls} />
                      <span className="text-sm text-center text-muted-foreground select-none">~</span>
                      <input type="number" value={v.max} placeholder="10"
                        onChange={e => { const n = [...vars]; n[i] = { ...n[i], max: e.target.value }; upd('variables', n) }}
                        className={varInputCls} />
                      <DropdownSelect size="sm"
                        value={v.decimals || '0'}
                        onChange={val => { const n = [...vars]; n[i] = { ...n[i], decimals: val }; upd('variables', n) }}
                        options={[0, 1, 2, 3, 4].map(d => ({ value: String(d), label: String(d) }))} />
                      {showDel && <TrashBtn onClick={() => upd('variables', vars.filter((_, j) => j !== i))} />}
                    </div>
                  ))}
                </div>
              </>
            })()}
            {vars.length < 10 && (
              <div className="mt-2">
                <AddBtn onClick={() => upd('variables', [...vars, { name: '', min: '1', max: '10', decimals: '0' }])} label="변수 추가" />
              </div>
            )}
          </div>

          {/* 수식 입력 */}
          <div>
            <Label required>수식</Label>
            <p className="text-xs mb-2 text-muted-foreground">
              변수명을 그대로 입력하세요. 사칙연산(+, -, *, /), ^(거듭제곱), 수학 함수, 상수(pi, e) 사용 가능
            </p>
            <input type="text" value={form.formula} placeholder="예: sqrt(a^2 + b^2)"
              onChange={e => upd('formula', e.target.value)}
              className={cn(
                'w-full text-[15px] px-3 py-2 bg-white font-mono placeholder:font-sans focus:outline-none border rounded-lg text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30',
                form.formula && preview === null ? 'border-destructive ring-2 ring-destructive/20' : 'border-border'
              )} />
            {form.formula && preview !== null && exampleLabel && (
              <div className="mt-2 px-3 py-2 rounded-lg text-xs flex items-center gap-2 bg-teal-50 border border-teal-200">
                <span className="text-teal-700">예시 ({exampleLabel})</span>
                <span className="text-muted-foreground">=</span>
                <span className="font-medium font-mono text-teal-600">{Number(preview.toFixed(answerDec))}</span>
              </div>
            )}
            {form.formula && preview === null && (
              <p className="mt-1.5 text-xs text-destructive">수식을 확인해 주세요 (변수명 오타, 잘못된 기호 등)</p>
            )}
          </div>

          {/* 정답 소수점 자릿수 + 허용 오차 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>정답 소수점 자릿수</Label>
              <DropdownSelect size="md"
                value={form.answerDecimals || '2'}
                onChange={val => upd('answerDecimals', val)}
                options={[0, 1, 2, 3, 4, 5, 6].map(d => ({ value: String(d), label: `${d}자리` }))} />
              <p className="text-xs mt-1 text-muted-foreground">계산 결과 표시/채점 시 적용</p>
            </div>
            <div>
              <Label>허용 오차</Label>
              <div className="flex gap-2">
                <DropdownSelect size="md"
                  value={form.toleranceType || 'absolute'}
                  onChange={val => upd('toleranceType', val)}
                  options={[{ value: 'absolute', label: '절대값' }, { value: 'percent', label: '%' }]}
                  className="w-[5.5rem] shrink-0" />
                <input type="number" value={form.tolerance} min="0" placeholder="0"
                  onChange={e => upd('tolerance', e.target.value)}
                  className="flex-1 min-w-0 h-9 text-[15px] px-2.5 bg-white focus:outline-none border border-border rounded-lg text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
              <p className="text-xs mt-1 text-muted-foreground">
                {(form.toleranceType || 'absolute') === 'percent'
                  ? `정답의 ±${form.tolerance || 0}% 범위까지 정답 처리`
                  : `정답 ±${form.tolerance || 0} 범위까지 정답 처리 (0 = 완전 일치)`}
              </p>
            </div>
          </div>
        </div>
      )
    }

    case 'fill_in_multiple_blanks': {
      const bodyCount = countBlanks(form.text)
      const mismatch = bodyCount !== form.blanks.length || !hasAllBlankPlaceholders(form.text, form.blanks.length)
      return (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <Label required>빈칸 정답</Label>
            <Button type="button" variant="soft" size="sm"
              onClick={insertBlankTag}
              disabled={form.blanks.length >= 6}>
              <Plus /> 본문에 빈칸 삽입
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">본문의 <span className="font-semibold text-primary">[빈칸N]</span> 자리가 학생 화면에서 입력란으로 표시됩니다.</p>
          {form.blanks.length === 0 && (
            <div className="flex items-center justify-center gap-1.5 text-xs rounded-md px-3 py-4 bg-secondary/60 border border-dashed border-border text-muted-foreground">
              아직 추가된 빈칸이 없습니다
            </div>
          )}
          {mismatch && form.blanks.length > 0 && (
            <div className="flex items-start gap-2 rounded-md px-3 py-2 bg-warning-bg border border-warning-border">
              <AlertCircle size={13} className="mt-0.5 shrink-0 text-warning" />
              <p className="text-xs text-warning-foreground leading-relaxed">
                본문에 <span className="font-semibold">[빈칸1]</span> ~ <span className="font-semibold">[빈칸{form.blanks.length}]</span>이 모두 포함되어야 합니다.
              </p>
            </div>
          )}
          {form.blanks.map((blankAnswers, i) => (
            <div key={i} className="rounded-lg border border-border overflow-hidden bg-card">
              <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 border-b border-border">
                <span className="text-xs font-medium flex items-center gap-1.5 text-secondary-foreground">
                  <span className="font-semibold text-[11px] px-1.5 py-0.5 rounded bg-accent text-primary">[빈칸{i + 1}]</span>
                  정답
                </span>
                <button type="button" onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    text: removeAndShiftBlank(prev.text, i + 1),
                    blanks: prev.blanks.filter((_, j) => j !== i),
                  }))
                }} className="text-muted-foreground hover:text-destructive transition-colors" title="빈칸 삭제">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="p-2.5 space-y-1.5">
                {blankAnswers.map((ans, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <AnswerTextarea value={ans}
                      onChange={e => { const n = form.blanks.map(b => [...b]); n[i][j] = e.target.value; upd('blanks', n) }}
                      placeholder={j === 0 ? `정답 입력` : '대체 정답 (동의어 등)'}
                      className={inputCls} />
                    {blankAnswers.length > 1 && (
                      <TrashBtn onClick={() => { const n = form.blanks.map(b => [...b]); n[i] = n[i].filter((_, k) => k !== j); upd('blanks', n) }} />
                    )}
                  </div>
                ))}
                {blankAnswers.length < 5 && (
                  <button type="button" onClick={() => { const n = form.blanks.map(b => [...b]); n[i] = [...n[i], '']; upd('blanks', n) }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary px-2 py-1 rounded-md hover:bg-accent/60 transition-colors">
                    <Plus size={11} /> 대체 정답 추가
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )
    }

    case 'multiple_dropdowns': {
      const bodyDCount = countDropdowns(form.text)
      const ddMismatch = bodyDCount !== form.dropdowns.length || !hasAllDropdownPlaceholders(form.text, form.dropdowns.length)
      return (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <Label required>드롭다운 항목</Label>
            <Button type="button" variant="soft" size="sm"
              onClick={insertDropdownTag}
              disabled={form.dropdowns.length >= 4}>
              <Plus /> 본문에 드롭다운 삽입
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">본문의 <span className="font-semibold text-primary">[드롭다운N]</span> 자리가 학생 화면에서 선택 목록으로 표시됩니다.</p>
          {form.dropdowns.length === 0 && (
            <div className="flex items-center justify-center gap-1.5 text-xs rounded-md px-3 py-4 bg-secondary/60 border border-dashed border-border text-muted-foreground">
              아직 추가된 드롭다운이 없습니다
            </div>
          )}
          {ddMismatch && form.dropdowns.length > 0 && (
            <div className="flex items-start gap-2 rounded-md px-3 py-2 bg-warning-bg border border-warning-border">
              <AlertCircle size={13} className="mt-0.5 shrink-0 text-warning" />
              <p className="text-xs text-warning-foreground leading-relaxed">
                본문에 <span className="font-semibold">[드롭다운1]</span> ~ <span className="font-semibold">[드롭다운{form.dropdowns.length}]</span>이 모두 포함되어야 합니다.
              </p>
            </div>
          )}
          {form.dropdowns.map((dd, i) => (
            <div key={i} className="rounded-lg border border-border overflow-hidden bg-card">
              <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 border-b border-border">
                <span className="text-xs font-medium flex items-center gap-1.5 text-secondary-foreground">
                  <span className="font-semibold text-[11px] px-1.5 py-0.5 rounded bg-accent text-primary">[드롭다운{i + 1}]</span>
                  선택지
                </span>
                <button type="button" onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    text: removeAndShiftDropdown(prev.text, i + 1),
                    dropdowns: prev.dropdowns.filter((_, j) => j !== i),
                  }))
                }} className="text-muted-foreground hover:text-destructive transition-colors" title="드롭다운 삭제">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="p-2.5 space-y-1">
                {dd.options.map((opt, j) => {
                  const isAnswer = dd.answerIdx === j
                  return (
                    <div key={j} className={cn(
                      'flex items-center gap-2 px-2 py-1 rounded-md transition-colors',
                      isAnswer && 'bg-accent/50'
                    )}>
                      <button type="button" onClick={() => { const n = [...form.dropdowns]; n[i] = { ...n[i], answerIdx: j }; upd('dropdowns', n) }}
                        title={isAnswer ? '정답' : '정답으로 지정'}
                        className={cn(
                          'w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center transition-all',
                          isAnswer ? 'bg-primary' : 'border border-neutral-300 bg-white hover:border-primary/60'
                        )}>
                        {isAnswer && <Check size={10} strokeWidth={3} className="text-white" />}
                      </button>
                      <AnswerTextarea value={opt} placeholder={`선택지 ${j + 1}`}
                        onChange={e => {
                          const nd = [...form.dropdowns]; const no = [...nd[i].options]; no[j] = e.target.value
                          nd[i] = { ...nd[i], options: no }; upd('dropdowns', nd)
                        }}
                        className={cn(
                          'flex-1 text-[15px] px-2 py-1 focus:outline-none border rounded text-foreground transition-colors',
                          isAnswer
                            ? 'bg-white border-primary/30 focus:border-primary'
                            : 'bg-white border-border focus:border-primary'
                        )} />
                      {isAnswer && <span className="text-[10px] font-semibold text-primary px-1 shrink-0">정답</span>}
                      {dd.options.length > 2 && (
                        <button type="button" onClick={() => {
                          const nd = [...form.dropdowns]; const no = nd[i].options.filter((_, oi) => oi !== j)
                          nd[i] = { ...nd[i], options: no, answerIdx: Math.min(dd.answerIdx, no.length - 1) }; upd('dropdowns', nd)
                        }} className="text-muted-foreground shrink-0 hover:text-destructive transition-colors">
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  )
                })}
                {dd.options.length < 5 && (
                  <button type="button" onClick={() => { const n = [...form.dropdowns]; n[i] = { ...n[i], options: [...n[i].options, ''] }; upd('dropdowns', n) }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary px-2 py-1 rounded-md hover:bg-accent/60 transition-colors">
                    <Plus size={11} /> 선택지 추가
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )
    }

    case 'text':
      return (
        <div className="rounded p-3 text-xs bg-neutral-100 border border-neutral-200 text-muted-foreground">
          위 안내문 내용만 입력하면 됩니다. 배점, 난이도는 적용되지 않습니다.
        </div>
      )

    case 'file_upload':
      return (
        <div className="text-center py-3 rounded bg-secondary border border-neutral-200">
          <p className="text-[15px] text-muted-foreground">문항 내용과 배점만 입력하면 됩니다.</p>
          <p className="text-xs mt-1 text-muted-foreground">허용 파일: PDF, DOC, DOCX, HWP, ZIP</p>
          <p className="text-xs mt-0.5 text-muted-foreground">채점은 교수자가 직접 수행합니다.</p>
        </div>
      )

    default:
      return null
  }
}

// ── 문항 객체 → 폼 상태 변환 ────────────────────────────────────────────────
export function questionToForm(q) {
  const base = {
    title: q.title || '',
    text: q.text || '',
    points: q.points ?? 5,
    difficulty: q.difficulty || '',
    correct_comments: q.correct_comments || '',
    incorrect_comments: q.incorrect_comments || '',
    neutral_comments: q.neutral_comments || '',
  }
  // mock 데이터는 choices 필드를 사용하고, AddQuestionModal은 options를 사용
  const opts = q.options?.length ? [...q.options] : q.choices?.length ? [...q.choices] : ['', '', '', '']
  switch (q.type) {
    case 'multiple_choice': {
      let idx = q.correctAnswer ?? 0
      // correctAnswer가 문자열이면 choices/options에서 인덱스 찾기
      if (typeof idx === 'string') idx = opts.findIndex(o => o === idx)
      if (idx < 0) idx = 0
      const optionComments = Array.isArray(q.optionComments)
        ? opts.map((_, i) => q.optionComments[i] || '')
        : opts.map(() => '')
      return { ...base, options: opts, optionComments, correctIdx: idx }
    }
    case 'true_false': {
      let val = q.correctAnswer ?? true
      if (val === '참' || val === 'true' || val === 'True') val = true
      else if (val === '거짓' || val === 'false' || val === 'False') val = false
      return { ...base, correctBool: val, trueComment: q.trueComment || '', falseComment: q.falseComment || '' }
    }
    case 'multiple_answers': {
      let idxs = Array.isArray(q.correctAnswer) ? [...q.correctAnswer] : []
      // correctAnswer가 문자열 배열이면 인덱스로 변환
      if (idxs.length > 0 && typeof idxs[0] === 'string') {
        idxs = idxs.map(a => opts.findIndex(o => o === a)).filter(i => i >= 0)
      }
      const hasOverride = q.scoringMode != null
      const optionComments = Array.isArray(q.optionComments)
        ? opts.map((_, i) => q.optionComments[i] || '')
        : opts.map(() => '')
      return {
        ...base,
        options: opts,
        optionComments,
        correctIdxs: idxs,
        overrideScoring: hasOverride,
        scoringMode: hasOverride ? q.scoringMode : 'all_correct',
        penaltyMethod: hasOverride ? (q.penaltyMethod || 'none') : 'none',
      }
    }
    case 'short_answer': {
      const g = getGlobalJudgmentDefaults()
      const hasJ = q.caseSensitive != null || q.whitespaceSensitive != null || q.fuzzyMatch != null
      return {
        ...base,
        acceptedAnswers: Array.isArray(q.correctAnswer) && q.correctAnswer.length ? [...q.correctAnswer] : typeof q.correctAnswer === 'string' ? [q.correctAnswer] : [''],
        overrideJudgment: hasJ,
        caseSensitive: q.caseSensitive ?? g.caseSensitive,
        whitespaceSensitive: q.whitespaceSensitive ?? g.whitespaceSensitive,
        fuzzyMatch: q.fuzzyMatch ?? g.fuzzyMatch,
        fuzzyDistance: q.fuzzyDistance ?? g.fuzzyDistance,
      }
    }
    case 'essay':
      return { ...base, rubric: q.rubric || '' }
    case 'numerical':
      return { ...base, correctNum: q.correctAnswer != null ? String(q.correctAnswer) : '', tolerance: q.tolerance != null ? String(q.tolerance) : '0' }
    case 'formula':
      return { ...base, variables: q.variables?.length ? q.variables.map(v => ({ ...v })) : [{ name: '', min: '1', max: '10', decimals: '0' }], formula: q.formula || '', tolerance: q.tolerance != null ? String(q.tolerance) : '0', toleranceType: q.toleranceType || 'absolute', answerDecimals: q.answerDecimals != null ? String(q.answerDecimals) : '2', solutions: q.solutions || [] }
    case 'matching':
      return { ...base, pairs: q.pairs?.length ? q.pairs.map(p => ({ ...p })) : [{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }], distractors: q.distractors?.length ? [...q.distractors] : [], overrideScoring: q.scoringMode != null, scoringMode: q.scoringMode ?? getGlobalMatchingDefault() }
    case 'fill_in_multiple_blanks': {
      let blanks = []
      if (Array.isArray(q.correctAnswer) && q.correctAnswer.length) {
        blanks = q.correctAnswer.map(b => Array.isArray(b) ? [...b] : [b])
      }
      // 레거시 호환: 본문에 [빈칸N] 표식이 없으면 끝에 자동 추가
      let text = q.text || ''
      if (blanks.length > 0 && !hasAllBlankPlaceholders(text, blanks.length)) {
        const missing = []
        for (let i = 1; i <= blanks.length; i++) {
          if (!text.includes(`[빈칸${i}]`)) missing.push(`[빈칸${i}]`)
        }
        text = (text + (text ? ' ' : '') + missing.join(' ')).trim()
      }
      return {
        ...base,
        text,
        blanks,
      }
    }
    case 'multiple_dropdowns': {
      const dropdowns = q.dropdowns?.length
        ? q.dropdowns.map(d => ({ options: [...d.options], answerIdx: d.answerIdx ?? 0 }))
        : []
      let text = q.text || ''
      if (dropdowns.length > 0 && !hasAllDropdownPlaceholders(text, dropdowns.length)) {
        const missing = []
        for (let i = 1; i <= dropdowns.length; i++) {
          if (!text.includes(`[드롭다운${i}]`)) missing.push(`[드롭다운${i}]`)
        }
        text = (text + (text ? ' ' : '') + missing.join(' ')).trim()
      }
      return { ...base, text, dropdowns }
    }
    case 'file_upload':
      return base
    case 'text':
      return { title: q.title || '', text: q.text || '', points: 0, difficulty: '' }
    default:
      return base
  }
}

// ── 정답 변경 감지 ────────────────────────────────────────────────────────
function hasAnswerChanged(type, oldQuestion, newQuestion) {
  switch (type) {
    case 'multiple_choice':
    case 'true_false':
      return String(oldQuestion.correctAnswer).trim().toLowerCase() !== String(newQuestion.correctAnswer).trim().toLowerCase()
    case 'multiple_answers': {
      const toArr = v => (Array.isArray(v) ? v : []).map(s => String(s).trim().toLowerCase()).sort()
      if (JSON.stringify(toArr(oldQuestion.correctAnswer)) !== JSON.stringify(toArr(newQuestion.correctAnswer))) return true
      // 부분 점수 정책(문항 단위 override) 변경도 채점 결과에 영향
      if ((oldQuestion.scoringMode ?? null) !== (newQuestion.scoringMode ?? null)) return true
      if ((oldQuestion.penaltyMethod ?? null) !== (newQuestion.penaltyMethod ?? null)) return true
      return false
    }
    case 'short_answer': {
      const toArr = v => (Array.isArray(v) ? v : []).map(s => String(s).trim().toLowerCase()).sort()
      return JSON.stringify(toArr(oldQuestion.correctAnswer)) !== JSON.stringify(toArr(newQuestion.correctAnswer))
    }
    case 'fill_in_multiple_blanks': {
      const toArr = v => (Array.isArray(v) ? v : []).map(s =>
        Array.isArray(s) ? s.map(a => String(a).trim().toLowerCase()) : [String(s).trim().toLowerCase()]
      )
      return JSON.stringify(toArr(oldQuestion.correctAnswer)) !== JSON.stringify(toArr(newQuestion.correctAnswer))
    }
    case 'numerical':
      return Number(oldQuestion.correctAnswer) !== Number(newQuestion.correctAnswer) ||
        (oldQuestion.tolerance ?? 0) !== (newQuestion.tolerance ?? 0)
    case 'matching':
      return JSON.stringify(oldQuestion.pairs) !== JSON.stringify(newQuestion.pairs) ||
        JSON.stringify(oldQuestion.distractors || []) !== JSON.stringify(newQuestion.distractors || [])
    case 'multiple_dropdowns':
      return JSON.stringify(oldQuestion.dropdowns) !== JSON.stringify(newQuestion.dropdowns)
    case 'formula':
      return oldQuestion.formula !== newQuestion.formula ||
        JSON.stringify(oldQuestion.variables) !== JSON.stringify(newQuestion.variables) ||
        (oldQuestion.tolerance ?? 0) !== (newQuestion.tolerance ?? 0) ||
        (oldQuestion.toleranceType ?? 'absolute') !== (newQuestion.toleranceType ?? 'absolute')
    default:
      return false
  }
}

function isAutoGradeable(type) {
  const ag = QUIZ_TYPES[type]?.autoGrade
  return ag === true || ag === 'partial'
}

// ── 메인 모달 ──────────────────────────────────────────────────────────────
export default function AddQuestionModal({ onClose, onAdd, initialQuestion = null, submittedCount = 0 }) {
  const isEditMode = !!initialQuestion

  const [step, setStep] = useState(isEditMode ? 'form' : 'type')
  const [selectedType, setSelectedType] = useState(isEditMode ? initialQuestion.type : null)
  const [hoveredType, setHoveredType] = useState(null)
  const bodyTextareaRef = useRef(null)
  const [form, setForm] = useState(() => {
    if (isEditMode) return questionToForm(initialQuestion)
    return { title: '', text: '', points: 5 }
  })

  const handleSelectType = (type) => {
    setSelectedType(type)
    setForm(initForm(type))
    setStep('form')
  }

  const handleBack = () => {
    if (isEditMode) { onClose(); return }
    setStep('type')
    setSelectedType(null)
    setHoveredType(null)
  }

  const [showRegradeOptions, setShowRegradeOptions] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState(null)
  const [feedbackOpen, setFeedbackOpen] = useState(() => {
    if (!isEditMode) return false
    return !!(initialQuestion?.correct_comments || initialQuestion?.incorrect_comments || initialQuestion?.neutral_comments)
  })

  const handleAdd = () => {
    if (!isValid(selectedType, form)) return
    const built = buildQuestion(selectedType, form)

    // 편집 모드 + 제출 학생 있음 + 자동채점 유형 + 정답 변경됨 → 재채점 옵션 모달
    if (isEditMode && submittedCount > 0 && isAutoGradeable(selectedType) && hasAnswerChanged(selectedType, initialQuestion, built)) {
      setPendingQuestion(built)
      setShowRegradeOptions(true)
      return
    }

    onAdd(built)
    onClose()
  }

  const handleRegradeConfirm = (option) => {
    onAdd(pendingQuestion, option, initialQuestion)
    setShowRegradeOptions(false)
    onClose()
  }

  const typeInfo = selectedType ? QUIZ_TYPES[selectedType] : null

  return (
    <Dialog open={true} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-6xl w-[calc(100vw-24px)] sm:w-[calc(100vw-64px)] min-h-[480px] sm:min-h-[600px] max-h-[90vh] flex flex-col p-0 gap-0">
        {/* 헤더 */}
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
          <DialogTitle>{isEditMode ? '문항 편집' : '문항 직접 추가'}</DialogTitle>
          {step === 'form' && typeInfo && (
            <DialogDescription className="flex items-center gap-1">
              <span className={cn(
                'w-2 h-2 rounded-full inline-block',
                typeInfo.autoGrade === null ? 'bg-neutral-400' : typeInfo.autoGrade === false ? 'bg-warning-foreground' : typeInfo.autoGrade === 'partial' ? 'bg-warning' : 'bg-success'
              )} />
              {typeInfo.label} · {typeInfo.autoGrade === null ? '채점 없음' : typeInfo.autoGrade === false ? '수동채점' : typeInfo.autoGrade === 'partial' ? '부분자동' : '자동채점'}
            </DialogDescription>
          )}
          {step === 'type' && (
            <DialogDescription>추가할 문항 유형을 선택하세요</DialogDescription>
          )}
        </DialogHeader>

        {step === 'type' ? (
          /* 유형 선택 — 좌: 목록, 우: 미리보기 */
          <div className="flex flex-1 min-h-[360px] sm:min-h-[400px]">
            <div className="flex-1 p-4 sm:p-6 sm:border-r border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto scrollbar-thin">
                {Object.entries(QUIZ_TYPES).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => handleSelectType(key)}
                    onMouseEnter={() => setHoveredType(key)}
                    onMouseLeave={() => setHoveredType(null)}
                    className={cn(
                      'flex items-center gap-2.5 p-3 text-left transition-all rounded border',
                      hoveredType === key
                        ? cn(getTypeTw(key).border, getTypeTw(key).bg)
                        : 'border-border bg-transparent'
                    )}
                  >
                    {(() => {
                      const meta = TYPE_META[key]
                      const tw = getTypeTw(key)
                      return meta ? (
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border', tw.bg, tw.iconBorder)}>
                          <meta.Icon size={15} className={tw.text} />
                        </div>
                      ) : (
                        <span className="w-2 h-2 rounded-full shrink-0 bg-neutral-400" />
                      )
                    })()}
                    <div>
                      <p className="text-[15px] font-medium text-foreground">{val.label}</p>
                      <p className="text-xs mt-0.5 text-muted-foreground">{TYPE_META[key]?.desc ?? ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {/* 미리보기 패널 (데스크톱만) */}
            <div className="w-64 p-6 hidden sm:flex flex-col bg-background">
              <QuestionTypePreview type={hoveredType} />
            </div>
          </div>
        ) : (
          /* 문항 폼 */
          <div className="flex-1 px-4 sm:px-6 pt-4 sm:pt-5 pb-5 sm:pb-6 space-y-5 overflow-y-auto max-h-[70vh]">
            {isEditMode && submittedCount > 0 && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-warning-bg/40 border border-warning-border">
                <p className="text-xs leading-relaxed text-slate-600">
                  이 문항은 이미 <span className="font-bold">{submittedCount}명</span>이 응시했습니다. 정답을 수정하고 저장하면 재채점 방식을 선택할 수 있습니다.
                </p>
              </div>
            )}
            {/* 제목 + 배점 + 난이도 */}
            <div className={cn('grid gap-3', selectedType === 'text' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-[1fr_5rem_8rem]')}>
              <div>
                <label className="text-[15px] font-medium block mb-1.5 text-foreground">
                  {selectedType === 'text' ? '안내문 제목' : '문항 제목'}
                </label>
                <input type="text" value={form.title || ''} maxLength={120}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={selectedType === 'text' ? '안내문 제목을 입력하세요' : '문항 제목을 입력하세요'}
                  className="w-full h-9 bg-white text-[15px] px-3 rounded-lg focus:outline-none border border-border text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </div>
              {selectedType !== 'text' && (
                <>
                  <div>
                    <label className="text-[15px] font-medium block mb-1.5 text-foreground">배점 <span className="text-destructive">*</span></label>
                    <input type="number" value={form.points} min={0} step={0.5}
                      onChange={e => setForm(prev => ({ ...prev, points: e.target.value }))}
                      className="w-full h-9 bg-white text-[15px] px-3 rounded-lg focus:outline-none border border-border text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                  <div>
                    <label className="text-[15px] font-medium block mb-1.5 text-foreground">난이도</label>
                    <DropdownSelect
                      value={form.difficulty || ''}
                      onChange={v => setForm(prev => ({ ...prev, difficulty: v }))}
                      options={[
                        { value: '', label: '미설정' },
                        { value: 'high', label: '상' },
                        { value: 'medium', label: '중' },
                        { value: 'low', label: '하' },
                      ]}
                    />
                  </div>
                </>
              )}
            </div>

            {/* 문항 내용 */}
            <div>
              <label className="text-[15px] font-medium block mb-1.5 text-foreground">
                {selectedType === 'text' ? '안내문 내용' : selectedType === 'formula' ? '문항 설명' : '문항 내용'}
                {' '}<span className="text-destructive">*</span>
              </label>
              {/* fill_in_multiple_blanks / multiple_dropdowns / formula 는 본문에 [빈칸N]/[드롭다운N] 토큰 삽입 동작 + 변수명 [a] 등 plain text 가 필요해서 textarea 유지 */}
              {(selectedType === 'fill_in_multiple_blanks' || selectedType === 'multiple_dropdowns' || selectedType === 'formula') ? (
                <textarea
                  ref={bodyTextareaRef}
                  value={form.text}
                  onChange={e => {
                    const newText = e.target.value
                    setForm(prev => {
                      const next = { ...prev, text: newText }
                      // 본문에 [빈칸N] / [드롭다운N] 을 직접 입력했을 때 form 항목 자동 확장
                      // (button 캡 6/4 까지만 확장; 캡 초과는 mismatch 경고로 안내)
                      if (selectedType === 'fill_in_multiple_blanks') {
                        const target = Math.min(maxBlankNumber(newText), 6)
                        const cur = prev.blanks || []
                        if (target > cur.length) {
                          const ext = [...cur]
                          while (ext.length < target) ext.push([''])
                          next.blanks = ext
                        }
                      } else if (selectedType === 'multiple_dropdowns') {
                        const target = Math.min(maxDropdownNumber(newText), 4)
                        const cur = prev.dropdowns || []
                        if (target > cur.length) {
                          const ext = [...cur]
                          while (ext.length < target) ext.push({ options: ['', ''], answerIdx: 0 })
                          next.dropdowns = ext
                        }
                      }
                      return next
                    })
                  }}
                  placeholder={
                    selectedType === 'formula'
                      ? '예: 5 더하기 [x]는 무엇입니까?  (변수는 아래에서 정의)'
                      : selectedType === 'fill_in_multiple_blanks'
                      ? '예: 장미는 [빈칸1], 제비꽃은 [빈칸2] 색이다.  (아래 "본문에 빈칸 삽입" 버튼 사용)'
                      : '예: 계절 중 가장 더운 때는 [드롭다운1]이다.  (아래 "본문에 드롭다운 삽입" 버튼 사용)'
                  }
                  rows={3}
                  autoFocus
                  className="w-full bg-white text-[15px] px-3 py-2.5 rounded-lg focus:outline-none resize-none border border-border text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              ) : (
                <RichTextEditor
                  value={form.text}
                  onChange={val => setForm(prev => ({ ...prev, text: val }))}
                  placeholder={selectedType === 'text' ? '학생에게 표시할 안내문을 입력하세요' : '문항을 입력하세요. 툴바에서 이미지/동영상을 본문 안에 삽입할 수 있습니다.'}
                  minHeight="min-h-[120px]"
                  autoFocus
                />
              )}
            </div>

            {selectedType !== 'text' && <div className="border-t border-border" />}

            {/* 유형별 전용 폼 */}
            <TypeForm type={selectedType} form={form} setForm={setForm} textareaRef={bodyTextareaRef} />

            {/* 응답 피드백 — text 유형은 숨김 */}
            {selectedType !== 'text' && (
              <div className="border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(prev => !prev)}
                  className="w-full flex items-center justify-between text-left"
                  aria-expanded={feedbackOpen}
                >
                  <div>
                    <span className="text-[15px] font-medium text-foreground">응답 피드백</span>
                    <p className="text-xs mt-0.5 text-muted-foreground">
                      학생에게 결과 공개 시 함께 표시됩니다. 결과 비공개 설정이면 노출되지 않습니다.
                    </p>
                  </div>
                  <ChevronDown
                    className={cn('w-4 h-4 text-muted-foreground transition-transform shrink-0 ml-3', feedbackOpen && 'rotate-180')}
                  />
                </button>
                {feedbackOpen && <div className="space-y-3 mt-3">
                  <div>
                    <label className="text-[13px] font-medium block mb-1 text-correct">정답 시</label>
                    <textarea
                      value={form.correct_comments || ''}
                      onChange={e => setForm(prev => ({ ...prev, correct_comments: e.target.value }))}
                      placeholder="예: 잘하셨어요! 핵심 개념을 정확히 이해하고 있습니다."
                      rows={2}
                      className="w-full bg-white text-[14px] px-2.5 py-2 rounded-lg focus:outline-none resize-none border border-border text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium block mb-1 text-destructive">오답 시</label>
                    <textarea
                      value={form.incorrect_comments || ''}
                      onChange={e => setForm(prev => ({ ...prev, incorrect_comments: e.target.value }))}
                      placeholder="예: 강의 노트 3페이지를 다시 확인해 보세요."
                      rows={2}
                      className="w-full bg-white text-[14px] px-2.5 py-2 rounded-lg focus:outline-none resize-none border border-border text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium block mb-1 text-secondary-foreground">무조건 표시</label>
                    <textarea
                      value={form.neutral_comments || ''}
                      onChange={e => setForm(prev => ({ ...prev, neutral_comments: e.target.value }))}
                      placeholder="예: 추가 자료는 강의 자료실에서 확인할 수 있습니다."
                      rows={2}
                      className="w-full bg-white text-[14px] px-2.5 py-2 rounded-lg focus:outline-none resize-none border border-border text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                </div>}
              </div>
            )}

            {/* 하단 버튼 */}
            <div className="flex items-center justify-between pt-3 border-t border-border gap-2 flex-wrap">
              {!isEditMode ? (
                <Button variant="ghost" onClick={handleBack} className="text-muted-foreground">
                  ← 유형 변경
                </Button>
              ) : <div />}
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" onClick={onClose}>취소</Button>
                <Button
                  disabled={!isValid(selectedType, form)}
                  onClick={handleAdd}
                >
                  {isEditMode ? '변경' : '추가'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
      {showRegradeOptions && (
        <RegradeOptionsModal
          submittedCount={submittedCount}
          questionLabel={initialQuestion?.order ? `Q${initialQuestion.order}` : ''}
          onConfirm={handleRegradeConfirm}
          onCancel={() => setShowRegradeOptions(false)}
        />
      )}
    </Dialog>
  )
}
