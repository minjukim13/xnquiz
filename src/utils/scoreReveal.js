// 성적 공개 정책 → 학생에게 노출할 항목(점수 / 정오답 / 정답)을 결정
// 3가지 포맷을 모두 지원: 신규 (scoreRevealEnabled), 레거시 (scoreReleasePolicy), 최초 (showScore/showWrongAnswer/showAnswer)

export function computeRevealStatus(quiz, now = new Date()) {
  if (!quiz) return { showScore: false, showWrongAnswer: false, showAnswer: false }

  const dueDate = quiz.dueDate ? new Date(quiz.dueDate) : null

  if (quiz.scoreRevealEnabled !== undefined) {
    const afterDue = dueDate && now >= dueDate
    const inPeriod = (() => {
      const s = quiz.scoreRevealStart ? new Date(quiz.scoreRevealStart) : null
      const e = quiz.scoreRevealEnd ? new Date(quiz.scoreRevealEnd) : null
      return (!s || now >= s) && (!e || now <= e)
    })()
    const timingMet = quiz.scoreRevealTiming === 'immediately' ? true
                    : quiz.scoreRevealTiming === 'after_due' ? afterDue
                    : quiz.scoreRevealTiming === 'period' ? inPeriod
                    : false
    const released = quiz.scoreRevealEnabled && timingMet
    return {
      showScore: !!released,
      showWrongAnswer: !!released,
      showAnswer: !!(released && quiz.scoreRevealScope === 'with_answer'),
    }
  }

  if (quiz.scoreReleasePolicy !== undefined) {
    const policy = quiz.scoreReleasePolicy
    const afterDue = dueDate && now >= dueDate
    const inPeriod = (() => {
      const s = quiz.scoreRevealStart ? new Date(quiz.scoreRevealStart) : null
      const e = quiz.scoreRevealEnd ? new Date(quiz.scoreRevealEnd) : null
      return (!s || now >= s) && (!e || now <= e)
    })()
    const released = policy === 'wrong_only' || policy === 'with_answer' ? true
                   : policy === 'after_due' ? afterDue
                   : policy === 'period' ? inPeriod
                   : false
    return {
      showScore: !!released,
      showWrongAnswer: !!(released && policy !== null),
      showAnswer: !!(released && (policy === 'with_answer' || policy === 'after_due' || policy === 'period')),
    }
  }

  const isTimingMet = (timing, start, end) => {
    if (timing === 'immediately') return true
    if (timing === 'after_due') return dueDate && now >= dueDate
    if (timing === 'period') {
      const s = start ? new Date(start) : null
      const e = end ? new Date(end) : null
      return (!s || now >= s) && (!e || now <= e)
    }
    return false
  }
  const showScore = quiz.showScore === undefined ? true
    : quiz.showScore && (
        (!quiz.scoreRevealStartDate || now >= new Date(quiz.scoreRevealStartDate)) &&
        (!quiz.scoreRevealEndDate || now <= new Date(quiz.scoreRevealEndDate))
      )
  const showWrongAnswer = !!(quiz.showWrongAnswer &&
    isTimingMet(quiz.wrongAnswerRevealTiming, quiz.wrongAnswerRevealStart, quiz.wrongAnswerRevealEnd))
  const showAnswer = !!(showWrongAnswer && quiz.showAnswer && (
    quiz.answerRevealTiming === 'same' ||
    isTimingMet(quiz.answerRevealTiming, quiz.answerRevealStart, quiz.answerRevealEnd)
  ))
  return { showScore: !!showScore, showWrongAnswer, showAnswer }
}

// 짧은 성적 공개 라벨 (배지용)
export function scoreRevealShortLabel(quiz) {
  if (!quiz) return null
  const isUndefined = quiz.scoreRevealEnabled === undefined && quiz.scoreReleasePolicy === undefined
  if (isUndefined) return null

  const enabled = quiz.scoreRevealEnabled ?? (quiz.scoreReleasePolicy !== null)
  if (!enabled) return '성적 비공개'

  const timing = quiz.scoreRevealTiming ?? quiz.scoreReleasePolicy
  if (timing === 'after_due') return '마감 후 성적 공개'
  if (timing === 'period') {
    if (quiz.scoreRevealStart) {
      const d = new Date(quiz.scoreRevealStart)
      if (!Number.isNaN(d.getTime())) {
        return `${d.getMonth() + 1}/${d.getDate()} 성적 공개`
      }
    }
    return '기간 내 성적 공개'
  }
  return '성적 즉시 공개'
}
