// AGS — Assignment and Grade Services (LTI Advantage)
// Canvas Gradebook 에 assignment(lineitem) 를 만들고 학생별 점수를 전송.
//
// 공식 스펙: https://www.imsglobal.org/spec/lti-ags/v2p0
// Canvas 구현:
//   - lineitems: GET/POST  {ltiLineItemsUrl}
//   - lineitem:  GET/PUT/DELETE {ltiLineItemUrl}
//   - scores:    POST {ltiLineItemUrl}/scores   (Content-Type: application/vnd.ims.lis.v1.score+json)
//
// Content-Type 규약:
//   lineitem  — application/vnd.ims.lis.v2.lineitem+json (단일)
//             — application/vnd.ims.lis.v2.lineitemcontainer+json (컬렉션)
//   score     — application/vnd.ims.lis.v1.score+json

import { getCanvasAccessToken, AGS_SCOPE_LINEITEM, AGS_SCOPE_SCORE } from './canvas-token.js'

import { prisma } from '../prisma.js'

const LINEITEM_CONTENT_TYPE = 'application/vnd.ims.lis.v2.lineitem+json'
const SCORE_CONTENT_TYPE = 'application/vnd.ims.lis.v1.score+json'

export type AgsLineItem = {
  id?: string // 생성 후 Canvas 가 부여하는 URL
  scoreMaximum: number
  label: string
  resourceId?: string // xnquiz Quiz.id (Canvas Gradebook 상 tool 측 식별자)
  resourceLinkId?: string // LTI launch resource_link_id
  tag?: string
  startDateTime?: string
  endDateTime?: string
}

export type CanvasAgsParams = {
  clientId: string
  tokenEndpoint: string
  lineItemsUrl: string // Course.ltiLineItemsUrl
}

export type EnsureLineItemParams = CanvasAgsParams & {
  quizId: string
  title: string
  totalScore: number // scoreMaximum
  dueDate?: Date | null
}

/**
 * Canvas 에 lineitem(=assignment) 이 이미 있으면 그 URL 을 반환, 없으면 새로 만든다.
 * resourceId=quizId 로 조회하여 중복 생성 방지.
 */
export async function ensureLineItem(params: EnsureLineItemParams): Promise<string> {
  const { clientId, tokenEndpoint, lineItemsUrl, quizId, title, totalScore, dueDate } = params
  const token = await getCanvasAccessToken({ clientId, tokenEndpoint, scope: AGS_SCOPE_LINEITEM })

  // 1) 기존 lineitem 조회 (resource_id 필터)
  const queryUrl = new URL(lineItemsUrl)
  queryUrl.searchParams.set('resource_id', quizId)
  const listResp = await fetch(queryUrl.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.ims.lis.v2.lineitemcontainer+json',
    },
  })
  if (listResp.ok) {
    const rows = (await listResp.json()) as AgsLineItem[]
    if (Array.isArray(rows) && rows.length > 0 && rows[0].id) {
      return rows[0].id
    }
  }

  // 2) 없으면 새로 생성
  const body: AgsLineItem = {
    scoreMaximum: totalScore,
    label: title,
    resourceId: quizId,
    tag: 'xnquiz',
  }
  if (dueDate) body.endDateTime = dueDate.toISOString()

  const createResp = await fetch(lineItemsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': LINEITEM_CONTENT_TYPE,
      Accept: LINEITEM_CONTENT_TYPE,
    },
    body: JSON.stringify(body),
  })
  if (!createResp.ok) {
    const text = await createResp.text().catch(() => '')
    throw new Error(`AGS lineitem create failed (${createResp.status}): ${text}`)
  }
  const created = (await createResp.json()) as AgsLineItem
  if (!created.id) throw new Error('AGS lineitem create response missing id')
  return created.id
}

export type SendScoreParams = {
  clientId: string
  tokenEndpoint: string
  lineItemUrl: string // ensureLineItem 결과
  ltiSub: string // Canvas user sub
  scoreGiven: number
  scoreMaximum: number
  submittedAt?: Date
  comment?: string
  activityProgress?: 'Initialized' | 'Started' | 'InProgress' | 'Submitted' | 'Completed'
  gradingProgress?: 'NotReady' | 'Failed' | 'Pending' | 'PendingManual' | 'FullyGraded'
}

