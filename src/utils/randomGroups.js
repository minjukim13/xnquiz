// 랜덤 출제 그룹: 학생별로 서로 다른 문항을 결정론적 시드 기반으로 선택
// - 새로고침/재접속 시 동일 학생은 동일 문항을 보도록 시드 = (studentId, quizId, groupId) 조합
// - 시험 정의에 저장되는 항목은 placeholder (type: 'random_group') 이며, 실제 문항은 응시 시점에 expand

export const RANDOM_GROUP_TYPE = 'random_group'

export function isRandomGroup(item) {
  return item && item.type === RANDOM_GROUP_TYPE
}

// 문자열 해시 (FNV-1a 32bit)
function hashString(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// 시드 기반 PRNG (mulberry32)
function mulberry32(seed) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleWithSeed(arr, seed) {
  const rand = mulberry32(seed)
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// 시험 정의에 들어가는 placeholder. 학생별 expand 전까지 문항 ID/본문은 결정되지 않는다.
// 사용자 원칙: 문제은행에서 가져온 문제는 독립 문항 → bankSnapshot 으로 그룹 추가 시점에 풀 복사
export function createRandomGroupItem({ bankId, bankName, bankCourse, count, pointsPerQuestion, useDifficultyScoring, difficultyPoints, maxAvailable, estimatedTotalPoints, bankSnapshot }) {
  return {
    id: `rg_${Date.now()}_${bankId}_${Math.random().toString(36).slice(2, 7)}`,
    type: RANDOM_GROUP_TYPE,
    bankId,
    bankName,
    bankCourse,
    count,
    pointsPerQuestion,
    useDifficultyScoring: !!useDifficultyScoring,
    difficultyPoints: difficultyPoints || { high: pointsPerQuestion, medium: pointsPerQuestion, low: pointsPerQuestion },
    maxAvailable,
    // 그룹 추가 시점의 은행 문항 스냅샷 (이후 은행 변경에 영향 X — 독립성 보장)
    bankSnapshot: Array.isArray(bankSnapshot) ? bankSnapshot : [],
    // 시험 메타데이터 표시용 (실제 학생별 점수는 expand 시 재계산)
    points: estimatedTotalPoints ?? count * pointsPerQuestion,
  }
}

// 그룹 풀에서 한 문항의 배점 계산 (난이도별 차등 배점 정책 반영)
export function resolveGroupQuestionPoints(group, q) {
  if (group.useDifficultyScoring && q.difficulty && group.difficultyPoints?.[q.difficulty]) {
    return group.difficultyPoints[q.difficulty]
  }
  return group.pointsPerQuestion
}

// 시험 문항 리스트에서 실제 응시/표시용 문항 리스트로 확장 (학생 단위 시드)
// items: 일반 문항 + random_group 혼합
// seedKey: 학생/미리보기 단위로 동일하게 유지되어야 하는 키 (예: `${studentId}_${quizId}`)
// getBankQuestions: bankSnapshot 누락 시 fallback (그룹 추가 시 스냅샷이 저장되므로 일반적으론 사용 안 됨)
export function expandRandomGroups(items, seedKey, getBankQuestions) {
  if (!Array.isArray(items)) return []
  const result = []
  items.forEach(item => {
    if (!isRandomGroup(item)) {
      result.push(item)
      return
    }
    const pool = (item.bankSnapshot && item.bankSnapshot.length > 0)
      ? item.bankSnapshot
      : (typeof getBankQuestions === 'function' ? getBankQuestions(item.bankId) : []) || []
    if (pool.length === 0) return
    const seed = hashString(`${seedKey || 'anon'}__${item.id}`)
    const shuffled = shuffleWithSeed(pool, seed)
    const take = Math.min(item.count ?? shuffled.length, shuffled.length)
    for (let i = 0; i < take; i++) {
      const q = shuffled[i]
      result.push({
        ...q,
        points: resolveGroupQuestionPoints(item, q),
        randomGroupId: item.id,
        randomGroupBankName: item.bankName,
      })
    }
  })
  return result
}

// 교수자(통계/채점) 뷰용: random_group 의 풀 안 모든 문항을 평면 리스트로 펼침
// 학생 단위 추출이 아니라, 그룹의 전체 후보군을 노출 → 문항별 통계/재채점 가능
// order 는 그룹 위치 + 그룹 내 인덱스 합성
export function expandAllForInstructor(items) {
  if (!Array.isArray(items)) return []
  const result = []
  let orderCounter = 0
  items.forEach((item, itemIdx) => {
    if (!isRandomGroup(item)) {
      orderCounter += 1
      result.push({ ...item, order: item.order ?? orderCounter })
      return
    }
    const pool = item.bankSnapshot || []
    pool.forEach((q, qIdx) => {
      orderCounter += 1
      result.push({
        ...q,
        points: resolveGroupQuestionPoints(item, q),
        order: orderCounter,
        randomGroupId: item.id,
        randomGroupBankName: item.bankName,
        // 정렬/표시 보조용
        randomGroupItemIdx: itemIdx,
        randomGroupQuestionIdx: qIdx,
      })
    })
  })
  return result
}

// 응시 데이터에서 특정 문항이 출제된 학생 명단 추출
// 학생의 응답(answers / autoScores / manualScores / selections) 어디에든 q.id 가 있으면 출제됨으로 판정
export function getRecipientStudents(question, students) {
  if (!question || !Array.isArray(students)) return []
  const qId = question.id
  return students.filter(s => {
    if (s.answers && qId in s.answers) return true
    if (s.autoScores && qId in s.autoScores) return true
    if (s.manualScores && qId in s.manualScores) return true
    if (s.selections && qId in s.selections) return true
    return false
  })
}

// 시험 정의 단위 합계 (random_group 은 추정 totalPoints 사용)
export function summarizeQuizItems(items) {
  let questionCount = 0
  let totalPoints = 0
  for (const item of items || []) {
    if (isRandomGroup(item)) {
      questionCount += item.count ?? 0
      totalPoints += item.points ?? 0
    } else {
      questionCount += 1
      totalPoints += item.points ?? 0
    }
  }
  return { questionCount, totalPoints }
}

// 교수자 뷰 합계 (random_group 풀 안 전체 문항을 카운트)
export function summarizeForInstructor(items) {
  let questionCount = 0
  for (const item of items || []) {
    if (isRandomGroup(item)) {
      questionCount += (item.bankSnapshot?.length ?? 0)
    } else {
      questionCount += 1
    }
  }
  return { questionCount }
}
