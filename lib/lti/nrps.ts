// NRPS — Names and Role Provisioning Service (LTI Advantage)
// Canvas 과목의 수강생 명단을 받아와 xnquiz User/LtiUserMap/Enrollment 에 upsert
//
// 공식 스펙: https://www.imsglobal.org/spec/lti-nrps/v2p0
// Canvas 구현: GET <context_memberships_url>
//   Accept: application/vnd.ims.lti-nrps.v2.membershipcontainer+json
//   Authorization: Bearer <access_token>
// 페이징: Link 헤더 rel="next"

import type { EnrollmentRole } from '@prisma/client'
import { prisma } from '../prisma.js'
import { getCanvasAccessToken, NRPS_SCOPE } from './canvas-token.js'

const LTI_ROLE_INSTRUCTOR = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'
const LTI_ROLE_LEARNER = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'
const LTI_ROLE_TA = 'http://purl.imsglobal.org/vocab/lis/v2/membership#TeachingAssistant'
const LTI_ROLE_OBSERVER = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Observer'
const LTI_ROLE_DESIGNER = 'http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper'

type NrpsMember = {
  user_id: string // Canvas sub
  status?: 'Active' | 'Inactive'
  name?: string
  given_name?: string
  family_name?: string
  email?: string
  roles: string[]
  lis_person_sourcedid?: string // 학번 후보
}

type NrpsResponse = {
  id: string
  context: { id: string; label?: string; title?: string }
  members: NrpsMember[]
}

function mapNrpsRole(roles: string[]): {
  enrollment: EnrollmentRole | null
  user: 'PROFESSOR' | 'TA' | 'STUDENT'
} {
  const has = (needle: string) => roles.some((r) => r === needle || r.endsWith(needle.split('#')[1]))
  if (has(LTI_ROLE_INSTRUCTOR)) return { enrollment: 'PROFESSOR', user: 'PROFESSOR' }
  if (has(LTI_ROLE_TA)) return { enrollment: 'TA', user: 'TA' }
  if (has(LTI_ROLE_LEARNER)) return { enrollment: 'STUDENT', user: 'STUDENT' }
  // Observer / Designer / 기타 → Enrollment 생성 스킵
  if (has(LTI_ROLE_OBSERVER) || has(LTI_ROLE_DESIGNER)) return { enrollment: null, user: 'STUDENT' }
  return { enrollment: null, user: 'STUDENT' }
}

/** Link 헤더에서 rel="next" URL 파싱 */
function parseNextLink(header: string | null): string | null {
  if (!header) return null
  // 예: <https://.../memberships?page=2>; rel="next", <...>; rel="first"
  const parts = header.split(',')
  for (const part of parts) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="?next"?/i)
    if (m) return m[1]
  }
  return null
}

export type SyncRosterParams = {
  courseCode: string // xnquiz Course.code (예: CANVAS_123)
  nrpsUrl: string // context_memberships_url
  platformId: string // LtiPlatform.id
  clientId: string // LtiPlatform.clientId
  tokenEndpoint: string // LtiPlatform.authTokenUrl
}

export type SyncRosterResult = {
  totalMembers: number
  createdUsers: number
  updatedUsers: number
  createdEnrollments: number
  removedEnrollments: number
  skipped: number
}

/**
 * Canvas 과목 수강생을 전부 받아와 xnquiz DB 에 반영.
 * 원칙:
 *  - Canvas 에서 온 active 멤버 기준으로 User/LtiUserMap/Enrollment 를 upsert
 *  - Canvas 에서 사라진(또는 inactive) 멤버의 Enrollment 는 삭제 (User/응시기록은 유지)
 */
