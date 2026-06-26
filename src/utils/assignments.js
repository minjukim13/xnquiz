// Assignment override helpers (학생·학과별 개별 마감)
// AssignmentOverrides 컴포넌트에서 함께 내보냈으나 HMR 호환을 위해 분리.

export function hasDuplicateStudent(assignments) {
  const seen = new Set()
  for (const a of assignments) {
    for (const t of a.assignTo) {
      if (t.type !== 'student') continue
      if (seen.has(t.id)) return true
      seen.add(t.id)
    }
  }
  return false
}

export function sanitizeAssignments(assignments) {
  return (assignments || [])
    .filter(a => a.assignTo.length > 0)
    .map(a => ({
      id: a.id,
      assignTo: a.assignTo,
      dueDate: a.dueDate || null,
      availableFrom: a.availableFrom || null,
      availableUntil: a.availableUntil || null,
    }))
}

// 특정 학생에게 적용되는 추가 할당(override)을 찾는다.
// 대상 유형: 학생(id 일치) / 학과 그룹(department 일치).
function matchedOverrides(quiz, student) {
  const assignments = Array.isArray(quiz?.assignments) ? quiz.assignments : []
  if (!student?.id || assignments.length === 0) return []
  const sid = student.id
  const dept = student.department
  return assignments.filter(a =>
    (a.assignTo || []).some(t =>
      (t.type === 'student' && t.id === sid) ||
      (t.type === 'group' && (t.id === dept || t.label === dept))
    )
  )
}

/**
 * 학생 1명의 실제 적용(effective) 응시 일정을 계산한다 (FRD D-11 R-006).
 * - 매칭되는 추가 할당이 없으면 퀴즈 기본 일정을 그대로 반환한다.
 * - 매칭되는 추가 할당이 여러 개면 가장 유리한 조건을 적용한다 (가장 이른 시작 /
 *   가장 늦은 마감·이용 종료, FRD D-02 R-008).
 * - 추가 할당에서 비어 있는 필드는 퀴즈 기본 일정 값으로 채운다(부분 override).
 * @returns {{startDate, dueDate, lockDate, isOverridden}}
 */
export function getEffectiveSchedule(quiz, student) {
  const base = {
    startDate: quiz?.startDate ?? null,
    dueDate: quiz?.dueDate ?? null,
    lockDate: quiz?.lockDate ?? null,
    isOverridden: false,
  }
  const matched = matchedOverrides(quiz, student)
  if (matched.length === 0) return base

  const earliest = vals => vals.reduce((a, b) => (new Date(a) <= new Date(b) ? a : b))
  const latest = vals => vals.reduce((a, b) => (new Date(a) >= new Date(b) ? a : b))
  const starts = matched.map(a => a.availableFrom).filter(Boolean)
  const dues = matched.map(a => a.dueDate).filter(Boolean)
  const locks = matched.map(a => a.availableUntil).filter(Boolean)

  return {
    startDate: starts.length ? earliest(starts) : base.startDate,
    dueDate: dues.length ? latest(dues) : base.dueDate,
    lockDate: locks.length ? latest(locks) : base.lockDate,
    isOverridden: true,
  }
}
