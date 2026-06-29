import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'
import { QUIZ_TYPES } from '../data/mockData'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { DropdownSelect } from './DropdownSelect'
import { RichTextEditor, richTextHasContent } from './RichText'
import {
  TYPE_META,
  getTypeTw,
  initForm,
  buildQuestion,
  isValid,
  TypeForm,
  questionToForm,
  hasAnswerChanged,
  isAutoGradeable,
} from './AddQuestionModal'
import RegradeOptionsModal from './RegradeOptionsModal'
import {
  countBlanks,
  countDropdowns,
  hasAllBlankPlaceholders,
  hasAllDropdownPlaceholders,
  maxBlankNumber,
  maxDropdownNumber,
} from '@/utils/placeholderUtils'

// ── 유형별 한 줄 예시 (드롭다운 옆 미리보기) ──────────────────────────────
const TYPE_EXAMPLE = {
  multiple_choice:         { q: '다음 중 소수는?', a: '① 1   ② 2 ✓   ③ 4   ④ 6' },
  true_false:              { q: '지구는 태양 주위를 공전한다.', a: '참 ✓ / 거짓' },
  multiple_answers:        { q: '다음 중 포유류를 모두 고르시오.', a: '고래 ✓   상어   박쥐 ✓   개구리' },
  short_answer:            { q: '대한민국의 수도는?', a: '정답: 서울 (Seoul, 서울특별시 모두 인정)' },
  essay:                   { q: '기후 변화의 원인과 해결 방안을 서술하시오.', a: '자유 서술 (교수자 직접 채점)' },
  numerical:               { q: '원주율 π의 근사값을 입력하시오.', a: '정답: 3.14 (±0.01 허용)' },
  formula:                 { q: '직각삼각형의 빗변 길이를 구하시오.', a: '변수 a, b 정의 → √(a²+b²) 자동 채점' },
  matching:                { q: '국가와 수도를 짝지으시오.', a: '한국 ↔ 서울 / 일본 ↔ 도쿄 / 프랑스 ↔ 파리' },
  fill_in_multiple_blanks: { q: '장미는 [빈칸1], 제비꽃은 [빈칸2] 색이다.', a: '[빈칸1] 빨강 · [빈칸2] 보라' },
  multiple_dropdowns:      { q: '계절 중 가장 더운 때는 [드롭다운1]이다.', a: '[드롭다운1] 봄 / 여름 ✓ / 가을 / 겨울' },
  file_upload:             { q: '과제 보고서를 파일로 제출하시오.', a: 'PDF, DOC, HWP 등 파일 업로드 (교수자 채점)' },
  text:                    { q: '본문은 학생에게 안내문으로 표시됩니다.', a: '채점 없음 · 배점/난이도 적용 안 됨' },
}

function TypeExample({ type }) {
  const ex = TYPE_EXAMPLE[type]
  if (!ex) return null
  return (
    <div className="hidden sm:flex flex-1 min-w-0 items-center px-3 h-9 rounded-lg bg-secondary/40 border border-dashed border-border">
      <span className="text-[11px] font-semibold text-muted-foreground shrink-0 mr-2">예시</span>
      <span className="text-[12px] text-secondary-foreground truncate">
        <span className="font-medium text-foreground">Q.</span> {ex.q}
        <span className="mx-1.5 text-muted-foreground/60">→</span>
        <span className="text-muted-foreground">{ex.a}</span>
      </span>
    </div>
  )
}

// ── 시각적 유형 선택기 (아이콘 + 설명) ──────────────────────────────────────
function TypePickerTrigger({ type }) {
  const tw = getTypeTw(type)
  const meta = TYPE_META[type]
  const label = QUIZ_TYPES[type]?.label ?? '유형 선택'
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2.5 h-9 pl-2 pr-3 rounded-lg border border-border bg-white hover:border-slate-300 transition-colors min-w-[14rem]"
    >
      {meta ? (
        <span className={cn('w-6 h-6 rounded-md flex items-center justify-center border shrink-0', tw.bg, tw.iconBorder)}>
          <meta.Icon size={13} className={tw.text} />
        </span>
      ) : (
        <span className="w-6 h-6 rounded-md shrink-0 bg-neutral-100" />
      )}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[13px] font-medium text-foreground leading-none truncate">{label}</p>
        {meta?.desc && <p className="text-[11px] text-muted-foreground mt-0.5 leading-none truncate">{meta.desc}</p>}
      </div>
      <ChevronDown size={14} className="text-muted-foreground shrink-0" />
    </button>
  )
}

function TypePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div>
          <TypePickerTrigger type={value} />
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-[34rem] max-w-[calc(100vw-32px)] p-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {Object.entries(QUIZ_TYPES).map(([key, val]) => {
            const meta = TYPE_META[key]
            const tw = getTypeTw(key)
            const active = key === value
            return (
              <button
                key={key}
                type="button"
                onClick={() => { onChange(key); setOpen(false) }}
                className={cn(
                  'flex items-center gap-2.5 p-2.5 text-left rounded-lg border transition-all',
                  active
                    ? cn(tw.border, tw.bg)
                    : 'border-transparent hover:border-border hover:bg-secondary/50'
                )}
              >
                {meta ? (
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border', tw.bg, tw.iconBorder)}>
                    <meta.Icon size={15} className={tw.text} />
                  </div>
                ) : (
                  <span className="w-2 h-2 rounded-full shrink-0 bg-neutral-400" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className={cn('text-[14px] font-medium leading-none', active ? 'text-primary' : 'text-foreground')}>{val.label}</p>
                    {active && <Check size={12} className="text-primary" strokeWidth={3} />}
                  </div>
                  <p className="text-[11px] mt-1 text-muted-foreground leading-tight">{meta?.desc ?? ''}</p>
                </div>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ── 인라인 문항 편집기 (페이지에 직접 추가) ────────────────────────────────
export default function InlineQuestionEditor({ index, prevType, initialQuestion = null, submittedCount = 0, onAdd, onCancel, onDirtyChange }) {
  const isEditMode = !!initialQuestion
  // 추가: 직전 문항 유형을 기본값으로 이어받음 (예: 참/거짓 다음엔 참/거짓). 유효하지 않으면 객관식
  // 편집: 해당 문항의 유형으로 시작
  const initialType = isEditMode
    ? initialQuestion.type
    : (QUIZ_TYPES[prevType] ? prevType : 'multiple_choice')
  const [selectedType, setSelectedType] = useState(initialType)
  const [form, setForm] = useState(() =>
    isEditMode
      ? questionToForm(initialQuestion)
      : { ...initForm(initialType), title: `문항${index + 1}` }
  )
  const [feedbackOpen, setFeedbackOpen] = useState(() =>
    isEditMode
      ? !!(initialQuestion?.correct_comments || initialQuestion?.incorrect_comments || initialQuestion?.neutral_comments)
      : false
  )
  const [showRegradeOptions, setShowRegradeOptions] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState(null)
  const bodyTextareaRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  // 부모에게 dirty 상태 알림 — 기본 제목 외 제목 변경 또는 본문 입력이 있으면 dirty (추가 모드 전용)
  const defaultTitle = `문항${index + 1}`
  useEffect(() => {
    if (!onDirtyChange || isEditMode) return
    const titleHas = (form.title || '').trim().length > 0 && (form.title || '').trim() !== defaultTitle
    const textHas = richTextHasContent(form.text || '')
    onDirtyChange(titleHas || textHas)
    return () => onDirtyChange(false)
  }, [form.title, form.text, onDirtyChange, defaultTitle, isEditMode])

  const handleTypeChange = (newType) => {
    if (newType === selectedType) return
    setSelectedType(newType)
    setForm(prev => {
      const next = initForm(newType)
      return {
        ...next,
        title: prev.title ?? '',
        difficulty: prev.difficulty ?? '',
      }
    })
  }

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
  }

  const handleRegradeConfirm = (option) => {
    onAdd(pendingQuestion, option, initialQuestion)
    setShowRegradeOptions(false)
  }

  const typeInfo = QUIZ_TYPES[selectedType]
  const valid = isValid(selectedType, form)

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-lg border-2 border-primary/40 shadow-sm overflow-hidden"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-border bg-accent/30">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xs font-bold w-5 text-center text-primary">{index + 1}</span>
          <span className="text-[13px] font-semibold text-primary">{isEditMode ? '문항 편집' : '새 문항'}</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              typeInfo?.autoGrade === null ? 'bg-neutral-400' : typeInfo?.autoGrade === false ? 'bg-warning-foreground' : typeInfo?.autoGrade === 'partial' ? 'bg-warning' : 'bg-success'
            )} />
            {typeInfo?.autoGrade === null ? '채점 없음' : typeInfo?.autoGrade === false ? '수동채점' : typeInfo?.autoGrade === 'partial' ? '부분자동' : '자동채점'}
          </span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          title={isEditMode ? '편집 취소' : '추가 취소'}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* 본문 */}
      <div className="px-3.5 sm:px-5 py-4 sm:py-5 space-y-5">
        {/* 유형 선택 */}
        <div>
          <label className="text-[13px] font-medium block mb-1.5 text-secondary-foreground">문항 유형</label>
          <div className="flex items-stretch gap-2.5">
            <TypePicker value={selectedType} onChange={handleTypeChange} />
            <TypeExample type={selectedType} />
          </div>
        </div>

        {/* 제목 + 배점 + 난이도 */}
        <div className={cn('grid gap-3', selectedType === 'text' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-[1fr_5rem_8rem]')}>
          <div>
            <label className="text-[13px] font-medium block mb-1.5 text-secondary-foreground">
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
                <label className="text-[13px] font-medium block mb-1.5 text-secondary-foreground">배점 <span className="text-destructive">*</span></label>
                <input type="number" value={form.points} min={0} step={0.5}
                  onChange={e => setForm(prev => ({ ...prev, points: e.target.value }))}
                  className="w-full h-9 bg-white text-[15px] px-3 rounded-lg focus:outline-none border border-border text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </div>
              <div>
                <label className="text-[13px] font-medium block mb-1.5 text-secondary-foreground">난이도</label>
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

        {/* 문제 내용 */}
        <div>
          <label className="text-[13px] font-medium block mb-1.5 text-secondary-foreground">
            {selectedType === 'text' ? '안내문 내용' : selectedType === 'formula' ? '문항 설명' : '문항 내용'}
            {' '}<span className="text-destructive">*</span>
          </label>
          {(selectedType === 'fill_in_multiple_blanks' || selectedType === 'multiple_dropdowns' || selectedType === 'formula') ? (
            <textarea
              ref={bodyTextareaRef}
              value={form.text}
              onChange={e => {
                const newText = e.target.value
                setForm(prev => {
                  const next = { ...prev, text: newText }
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
              className="w-full bg-white text-[15px] px-3 py-2.5 rounded-lg focus:outline-none resize-none border border-border text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          ) : (
            <RichTextEditor
              value={form.text}
              onChange={val => setForm(prev => ({ ...prev, text: val }))}
              placeholder={selectedType === 'text' ? '학생에게 표시할 안내문을 입력하세요' : '문항을 입력하세요. 툴바에서 이미지/동영상을 본문 안에 삽입할 수 있습니다.'}
              minHeight="min-h-[120px]"
            />
          )}
          {/* placeholder 사용량 안내 (modal 과 동일) */}
          {selectedType === 'fill_in_multiple_blanks' && form.blanks?.length > 0 && countBlanks(form.text) !== form.blanks.length && !hasAllBlankPlaceholders(form.text, form.blanks.length) && null}
          {selectedType === 'multiple_dropdowns' && form.dropdowns?.length > 0 && countDropdowns(form.text) !== form.dropdowns.length && !hasAllDropdownPlaceholders(form.text, form.dropdowns.length) && null}
        </div>

        {selectedType !== 'text' && <div className="border-t border-border" />}

        {/* 유형별 전용 폼 */}
        <TypeForm type={selectedType} form={form} setForm={setForm} textareaRef={bodyTextareaRef} />

        {/* 응답 피드백 */}
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
      </div>

      {/* 푸터 */}
      <div className="flex items-center justify-end gap-2 px-3.5 sm:px-5 py-3 border-t border-border bg-secondary/30">
        <Button variant="outline" onClick={onCancel}>취소</Button>
        <Button disabled={!valid} onClick={handleAdd}>{isEditMode ? '저장' : '문항 추가'}</Button>
      </div>

      {showRegradeOptions && (
        <RegradeOptionsModal
          submittedCount={submittedCount}
          questionLabel={initialQuestion?.order ? `Q${initialQuestion.order}` : ''}
          onConfirm={handleRegradeConfirm}
          onCancel={() => setShowRegradeOptions(false)}
        />
      )}
    </div>
  )
}
