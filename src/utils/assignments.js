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
