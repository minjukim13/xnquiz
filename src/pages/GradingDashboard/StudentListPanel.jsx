import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'
import StudentListItem from './StudentListItem'

function Section({ label, variant, students, selectedStudent, onSelect }) {
  if (students.length === 0) return null
  const labelColor = variant === 'muted' ? 'text-muted-foreground' : 'text-secondary-foreground'
  return (
    <div>
      <div className="px-1 pt-1 pb-1 flex items-center gap-2">
        <span className={cn('text-xs font-semibold', labelColor)}>{label}</span>
        <span className="text-xs text-caption">{students.length}명</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div>
        {students.map(s => (
          <StudentListItem
            key={s.id}
            student={s}
            selected={selectedStudent?.id === s.id}
            onClick={() => onSelect(s)}
          />
        ))}
      </div>
    </div>
  )
}

export default function StudentListPanel({
  studentSearch,
  onSearchChange,
  ungradedStudents,
  gradedStudents,
  unsubmittedStudents,
  selectedStudent,
  onSelect,
  visible,
}) {
  return (
    <aside
      className={cn(
        visible ? 'flex' : 'hidden',
        'sm:flex flex-col w-full sm:w-72 lg:w-80 shrink-0 rounded-xl overflow-hidden border border-slate-200'
      )}
    >
      <div className="px-3 py-2.5 space-y-2 border-b border-slate-100">
        <div className="relative w-full">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={studentSearch}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="학생 이름 또는 학번 검색"
            className="w-full bg-white text-xs pl-8 pr-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 bg-white flex flex-col gap-2">
        <Section label="미채점" variant="default" students={ungradedStudents} selectedStudent={selectedStudent} onSelect={onSelect} />
        <Section label="채점 완료" variant="default" students={gradedStudents} selectedStudent={selectedStudent} onSelect={onSelect} />
        <Section label="미제출" variant="muted" students={unsubmittedStudents} selectedStudent={selectedStudent} onSelect={onSelect} />
      </div>
    </aside>
  )
}