export async function syncRosterFromNrps(params: SyncRosterParams): Promise<SyncRosterResult> {
  const { courseCode, nrpsUrl, platformId, clientId, tokenEndpoint } = params

  const token = await getCanvasAccessToken({ clientId, tokenEndpoint, scope: NRPS_SCOPE })

  const result: SyncRosterResult = {
    totalMembers: 0,
    createdUsers: 0,
    updatedUsers: 0,
    createdEnrollments: 0,
    removedEnrollments: 0,
    skipped: 0,
  }

  // 이번 동기화에서 확인된 userId 목록 — 마지막에 Enrollment 정리용
  const seenUserIds = new Set<string>()

  let url: string | null = nrpsUrl
  let safetyCounter = 0

  while (url) {
    if (safetyCounter++ > 50) throw new Error('NRPS pagination safety limit exceeded')

    const resp: Response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.ims.lti-nrps.v2.membershipcontainer+json',
      },
    })
    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      throw new Error(`NRPS request failed (${resp.status}): ${text}`)
    }

    const data = (await resp.json()) as NrpsResponse
    const members = Array.isArray(data.members) ? data.members : []
    result.totalMembers += members.length

    for (const m of members) {
      if (m.status && m.status !== 'Active') {
        result.skipped += 1
        continue
      }
      const sub = m.user_id
      if (!sub) {
        result.skipped += 1
        continue
      }

      const { enrollment: enrollRole, user: userRole } = mapNrpsRole(m.roles || [])

      const email = m.email || `lti-${sub}@xn.lti`
      const name = m.name || [m.given_name, m.family_name].filter(Boolean).join(' ').trim() || `LTI ${sub.slice(0, 8)}`

      // User/LtiUserMap upsert
      const existingMap = await prisma.ltiUserMap.findUnique({
        where: { platformId_ltiSub: { platformId, ltiSub: sub } },
      })

      let userId: string
      if (existingMap) {
        userId = existingMap.userId
        await prisma.ltiUserMap.update({
          where: { id: existingMap.id },
          data: {
            email,
            name,
            roles: JSON.stringify(m.roles || []),
          },
        })
        // User name/email 도 동기화 (단, 교수자 수동 수정본을 덮어쓸 수 있음 — POC 단계라 허용)
        await prisma.user.update({
          where: { id: userId },
          data: { email, name },
        }).catch(() => {
          // email 충돌(다른 User 와 중복) 시 User 업데이트는 스킵하고 진행
        })
        result.updatedUsers += 1
      } else {
        // 동일 email 로 기존 User 가 있는지 확인 → 있으면 재사용
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
          userId = existingUser.id
        } else {
          const created = await prisma.user.create({
            data: {
              email,
              passwordHash: 'LTI_NO_PASSWORD',
              name,
              role: userRole,
              studentId: m.lis_person_sourcedid || null,
            },
          })
          userId = created.id
          result.createdUsers += 1
        }
        await prisma.ltiUserMap.create({
          data: {
            platformId,
            ltiSub: sub,
            userId,
            email,
            name,
            roles: JSON.stringify(m.roles || []),
          },
        })
      }

      seenUserIds.add(userId)

      // Enrollment upsert (단, Observer/Designer 는 enrollRole=null 이므로 스킵)
      if (enrollRole) {
        const existing = await prisma.enrollment.findUnique({
          where: { userId_courseCode: { userId, courseCode } },
        })
        if (!existing) {
          await prisma.enrollment.create({
            data: { userId, courseCode, role: enrollRole },
          })
          result.createdEnrollments += 1
        } else if (existing.role !== enrollRole) {
          await prisma.enrollment.update({
            where: { id: existing.id },
            data: { role: enrollRole },
          })
        }
      }
    }

    // 다음 페이지
    const linkHeader = resp.headers.get('Link') || resp.headers.get('link')
    url = parseNextLink(linkHeader)
  }

  // Canvas 에서 사라진 수강생의 Enrollment 제거 (응시 기록은 User onDelete=Cascade 가 아니라 User 는 유지)
  // 단, Canvas 에서 온 적 있는 사용자만 대상으로 — seed 로 만든 교수자 계정 보호
  const platformUserMaps = await prisma.ltiUserMap.findMany({
    where: { platformId },
    select: { userId: true },
  })
  const platformUserIds = new Set(platformUserMaps.map((m) => m.userId))
  const staleEnrollments = await prisma.enrollment.findMany({
    where: {
      courseCode,
      userId: { in: [...platformUserIds].filter((id) => !seenUserIds.has(id)) },
    },
    select: { id: true },
  })
  if (staleEnrollments.length) {
    await prisma.enrollment.deleteMany({
      where: { id: { in: staleEnrollments.map((e) => e.id) } },
    })
    result.removedEnrollments = staleEnrollments.length
  }

  await prisma.course.update({
    where: { code: courseCode },
    data: { ltiLastSyncedAt: new Date() },
  })

  return result
}