/** 한 학생의 점수를 lineitem 에 POST. */
export async function sendScore(params: SendScoreParams): Promise<void> {
  const { clientId, tokenEndpoint, lineItemUrl } = params
  const token = await getCanvasAccessToken({ clientId, tokenEndpoint, scope: AGS_SCOPE_SCORE })

  const scoreBody = {
    timestamp: (params.submittedAt ?? new Date()).toISOString(),
    scoreGiven: params.scoreGiven,
    scoreMaximum: params.scoreMaximum,
    comment: params.comment,
    activityProgress: params.activityProgress ?? 'Completed',
    gradingProgress: params.gradingProgress ?? 'FullyGraded',
    userId: params.ltiSub,
  }

  const scoresUrl = `${lineItemUrl.replace(/\/+$/, '')}/scores`
  const resp = await fetch(scoresUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': SCORE_CONTENT_TYPE,
    },
    body: JSON.stringify(scoreBody),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`AGS score send failed (${resp.status}): ${text}`)
  }
}

export type SyncQuizScoresResult = {
  lineItemUrl: string
  sentCount: number
  skippedNoSub: number
  skippedNoScore: number
  totalScoreMax: number
}

/**
 * 특정 퀴즈의 모든 제출 점수를 Canvas Gradebook 에 동기화.
 * - lineitem 없으면 생성
 * - 제출한 학생마다 sendScore
 * - 미제출/미채점 학생은 건너뜀 (Canvas 가 자동으로 공란 처리)
 */
export async function syncQuizScoresToCanvas(quizId: string): Promise<SyncQuizScoresResult> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      course: { include: { ltiPlatform: true } },
      questions: { select: { points: true } },
      attempts: {
        where: { submitted: true },
        include: {
          user: { include: { ltiMappings: true } },
        },
      },
    },
  })
  if (!quiz) throw new Error(`Quiz not found: ${quizId}`)
  if (!quiz.course.ltiLineItemsUrl) throw new Error('Course has no AGS lineitems URL (not LTI-launched?)')
  if (!quiz.course.ltiPlatform) throw new Error('Course has no linked LtiPlatform')

  const platform = quiz.course.ltiPlatform
  const totalScoreMax = quiz.questions.reduce((sum, q) => sum + (q.points || 0), 0)
  if (totalScoreMax <= 0) throw new Error('Quiz 총점이 0 이라 Canvas 에 전송할 수 없음')

  // 1) lineitem 확보
  let lineItemUrl = quiz.ltiLineItemUrl
  if (!lineItemUrl) {
    lineItemUrl = await ensureLineItem({
      clientId: platform.clientId,
      tokenEndpoint: platform.authTokenUrl,
      lineItemsUrl: quiz.course.ltiLineItemsUrl,
      quizId: quiz.id,
      title: quiz.title,
      totalScore: totalScoreMax,
      dueDate: quiz.dueDate,
    })
    await prisma.quiz.update({
      where: { id: quiz.id },
      data: { ltiLineItemUrl: lineItemUrl },
    })
  }

  // 2) 제출자별 score 전송
  const result: SyncQuizScoresResult = {
    lineItemUrl,
    sentCount: 0,
    skippedNoSub: 0,
    skippedNoScore: 0,
    totalScoreMax,
  }

  // platformId 에 해당하는 LtiUserMap 이 이 학생의 Canvas sub
  for (const att of quiz.attempts) {
    const map = att.user.ltiMappings.find((m) => m.platformId === platform.id)
    if (!map) {
      result.skippedNoSub += 1
      continue
    }
    const score = att.totalScore ?? att.autoScore
    if (score === null || score === undefined) {
      result.skippedNoScore += 1
      continue
    }
    try {
      await sendScore({
        clientId: platform.clientId,
        tokenEndpoint: platform.authTokenUrl,
        lineItemUrl,
        ltiSub: map.ltiSub,
        scoreGiven: score,
        scoreMaximum: totalScoreMax,
        submittedAt: att.submittedAt ?? undefined,
        comment: 'XN Quizzes 자동 채점 결과',
      })
      result.sentCount += 1
    } catch (err) {
      console.error('[ags] sendScore failed', {
        quizId: quiz.id,
        attemptId: att.id,
        ltiSub: map.ltiSub,
        err: String(err),
      })
    }
  }

  await prisma.quiz.update({
    where: { id: quiz.id },
    data: { ltiLastScoreSentAt: new Date() },
  })

  return result
}
