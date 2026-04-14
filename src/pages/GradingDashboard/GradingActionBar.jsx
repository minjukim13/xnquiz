import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { Link } from 'react-router-dom'
import { Download, ChevronDown, BarChart3, UserCheck, FileText, Users, Printer, FileDown } from 'lucide-react'
import { downloadAnswerSheetsXlsx } from '../../utils/excelUtils'
import { getStudentAnswer } from '../../data/mockData'
import { printQuizQuestions, printBulkAnswerSheets } from '../../utils/pdfUtils'

// ─── 액션 바 ─────────────────────────────────────────────────────────────────
export default function GradingActionBar({ quiz, gradingMode, setGradingMode, setMobileView, questions, students, onRetakeOpen, onPdfDownload, pdfGenerating }) {
  return (
    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
      {/* 채점 모드 전환 */}
      <div className="flex items-center p-0.5 gap-0.5 rounded-lg bg-border">
        {[
          { mode: 'question', icon: FileText, label: '문항 중심' },
          { mode: 'student',  icon: Users,    label: '학생 중심' },
        ].map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => { setGradingMode(mode); setMobileView('questions') }}
            className={cn(
              'flex items-center gap-1.5 text-sm px-4 py-2 rounded-md transition-all',
              gradingMode === mode
                ? 'bg-white text-foreground font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-secondary-foreground'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <Button variant="outline" onClick={onRetakeOpen}>
          <UserCheck size={14} />
          <span className="hidden sm:block">조건부 재응시</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download size={14} />
              <span className="hidden sm:block">내보내기</span>
              <ChevronDown size={12} className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 p-2 border-0 rounded-xl shadow-lg"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">문제지</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onPdfDownload('문제지', () => printQuizQuestions(quiz, questions))}
              disabled={!!pdfGenerating}
            >
              <Printer size={14} className="text-muted-foreground" />
              문제지 PDF 다운로드
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">답안지</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => downloadAnswerSheetsXlsx(quiz, students.filter(s => s.submitted), questions, { getStudentAnswer })}
            >
              <FileDown size={14} className="text-muted-foreground" />
              답안지 Excel 다운로드
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onPdfDownload('답안지', () => {
                const submitted = students.filter(s => s.submitted)
                return printBulkAnswerSheets(quiz, questions, submitted, (student, qId) => {
                  return student.selections?.[qId] ?? getStudentAnswer(parseInt(student.id.replace(/\D/g, '')), qId)
                })
              })}
              disabled={!!pdfGenerating}
            >
              <Printer size={14} className="text-muted-foreground" />
              답안지 PDF 일괄 다운로드
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-4 bg-border mx-0.5" />

        <Button asChild>
          <Link to={`/quiz/${quiz.id}/stats`}>
            <BarChart3 size={14} />
            <span className="hidden sm:block">퀴즈 통계</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
