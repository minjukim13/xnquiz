import { useState, useMemo } from 'react'
import { X, Plus, UserPlus } from 'lucide-react'
import { mockStudents } from '../data/mockData'
import { Button } from '@/components/ui/button'
import DateTimePicker from './DateTimePicker'
import AssignTargetModal from './AssignTargetModal'

const STUDENT_INFO = mockStudents.slice(0, 30).reduce((acc, s) => {
  acc[s.id] = { name: s.name, studentId: s.studentId, department: s.department }
  return acc
}, {})

function TargetTable({ assignTo, onRemove }) {
  if (assignTo.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-white px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">선택된 대상이 없습니다. 아래 [대상 선택] 버튼으로 추가해주세요.</p>
      </div>
    )
  }

  const groups = assignTo.filter(t => t.type === 'group')
  const students = assignTo.filter(t => t.type === 'student')

  return (
    <div className="rounded-md border border-border bg-white overflow-hidden">
      {groups.length > 0 && (
        <div className="divide-y divide-secondary">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground bg-secondary/40">학과 그룹 ({groups.length})</div>
          {groups.map(t => (
            <div key={`group:${t.id}`} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">그룹</span>
                <span className="font-medium text-foreground">{t.label}</span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(`group:${t.id}`)}
                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive-soft transition-colors cursor-pointer"
                aria-label="제거"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      {students.length > 0 && (
        <div className="divide-y divide-secondary">
          <div className="grid grid-cols-[1.4fr_1fr_1.4fr_40px] items-center px-3 py-1.5 text-[11px] font-semibold text-muted-foreground bg-secondary/40">
            <span>이름</span>
            <span>학번</span>
            <span>학과</span>
            <span></span>
          </div>
          {students.map(t => {
            const info = STUDENT_INFO[t.id] || { name: t.label, studentId: '-', department: '-' }
            return (
              <div key={`student:${t.id}`} className="grid grid-cols-[1.4fr_1fr_1.4fr_40px] items-center px-3 py-2 text-sm">
                <span className="font-medium text-foreground truncate">{info.name}</span>
                <span className="text-muted-foreground tabular-nums truncate">{info.studentId}</span>
                <span className="text-muted-foreground truncate">{info.department}</span>
                <button
                  type="button"
                  onClick={() => onRemove(`student:${t.id}`)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive-soft transition-colors cursor-pointer justify-self-end"
                  aria-label="제거"
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AssignmentOverrides({ assignments, onChange }) {
  const [modalFor, setModalFor] = useState(null) // 모달 띄울 assignment id

  const update = (id, field, val) => onChange(assignments.map(a => a.id === id ? { ...a, [field]: val } : a))
  const remove = (id) => onChange(assignments.filter(a => a.id !== id))
  const add = () => onChange([
    ...assignments,
    { id: `a${Date.now()}`, assignTo: [], dueDate: '', availableFrom: '', availableUntil: '' },
  ])

  const targetAssignment = useMemo(
    () => assignments.find(a => a.id === modalFor),
    [assignments, modalFor],
  )

  const removeOne = (assignmentId, key) => {
    const a = assignments.find(x => x.id === assignmentId)
    if (!a) return
    update(assignmentId, 'assignTo', a.assignTo.filter(t => `${t.type}:${t.id}` !== key))
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        특정 학생 또는 학과(그룹)에 기본 응시 기간과 다른 마감일 또는 열람 기간을 개별 설정합니다.
      </p>
      {assignments.map((a, idx) => {
        const usedStudents = new Set()
        assignments.forEach(other => {
          if (other.id !== a.id) other.assignTo.filter(t => t.type === 'student').forEach(t => usedStudents.add(t.id))
        })
        return (
          <div key={a.id} className="p-3 rounded-md space-y-3 border border-border bg-slate-50/60">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">추가 대상 {idx + 1}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(a.id)}
                className="h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive-soft"
              >
                삭제
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">
                  대상 학생/그룹
                  {a.assignTo.length > 0 && <span className="ml-1.5 text-secondary-foreground font-medium">({a.assignTo.length})</span>}
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalFor(a.id)}
                  className="h-7 px-2.5"
                >
                  <UserPlus size={13} />
                  대상 선택
                </Button>
              </div>
              <TargetTable
                assignTo={a.assignTo}
                onRemove={(key) => removeOne(a.id, key)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs mb-1 text-muted-foreground">시작 일시</label>
                <DateTimePicker
                  value={a.availableFrom}
                  onChange={v => update(a.id, 'availableFrom', v)}
                  size="sm"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-muted-foreground">마감 일시</label>
                <DateTimePicker
                  value={a.dueDate}
                  onChange={v => update(a.id, 'dueDate', v)}
                  size="sm"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-muted-foreground">이용 종료 일시</label>
                <DateTimePicker
                  value={a.availableUntil}
                  onChange={v => update(a.id, 'availableUntil', v)}
                  size="sm"
                />
              </div>
            </div>
            {a.dueDate && a.availableFrom && new Date(a.dueDate) <= new Date(a.availableFrom) && (
              <p className="text-xs text-destructive">마감 일시는 시작 일시 이후여야 합니다.</p>
            )}
            {a.availableUntil && a.dueDate && new Date(a.availableUntil) < new Date(a.dueDate) && (
              <p className="text-xs text-destructive">이용 종료 일시는 마감 일시 이후로 설정해주세요.</p>
            )}
          </div>
        )
      })}
      <button
        onClick={add}
        className="w-full text-sm py-2 rounded-md border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary hover:bg-accent/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <Plus size={14} />
        추가 기간 설정 추가
      </button>

      <AssignTargetModal
        open={!!targetAssignment}
        onOpenChange={(v) => { if (!v) setModalFor(null) }}
        initialSelected={targetAssignment?.assignTo || []}
        excludeStudentIds={useMemo(() => {
          const set = new Set()
          assignments.forEach(other => {
            if (other.id !== modalFor) other.assignTo.filter(t => t.type === 'student').forEach(t => set.add(t.id))
          })
          return set
        }, [assignments, modalFor])}
        onConfirm={(result) => {
          if (modalFor) update(modalFor, 'assignTo', result)
          setModalFor(null)
        }}
      />
    </div>
  )
}
