import { Search, X } from 'lucide-react'
import { QUIZ_TYPES } from '../data/mockData'
import { DropdownSelect } from './DropdownSelect'
import { cn } from '@/lib/utils'
import { DIFFICULTY_META, DIFF_LABEL } from './bankDifficulty'

export function DiffBadge({ difficulty, className }) {
  const meta = difficulty && DIFFICULTY_META[difficulty]
  return (
    <span className={cn('text-xs px-1.5 py-0.5 font-medium rounded-md', meta ? meta.cls : 'text-muted-foreground bg-secondary', className)}>
      {meta ? meta.label : '미지정'}
    </span>
  )
}

export function WizardSteps({ step, labels }) {
  return (
    <div className="flex items-center">
      {labels.map((label, i) => {
        const num = i + 1
        const isActive = step === num
        const isDone = step > num
        return (
          <div key={num} className="flex items-center">
            {i > 0 && <div className={cn('w-8 h-px mx-2', isDone ? 'bg-primary' : 'bg-border')} />}
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-semibold leading-none',
                isActive || isDone ? 'bg-primary text-white' : 'border border-border text-muted-foreground'
              )}>
                {isDone ? '\u2713' : num}
              </span>
              <span className={cn(
                'text-xs',
                isActive ? 'text-foreground font-semibold' : isDone ? 'text-secondary-foreground' : 'text-muted-foreground'
              )}>
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function QuestionRow({ q, selected, selectable, onToggle }) {
  return (
    <div
      onClick={() => selectable && onToggle(q)}
      className={cn(
        'flex items-start gap-2.5 px-3 py-2.5 border rounded-lg transition-all',
        selected ? 'border-primary bg-accent' : 'border-border',
        selectable ? 'cursor-pointer hover:border-primary/40' : 'cursor-not-allowed opacity-40'
      )}
    >
      <input type="checkbox" checked={selected} readOnly disabled={!selectable} className="mt-0.5 shrink-0 accent-primary" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <DiffBadge difficulty={q.difficulty} />
          <span className="text-[11px] px-1.5 py-0.5 font-medium rounded bg-secondary text-secondary-foreground">
            {QUIZ_TYPES[q.type]?.label}
          </span>
          <span className="text-[11px] text-muted-foreground">{q.points}점</span>
          {q._sourceBankName && (
            <span className="text-[11px] text-muted-foreground">{q._sourceBankName}</span>
          )}
        </div>
        <p className="text-xs leading-relaxed line-clamp-2 text-secondary-foreground">{q.text}</p>
      </div>
    </div>
  )
}

export function ReviewRow({ q, index, onRemove }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 border border-border rounded-lg">
      <span className="text-[11px] font-mono text-muted-foreground shrink-0 w-4 text-right">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <DiffBadge difficulty={q.difficulty} />
          <span className="text-[11px] text-secondary-foreground">{QUIZ_TYPES[q.type]?.label}</span>
          <span className="text-[11px] text-muted-foreground">{q.points}점</span>
        </div>
        <p className="text-xs leading-relaxed line-clamp-1 text-secondary-foreground mt-0.5">{q.text}</p>
      </div>
      <button
        onClick={() => onRemove(q.id)}
        className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-incorrect-bg transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function WizardDifficultySelector({ value, allowedDifficulties, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs shrink-0 text-muted-foreground">난이도</span>
      {['', 'high', 'medium', 'low'].map(d => {
        const isAllowed = allowedDifficulties.includes(d)
        const isActive = value === d
        return (
          <button
            key={d}
            type="button"
            disabled={!isAllowed}
            onClick={() => onChange(d)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-md border transition-all font-medium disabled:opacity-30 disabled:cursor-not-allowed',
              isActive ? 'border-primary bg-primary text-white' : 'border-border text-secondary-foreground hover:border-primary/40'
            )}
          >
            {DIFF_LABEL[d]}
          </button>
        )
      })}
    </div>
  )
}

export function WizardSourceBankList({ availableCourses, courseGroups, selectedSourceIds, onToggle }) {
  return (
    <>
      {availableCourses.map(c => {
        const list = (courseGroups[c.name] || [])
        if (list.length === 0) return null
        return (
          <div key={c.id}>
            <p className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground bg-secondary/60 border-b border-border/60">{c.name}</p>
            {list.map(b => {
              const isChecked = selectedSourceIds.includes(b.id)
              return (
                <label
                  key={b.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors border-l-2',
                    isChecked ? 'border-l-primary bg-accent font-medium text-primary' : 'border-l-transparent text-secondary-foreground hover:bg-secondary/40'
                  )}
                >
                  <input type="checkbox" checked={isChecked} onChange={() => onToggle(b.id)} className="accent-primary shrink-0" />
                  <DiffBadge difficulty={b.difficulty} />
                  <span className="truncate flex-1">{b.name}</span>
                </label>
              )
            })}
          </div>
        )
      })}
    </>
  )
}

// Step 1 공통: 소스 사이드바 + 문항 체크리스트
export function WizardStep1({ courseSearch, setCourseSearch, availableCourses, courseGroups, selectedSourceIds, handleSourceToggle, filterType, setFilterType, filterDifficulty, setFilterDifficulty, filtered, selectedQuestionIds, allFilteredSelected, someFilteredSelected, toggle, toggleAll }) {
  return (
    <div className="flex flex-1 min-h-0">
      {/* 사이드바 */}
      <div className="flex flex-col shrink-0 w-[200px] border-r border-border">
        <div className="px-3 pt-3 pb-2 shrink-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">소스 문제은행</p>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={courseSearch}
              onChange={e => setCourseSearch(e.target.value)}
              placeholder="검색"
              className="w-full text-xs pl-7 pr-2 py-1.5 border border-border rounded-md focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <WizardSourceBankList
            availableCourses={availableCourses}
            courseGroups={courseGroups}
            selectedSourceIds={selectedSourceIds}
            onToggle={handleSourceToggle}
          />
        </div>
      </div>

      {/* 문항 리스트 */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="px-4 py-2.5 shrink-0 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DropdownSelect
              value={filterType}
              onChange={setFilterType}
              filterMode
              options={[
                { value: 'all', label: '모든 유형' },
                ...Object.entries(QUIZ_TYPES).map(([k, v]) => ({ value: k, label: v.label })),
              ]}
            />
            <DropdownSelect
              value={filterDifficulty}
              onChange={setFilterDifficulty}
              filterMode
              options={[
                { value: 'all', label: '모든 난이도' },
                { value: '', label: '미지정' },
                { value: 'high', label: '상' },
                { value: 'medium', label: '중' },
                { value: 'low', label: '하' },
              ]}
            />
          </div>
        </div>
        {selectedSourceIds.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[15px] text-muted-foreground">좌측에서 소스 문제은행을 선택하세요</p>
          </div>
        ) : (
          <>
            {filtered.length > 0 && (
              <div className="px-4 py-2 flex items-center justify-between border-b border-border/60">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={el => { if (el) el.indeterminate = someFilteredSelected }}
                    onChange={toggleAll}
                    className="accent-primary"
                  />
                  <span className="text-xs text-secondary-foreground">{allFilteredSelected ? '전체 해제' : '전체 선택'}</span>
                </label>
                <span className="text-xs text-muted-foreground">총 {filtered.length}개</span>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-[15px] text-muted-foreground">해당하는 문항이 없습니다</p>
              ) : (
                filtered.map(q => (
                  <QuestionRow
                    key={q.id}
                    q={q}
                    selected={selectedQuestionIds.includes(q.id)}
                    selectable={true}
                    onToggle={toggle}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
