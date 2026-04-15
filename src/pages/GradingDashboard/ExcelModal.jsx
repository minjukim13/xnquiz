import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { parseGradingSheet, downloadGradingSheetXlsx } from '../../utils/excelUtils'
import { Upload, Download } from 'lucide-react'

// ─── 모달: 엑셀 일괄 채점 ──────────────────────────────────────────────────
export default function ExcelModal({ question, students: allStudents, quizId, onClose, onApplied }) {
  const [step, setStep] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [fileName, setFileName] = useState('')
  const [previewRows, setPreviewRows] = useState([])

  const handleDownload = () => {
    const submittedStudents = allStudents.filter(s => s.submitted)
    downloadGradingSheetXlsx(question, submittedStudents)
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStep('uploading')
    setErrorMsg('')
    setFileName(file.name)

    const result = await parseGradingSheet(file)
    if (result.error) {
      setErrorMsg(result.error)
      setStep('error')
      return
    }

    // 배점 초과 검사
    const maxPoints = question?.points ?? 0
    for (const row of result.rows) {
      if (row.score > maxPoints) {
        setErrorMsg(`학번 ${row.studentId}: 점수(${row.score})가 배점(${maxPoints}점)을 초과합니다. 전체 업로드가 불가합니다.`)
        setStep('error')
        return
      }
    }

    // 학번 전체 매칭 사전 검증
    for (const row of result.rows) {
      const found = allStudents.find(s => s.studentId === row.studentId)
      if (!found) {
        setErrorMsg(`학번 "${row.studentId}"(이)가 수강생 목록에 없습니다. 채점 양식을 수정하지 마세요. 전체 업로드가 불가합니다.`)
        setStep('error')
        return
      }
    }

    setPreviewRows(result.rows)
    setStep('preview')
  }

  const handleApply = () => {
    onApplied(previewRows)
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>엑셀 일괄 채점</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">

          {/* 가이드 + 버튼: 성공 이후엔 숨김 */}
          {step !== 'success' && (
            <>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <p className="text-xs font-semibold mb-2 text-slate-800">일괄 채점 가이드</p>
                <ol className="space-y-1 text-xs text-slate-500">
                  <li>① 제공된 양식을 다운로드하여 점수를 입력해 주세요.</li>
                  <li>② 파일을 저장한 뒤 업로드하면 완료됩니다.</li>
                </ol>
                <p className="text-xs mt-2 text-muted-foreground">양식에 오류가 1개라도 포함되어 있으면 업로드되지 않습니다.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="py-3 h-auto" onClick={handleDownload}>
                  <Download size={15} />
                  양식 다운로드
                </Button>
                <label
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 text-sm cursor-pointer transition-colors rounded',
                    step === 'uploading'
                      ? 'border border-blue-200 text-primary bg-accent'
                      : 'border border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                  )}
                >
                  <Upload size={15} />
                  {step === 'uploading' ? '업로드 중' : '파일 업로드'}
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
                </label>
              </div>
            </>
          )}

          {/* 오류 */}
          {step === 'error' && (() => {
            const rowMatch = errorMsg.match(/^(\d+행): (.+)/)
            const rowLabel = rowMatch ? rowMatch[1] : '-'
            const rowContent = rowMatch ? rowMatch[2] : errorMsg
            return (
              <div className="rounded border border-red-200">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-red-200 bg-red-100">
                  <span className="text-xs font-semibold text-red-800">업로드 실패</span>
                  <span className="text-xs truncate max-w-[200px] text-red-700" title={fileName}>{fileName}</span>
                </div>
                <div className="grid grid-cols-[52px_1fr] text-xs px-4 py-2 text-muted-foreground border-b border-slate-100">
                  <span>위치</span>
                  <span>오류 내용</span>
                </div>
                <div className="grid grid-cols-[52px_1fr] text-xs px-4 py-3 items-start">
                  <span className="font-medium text-slate-500">{rowLabel}</span>
                  <span className="leading-relaxed text-slate-800">{rowContent}</span>
                </div>
              </div>
            )
          })()}

          {/* 미리보기 */}
          {step === 'preview' && (
            <div className="rounded border border-slate-200">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
                <span className="text-xs font-semibold text-slate-800">업로드 내용 확인</span>
                <span className="text-xs text-muted-foreground">{previewRows.length}명 · {fileName}</span>
              </div>
              {/* 표 헤더 */}
              <div className="grid grid-cols-[1fr_1fr_48px] text-xs px-4 py-2 text-muted-foreground border-b border-slate-100">
                <span className="text-center">이름</span>
                <span className="text-center">학번</span>
                <span className="text-center">점수</span>
              </div>
              {/* 표 데이터 */}
              <div className="overflow-y-auto scrollbar-thin max-h-[200px]">
                {previewRows.map((row, i) => {
                  const student = allStudents.find(s => s.studentId === row.studentId)
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_1fr_48px] text-xs px-4 py-2 text-slate-800 border-b border-slate-50"
                    >
                      <span className="text-center">{student?.name ?? '-'}</span>
                      <span className="text-center text-slate-500">{row.studentId}</span>
                      <span className="text-center font-medium text-primary">{row.score}</span>
                    </div>
                  )
                })}
              </div>
              {/* 적용 버튼 */}
              <div className="px-4 py-3 border-t border-slate-200">
                <Button className="w-full" onClick={handleApply}>
                  {previewRows.length}명 점수 적용
                </Button>
              </div>
            </div>
          )}


        </div>
      </DialogContent>
    </Dialog>
  )
}
