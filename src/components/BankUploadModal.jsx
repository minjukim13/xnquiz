import { useState, useRef } from 'react'
import { Upload, AlertCircle, CheckCircle2, Download, ArrowLeft, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { downloadQuestionTemplate, parseExcelOrCsv } from '@/utils/excelUtils'
import { cn } from '@/lib/utils'

const SUPPORTED_TYPE_LABEL = '객관식, 참/거짓, 복수 선택, 단답형, 서술형'

export default function BankUploadModal({ open, onClose, onImport, bankName, bankDifficulty = '' }) {
  const [step, setStep] = useState('select')
  const [file, setFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [fileError, setFileError] = useState(null)
  const [validRows, setValidRows] = useState([])
  const [invalidRows, setInvalidRows] = useState([])
  const [warningRows, setWarningRows] = useState([])
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const reset = () => {
    setStep('select')
    setFile(null)
    setFileError(null)
    setValidRows([])
    setInvalidRows([])
    setWarningRows([])
    setResult(null)
    setDragOver(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null
    setFile(f)
    setFileError(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) {
      setFile(f)
      setFileError(null)
    }
  }

  const handleParse = async () => {
    if (!file) return
    setParsing(true)
    const res = await parseExcelOrCsv(file, bankDifficulty)
    setParsing(false)
    if (res.error) {
      setFileError(res.error)
      return
    }
    setValidRows(res.validRows)
    setInvalidRows(res.invalidRows)
    setWarningRows(res.warningRows || [])
    setStep('review')
  }

  const handleSubmit = () => {
    if (invalidRows.length > 0) return
    onImport(validRows)
    setResult({ added: validRows.length })
    setStep('done')
  }

  const validCount = validRows.length
  const invalidCount = invalidRows.length
  const warningCount = warningRows.length
  const hasErrors = invalidCount > 0
  const noValidRows = validCount === 0

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' && '문항 일괄 업로드'}
            {step === 'review' && '업로드 사전 검증 결과'}
            {step === 'done' && '업로드 완료'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && `대상 문제모음: ${bankName || '현재 문제모음'}`}
            {step === 'review' && '등록 전에 행 단위 검증 결과를 확인해 주세요.'}
            {step === 'done' && '검증 결과에 따라 등록이 완료되었습니다.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 -mr-2 pr-2">
          {step === 'select' && (
            <SelectStep
              file={file}
              fileInputRef={fileInputRef}
              fileError={fileError}
              dragOver={dragOver}
              onFileChange={handleFileChange}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            />
          )}
          {step === 'review' && (
            <ReviewStep
              validCount={validCount}
              invalidCount={invalidCount}
              invalidRows={invalidRows}
              warningCount={warningCount}
              warningRows={warningRows}
            />
          )}
          {step === 'done' && (
            <DoneStep
              added={result?.added ?? 0}
              bankName={bankName}
            />
          )}
        </div>

        <div className="flex items-center justify-between pt-1 shrink-0">
          {step === 'select' && (
            <>
              <button
                type="button"
                onClick={downloadQuestionTemplate}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Download size={13} />
                양식 다운로드
              </button>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={handleClose}>취소</Button>
                <Button size="sm" onClick={handleParse} disabled={!file || parsing}>
                  {parsing ? '검증 중' : '다음'}
                </Button>
              </div>
            </>
          )}
          {step === 'review' && (
            <>
              <Button size="sm" variant="ghost" onClick={reset}>
                <ArrowLeft size={13} /> 다른 파일 업로드
              </Button>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={handleClose}>취소</Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={hasErrors || noValidRows}
                >
                  업로드
                </Button>
              </div>
            </>
          )}
          {step === 'done' && (
            <div className="ml-auto">
              <Button size="sm" onClick={handleClose}>확인</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SelectStep({ file, fileInputRef, fileError, dragOver, onFileChange, onDragOver, onDragLeave, onDrop }) {
  return (
    <>
      <div className="rounded-md bg-accent border border-accent p-3 text-xs text-secondary-foreground space-y-1">
        <p className="font-medium text-foreground">엑셀(.xlsx, .xls) 또는 CSV 파일을 업로드해 주세요.</p>
        <p>지원 유형: {SUPPORTED_TYPE_LABEL}</p>
        <p className="text-muted-foreground">그 외 유형(연결형, 빈칸 채우기 등)은 [문항 구성] 화면에서 생성해 주세요.</p>
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'w-full border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          dragOver
            ? 'border-primary bg-accent'
            : 'border-border hover:border-primary hover:bg-accent/40'
        )}
      >
        <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
        {file ? (
          <>
            <p className="text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">클릭하여 파일을 선택하거나 끌어다 놓으세요</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={onFileChange}
        />
      </button>

      {fileError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
          <AlertCircle size={15} className="text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{fileError}</p>
        </div>
      )}
    </>
  )
}

function ReviewStep({ validCount, invalidCount, invalidRows, warningCount = 0, warningRows = [] }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-success-border bg-success-bg p-3">
          <div className="flex items-center gap-1.5 text-xs text-success-foreground mb-1">
            <CheckCircle2 size={13} />
            <span className="font-medium">등록 가능</span>
          </div>
          <p className="text-2xl font-bold text-success-foreground">
            {validCount}<span className="text-sm font-medium ml-1">문항</span>
          </p>
        </div>
        <div className={cn(
          'rounded-lg border p-3',
          warningCount === 0 ? 'border-border bg-secondary' : 'border-warning-border bg-warning-bg',
        )}>
          <div className={cn(
            'flex items-center gap-1.5 text-xs mb-1',
            warningCount === 0 ? 'text-muted-foreground' : 'text-warning-foreground',
          )}>
            <AlertTriangle size={13} />
            <span className="font-medium">경고</span>
          </div>
          <p className={cn(
            'text-2xl font-bold',
            warningCount === 0 ? 'text-muted-foreground' : 'text-warning-foreground',
          )}>
            {warningCount}<span className="text-sm font-medium ml-1">문항</span>
          </p>
        </div>
        <div className={cn(
          'rounded-lg border p-3',
          invalidCount === 0 ? 'border-border bg-secondary' : 'border-destructive-border bg-incorrect-bg',
        )}>
          <div className={cn(
            'flex items-center gap-1.5 text-xs mb-1',
            invalidCount === 0 ? 'text-muted-foreground' : 'text-destructive',
          )}>
            <AlertCircle size={13} />
            <span className="font-medium">오류</span>
          </div>
          <p className={cn(
            'text-2xl font-bold',
            invalidCount === 0 ? 'text-muted-foreground' : 'text-destructive',
          )}>
            {invalidCount}<span className="text-sm font-medium ml-1">문항</span>
          </p>
        </div>
      </div>

      {invalidCount > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-foreground">오류 행 상세</h3>
          <div className="max-h-52 overflow-y-auto rounded-md border border-border bg-white">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-secondary/70 backdrop-blur">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-secondary-foreground w-16">번호</th>
                  <th className="px-3 py-2 text-left font-medium text-secondary-foreground">오류 내용</th>
                </tr>
              </thead>
              <tbody>
                {invalidRows.map((row, idx) => (
                  <tr
                    key={row.rowNum}
                    className={cn(idx < invalidRows.length - 1 && 'border-b border-secondary')}
                  >
                    <td className="px-3 py-2 align-top font-medium text-foreground whitespace-nowrap">
                      {row.rowNum}행
                    </td>
                    <td className="px-3 py-2 align-top text-secondary-foreground">
                      {row.reasons.length === 1 ? (
                        <span>{row.reasons[0]}</span>
                      ) : (
                        <ul className="space-y-0.5 list-disc list-inside">
                          {row.reasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {warningCount > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-foreground">경고 행 상세</h3>
          <div className="max-h-52 overflow-y-auto rounded-md border border-border bg-white">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-secondary/70 backdrop-blur">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-secondary-foreground w-16">번호</th>
                  <th className="px-3 py-2 text-left font-medium text-secondary-foreground">경고 내용</th>
                </tr>
              </thead>
              <tbody>
                {warningRows.map((row, idx) => (
                  <tr
                    key={row.rowNum}
                    className={cn(idx < warningRows.length - 1 && 'border-b border-secondary')}
                  >
                    <td className="px-3 py-2 align-top font-medium text-foreground whitespace-nowrap">
                      {row.rowNum}행
                    </td>
                    <td className="px-3 py-2 align-top text-secondary-foreground">
                      {row.warnings.length === 1 ? (
                        <span>{row.warnings[0]}</span>
                      ) : (
                        <ul className="space-y-0.5 list-disc list-inside">
                          {row.warnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {invalidCount > 0 && (
        <div className="bg-warning-bg border border-warning-border rounded-md p-3 flex items-start gap-2 text-xs">
          <AlertCircle size={14} className="text-warning-foreground shrink-0 mt-0.5" />
          <div className="text-warning-foreground">
            <p className="font-medium">오류 1건이라도 있으면 등록이 진행되지 않습니다.</p>
            <p className="mt-0.5">양식을 수정한 뒤 [다른 파일 업로드] 로 다시 시도해 주세요.</p>
          </div>
        </div>
      )}

      {invalidCount === 0 && warningCount > 0 && (
        <div className="bg-warning-bg border border-warning-border rounded-md p-3 flex items-start gap-2 text-xs">
          <AlertTriangle size={14} className="text-warning-foreground shrink-0 mt-0.5" />
          <div className="text-warning-foreground">
            <p className="font-medium">문제모음과 난이도가 다른 문항이 일부 포함되어 있습니다.</p>
            <p className="mt-0.5">해당 문항들을 그대로 포함해 등록하시려면 [업로드]를 눌러주세요.</p>
          </div>
        </div>
      )}
    </>
  )
}

function DoneStep({ added, bankName }) {
  return (
    <div className="flex flex-col items-center text-center py-6">
      <div className="w-12 h-12 rounded-full bg-success-bg flex items-center justify-center mb-3">
        <CheckCircle2 size={28} className="text-success" />
      </div>
      <p className="text-base font-semibold text-foreground mb-1">
        {added}개 문항이 추가되었습니다.
      </p>
      <p className="text-sm text-muted-foreground">
        대상 문제모음: {bankName || '현재 문제모음'}
      </p>
    </div>
  )
}
