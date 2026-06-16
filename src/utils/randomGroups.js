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
export function createRandomGroupItem({ bankId, bankName, bankCourse, count, pointsPerQuestion, useDifficultyScoring, difficultyPoints, maxAvailable, estimatedTotalPoints }) {
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
    // 시험 메타데이터 표시용 (실제 학생별 점수는 expand 시 재계산)
    points: estimatedTotalPoints ?? count * pointsPerQuestion,
  }
}

// 시험 문항 리스트에서 실제 응시/표시용 문항 리스트로 확장
// items: 일반 문항 + random_group 혼합
// seedKey: 학생/미리보기 단위로 동일하게 유지되어야 하는 키 (예: `${studentId}_${quizId}`)
// getBankQuestions: bankId 로 문항 배열을 반환하는 함수
export function expandRandomGroups(items, seedKey, getBankQuestions) {
  if (!Array.isArray(items)) return []
  const result = []
  items.forEach(item => {
    if (!isRandomGroup(item)) {
      result.push(item)
      return
    }
    const bankQs = (typeof getBankQuestions === 'function' ? getBankQuestions(item.bankId) : []) || []
    if (bankQs.length === 0) return
    const seed = hashString(`${seedKey || 'anon'}__${item.id}`)
    const shuffled = shuffleWithSeed(bankQs, seed)
    const take = Math.min(item.count ?? shuffled.length, shuffled.length)
    for (let i = 0; i < take; i++) {
      const q = shuffled[i]
      const pts = item.useDifficultyScoring && q.difficulty && item.difficultyPoints?.[q.difficulty]
        ? item.difficultyPoints[q.difficulty]
        : item.pointsPerQuestion
      result.push({
        ...q,
        points: pts,
        randomGroupId: item.id,
        randomGroupBankName: item.bankName,
      })
    }
  })
  return result
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
