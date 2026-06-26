import { AlertCircle, AlertTriangle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ASSIGNMENT_GROUPS } from '../data/mockData'
import { cn } from '@/lib/utils'

// 공개 직전 종합 확인 모달
// URD-021 R-009: 9항목 결과를 항목/설정 표로 종합 안내 + 직전 단계 복귀
export default function PublishReviewModal({ open, onOpenChange, form, questions, totalPoints, onConfirm, confirmLabel = '이대로 공개' }) {
  if (!open) return null
  const items = buildReviewItems(form, questions, totalPoints)
  const warningItems = items.filter(i => i.severity === 'warning')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>공개 설정 확인</DialogTitle>
          <DialogDescription>
            공개하면 학생이 즉시 응시할 수 있습니다. 아래 항목을 확인해 주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 -mr-2 pr-2">
          {warningItems.length > 0 && (
            <div className="bg-warning-bg border border-warning-border rounded-md p-3 flex items-start gap-2 text-sm text-warning-foreground">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <ul className="space-y-1 leading-relaxed">
                {warningItems.map(i => (
                  <li key={i.key}>{i.warningImpact || `${i.title} 항목을 확인해 주세요.`}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left font-semibold text-secondary-foreground px-3.5 py-2.5 w-[40%]">항목</th>
                  <th className="text-left font-semibold text-secondary-foreground px-3.5 py-2.5">설정</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr
                    key={item.key}
                    className={cn(
                      'border-t border-border align-top',
                      item.severity === 'warning' ? 'bg-warning-bg/30' : 'bg-white',
                    )}
                  >
                    <td className="px-3.5 py-3">
                      <div className="flex items-start gap-2">
                        <span className={cn(
                          'w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5',
                          item.severity === 'warning' ? 'bg-warning text-white' : 'bg-secondary text-secondary-foreground',
                        )}>
                          {item.no}
                        </span>
                        <div className="min-w-0">
                          <span className="font-medium text-foreground">{item.title}</span>
                          {item.severity === 'warning' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 ml-1.5 rounded text-[11px] font-medium bg-warning text-white align-middle">
                              <AlertCircle size={10} />
                              {item.warningLabel || '확인 필요'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3">
                      <p className="text-secondary-foreground whitespace-pre-line leading-relaxed">
                        {item.value}
                      </p>
                      {item.note && (
                        <p className="text-xs text-muted-foreground mt-1">{item.note}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 shrink-0 border-t border-secondary">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <ArrowLeft size={13} />
            돌아가서 수정
          </Button>
          <Button size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function buildReviewItems(form, questions, totalPoints) {
  const items = []

  // 1. 시험 유형 + 평가 그룹
  const typeLabel = form.quizMode === 'graded' ? '평가용 퀴즈' : '연습용 퀴즈'
  let typeValue = typeLabel
  let typeNote = null
  let typeSeverity = 'ok'
  let typeWarning = null
  let typeImpact = null
  if (form.quizMode === 'graded') {
    const group = ASSIGNMENT_GROUPS.find(g => g.id === form.assignmentGroupId)
    if (group) {
      typeValue += `\n평가 그룹: ${group.label} (반영 비중 ${group.weight}%)`
    } else {
      typeValue += `\n평가 그룹: 미선택`
      typeSeverity = 'warning'
      typeWarning = '평가 그룹 미선택'
      typeImpact = '평가 그룹을 선택하지 않으면 성적에 반영되지 않습니다.'
    }
  } else {
    typeNote = '연습용 퀴즈는 성적에 반영되지 않습니다.'
  }
  items.push({
    key: 'type', no: 1, title: '시험 유형 및 평가 그룹',
    value: typeValue, note: typeNote,
    severity: typeSeverity, warningLabel: typeWarning, warningImpact: typeImpact,
    isDefault: false,
  })

  // 2. 응시 기간
  let periodValue = ''
  let periodSeverity = 'ok'
  let periodWarning = null
  let periodImpact = null
  if (!form.startDate && !form.dueDate) {
    periodValue = '응시 기간 제한 없음'
    periodSeverity = 'warning'
    periodWarning = '기간 미설정'
    periodImpact = '응시 기간을 비워두면 학생이 언제든 응시할 수 있는 상태로 공개됩니다.'
  } else {
    periodValue = `${form.startDate || '시작 일시 미설정'} ~ ${form.dueDate || '마감 일시 미설정'}`
  }
  if (form.lockDate) {
    periodValue += `\n이용 종료 일시: ${form.lockDate}`
  } else {
    periodValue += `\n이용 종료 일시: 제한 없음`
  }
  items.push({
    key: 'period', no: 2, title: '응시 기간',
    value: periodValue,
    severity: periodSeverity, warningLabel: periodWarning, warningImpact: periodImpact,
    isDefault: false,
  })

  // 3. 지각 제출 정책
  let lateValue = '비허용'
  if (form.allowLateSubmit) {
    lateValue = form.lateSubmitDeadline
      ? `허용 (지각 마감: ${form.lateSubmitDeadline.replace('T', ' ')})`
      : '허용 (지각 마감 무제한)'
  }
  items.push({
    key: 'late', no: 3, title: '지각 제출 정책',
    value: lateValue,
    severity: 'ok',
    isDefault: !form.allowLateSubmit,
  })

  // 4. 추가 할당 (assignments)
  const assignmentCount = form.assignments?.length || 0
  items.push({
    key: 'overrides', no: 4, title: '추가 할당',
    value: assignmentCount > 0
      ? `${assignmentCount}건 (대상자별 별도 마감 적용)`
      : '없음',
    severity: 'ok',
    isDefault: assignmentCount === 0,
  })

  // 5. 응시 정책 (시간 제한 + 재응시)
  const timeLimitText = form.unlimitedTimeLimit
    ? '시간 제한 없음'
    : `${form.timeLimit}분 제한${form.disableAutoSubmit ? ' (자동 제출 5분 유예)' : ''}`
  const isMultiAttempt = form.unlimitedAttempts || form.allowAttempts >= 2
  const attemptsText = form.unlimitedAttempts
    ? `무제한 응시 (적용 점수: ${form.scorePolicy})`
    : isMultiAttempt
      ? `${form.allowAttempts}회 응시 (적용 점수: ${form.scorePolicy})`
      : '1회 응시'
  items.push({
    key: 'policy', no: 5, title: '응시 정책',
    value: `${timeLimitText}\n${attemptsText}`,
    severity: 'ok',
    isDefault: false,
  })

  // 6. 문항 구성
  items.push({
    key: 'questions', no: 6, title: '문항 구성',
    value: `${questions.length}문항 · 총 ${totalPoints}점`,
    severity: questions.length === 0 ? 'warning' : 'ok',
    warningLabel: questions.length === 0 ? '문항 없음' : null,
    warningImpact: questions.length === 0 ? '문항이 비어 있어 학생이 응시할 수 없습니다.' : null,
    isDefault: false,
  })

  // 7. 문항 표시 옵션
  const displayOpts = []
  if (form.shuffleChoices) displayOpts.push('보기 순서 섞기')
  if (form.shuffleQuestions) displayOpts.push('문항 순서 섞기')
  if (form.oneQuestionAtATime) {
    displayOpts.push('한 번에 한 문항씩 표시')
    if (form.lockAfterAnswer) displayOpts.push('응답 후 문항 잠금')
  }
  items.push({
    key: 'display', no: 7, title: '문항 표시 설정',
    value: displayOpts.length > 0 ? displayOpts.join(' · ') : '기본 표시 (옵션 없음)',
    severity: 'ok',
    isDefault: displayOpts.length === 0,
  })

  // 8. 응시 보안 및 감독
  const secOpts = []
  if (form.securityTrustLock) secOpts.push('시험 전용 브라우저')
  if (form.securityAiProctoring) secOpts.push('AI 시험 감독')
  if (form.securityRequireConsent) secOpts.push('응시 전 필수 동의')
  items.push({
    key: 'security', no: 8, title: '응시 보안 및 감독',
    value: secOpts.length > 0 ? secOpts.join(' · ') : '사용 안 함',
    severity: 'ok',
    isDefault: secOpts.length === 0,
  })

  // 9. 성적 공개 정책
  let revealValue = '비공개'
  let revealSeverity = 'ok'
  let revealWarning = null
  let revealImpact = null
  if (form.scoreRevealEnabled) {
    const scopeLabel = form.scoreRevealScope === 'with_answer' ? '정답까지 공개' : '오답 여부만'
    let timingLabel = ''
    if (form.scoreRevealTiming === 'immediately') timingLabel = '제출 즉시'
    else if (form.scoreRevealTiming === 'after_due') timingLabel = '마감 후'
    else if (form.scoreRevealTiming === 'period') {
      timingLabel = `기간 (${form.scoreRevealStart || '시작 미설정'} ~ ${form.scoreRevealEnd || '종료 미설정'})`
    }
    revealValue = `${scopeLabel} · ${timingLabel}`
    if (form.oneTimeResults) revealValue += '\n응답 1회만 조회 허용'

    // 재응시 + 즉시 공개 조합 경고
    if (isMultiAttempt && form.scoreRevealTiming === 'immediately') {
      revealSeverity = 'warning'
      revealWarning = '재응시 정책과 충돌 가능'
      revealImpact = '재응시 허용 + 제출 즉시 공개 조합은 다음 응시 전 정답이 알려질 수 있습니다.'
      revealValue += '\n재응시 허용 시 점수가 즉시 공개되면 후속 응시 전 정답이 알려질 수 있습니다.'
    }
  }
  items.push({
    key: 'reveal', no: 9, title: '성적 공개 정책',
    value: revealValue,
    severity: revealSeverity, warningLabel: revealWarning, warningImpact: revealImpact,
    isDefault: !form.scoreRevealEnabled,
  })

  return items
}
