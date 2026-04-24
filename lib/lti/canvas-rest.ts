// Canvas REST API 호출 헬퍼
// LTI Advantage 서비스(AGS/NRPS) 와는 별개로, Canvas 의 과목/과제/모듈 등
// 네이티브 리소스를 직접 조작하려면 Canvas Personal Access Token (PAT) 이 필요하다.
// 발급: Canvas > 계정 > 프로필 > 설정 > 새 액세스 토큰
//
// 용도 (xnquiz):
//   - 시연용 시드 퀴즈를 Canvas Assignment(external_tool 타입) 로 자동 등록
//     → Canvas "과제 및 평가", "학습 활동 현황" 메뉴에 즉시 노출
//
// 보안 주의:
//   - PAT 은 발급자 권한으로 임의 API 호출 가능 (강력함)
//   - 운영 반영 금지, 시연 한정 env CANVAS_API_TOKEN 에만 저장
//   - .env.local 에만 두고 절대 커밋 금지

export type CanvasRestParams = {
  baseUrl: string // 예: "https://cnvs-dev.xinics.kr"
  apiToken: string // Canvas Personal Access Token
}

export type CreateExternalToolAssignmentParams = CanvasRestParams & {
  courseId: string // Canvas course id (숫자)
  name: string
  launchUrl: string // xnquiz LTI launch URL (target_link_uri), 예: "https://xnquiz.vercel.app/api/lti/launch?quiz_id=abc"
  pointsPossible: number
  dueAt?: Date | null
  published?: boolean // 기본 true
  description?: string
  // Canvas 가 URL prefix 매칭으로 tool 을 못 찾는 경우 content_id 로 명시 지정
  contentId?: number
}

export type CanvasAssignment = {
  id: number
  name: string
  html_url?: string
  description?: string | null
  external_tool_tag_attributes?: {
    url?: string
    content_type?: string
    content_id?: number | null
  }
  points_possible?: number
  published?: boolean
  due_at?: string | null
}

export type CanvasExternalTool = {
  id: number
  name: string
  domain?: string | null
  url?: string | null
  consumer_key?: string
  privacy_level?: string
  description?: string | null
}

function trimBase(u: string): string {
  return u.replace(/\/+$/, '')
}

async function canvasFetch<T>(
  params: CanvasRestParams,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${trimBase(params.baseUrl)}${path}`
  const resp = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${params.apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Canvas REST ${init.method ?? 'GET'} ${path} failed (${resp.status}): ${text}`)
  }
  return (await resp.json()) as T
}

/** 과목의 assignment 목록을 이름으로 조회 (중복 생성 방지용) */
export async function findAssignmentByName(
  params: CanvasRestParams & { courseId: string; name: string },
): Promise<CanvasAssignment | null> {
  const { courseId, name } = params
  const q = new URLSearchParams({
    'search_term': name,
    'per_page': '50',
  })
  const list = await canvasFetch<CanvasAssignment[]>(
    params,
    `/api/v1/courses/${encodeURIComponent(courseId)}/assignments?${q.toString()}`,
  )
  return list.find((a) => a.name === name) ?? null
}

/** 과목에 설치된 External Tool 목록 조회 */
export async function listExternalTools(
  params: CanvasRestParams & { courseId: string },
): Promise<CanvasExternalTool[]> {
  const { courseId } = params
  return canvasFetch<CanvasExternalTool[]>(
    params,
    `/api/v1/courses/${encodeURIComponent(courseId)}/external_tools?per_page=100`,
  )
}

/**
 * launchUrl 호스트와 가장 잘 매칭되는 External Tool 을 찾는다.
 * 매칭 기준:
 *   1) tool.url 이 launchUrl prefix 포함
 *   2) tool.domain 이 launchUrl 호스트와 일치
 */
export function pickMatchingTool(
  tools: CanvasExternalTool[],
  launchUrl: string,
): CanvasExternalTool | null {
  const u = new URL(launchUrl)
  const host = u.hostname
  // 1순위: url prefix 매칭
  const byUrl = tools.find((t) => {
    if (!t.url) return false
    try {
      const tu = new URL(t.url)
      return tu.hostname === host
    } catch {
      return false
    }
  })
  if (byUrl) return byUrl
  // 2순위: domain 매칭
  const byDomain = tools.find((t) => t.domain && (t.domain === host || host.endsWith(`.${t.domain}`)))
  return byDomain ?? null
}

/**
 * external_tool 타입 Assignment 를 생성.
 * Canvas 가 URL prefix 매칭을 못하면 클릭 시 "유효한 설정을 찾을 수 없음" 에러.
 * → contentId(External Tool 의 id) 를 명시하면 확실하게 연결됨.
 */
export async function createExternalToolAssignment(
  params: CreateExternalToolAssignmentParams,
): Promise<CanvasAssignment> {
  const {
    courseId,
    name,
    launchUrl,
    pointsPossible,
    dueAt,
    published = true,
    description,
    contentId,
  } = params

  const body = {
    assignment: {
      name,
      submission_types: ['external_tool'],
      external_tool_tag_attributes: {
        url: launchUrl,
        new_tab: false,
        ...(contentId ? { content_type: 'context_external_tool', content_id: contentId } : {}),
      },
      points_possible: pointsPossible,
      due_at: dueAt ? dueAt.toISOString() : null,
      published,
      // 빈 문자열('')도 명시적으로 전달해야 Canvas 에서 기존 설명을 지울 수 있음
      ...(description !== undefined ? { description } : {}),
    },
  }

  return canvasFetch<CanvasAssignment>(
    params,
    `/api/v1/courses/${encodeURIComponent(courseId)}/assignments`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

/** 기존 assignment 의 external_tool_tag_attributes 업데이트 (content_id 주입 등) */
export async function updateExternalToolAssignment(
  params: CanvasRestParams & {
    courseId: string
    assignmentId: number
    launchUrl: string
    contentId?: number
    description?: string
  },
): Promise<CanvasAssignment> {
  const { courseId, assignmentId, launchUrl, contentId, description } = params
  const body = {
    assignment: {
      external_tool_tag_attributes: {
        url: launchUrl,
        new_tab: false,
        ...(contentId ? { content_type: 'context_external_tool', content_id: contentId } : {}),
      },
      // 빈 문자열('')도 명시적으로 전달해야 Canvas 에서 기존 설명을 지울 수 있음
      ...(description !== undefined ? { description } : {}),
    },
  }
  return canvasFetch<CanvasAssignment>(
    params,
    `/api/v1/courses/${encodeURIComponent(courseId)}/assignments/${assignmentId}`,
    { method: 'PUT', body: JSON.stringify(body) },
  )
}

/**
 * 이미 있으면 content_id/launchUrl 을 업데이트, 없으면 새로 생성.
 * 이미 만들어둔 assignment 가 잘못된 tag 라도 재실행으로 복구됨.
 */
export async function ensureExternalToolAssignment(
  params: CreateExternalToolAssignmentParams,
): Promise<{ assignment: CanvasAssignment; created: boolean; updated: boolean }> {
  const existing = await findAssignmentByName({
    baseUrl: params.baseUrl,
    apiToken: params.apiToken,
    courseId: params.courseId,
    name: params.name,
  })
  if (existing) {
    const contentIdMismatch =
      params.contentId != null &&
      existing.external_tool_tag_attributes?.content_id !== params.contentId
    const urlMismatch = existing.external_tool_tag_attributes?.url !== params.launchUrl
    // description 이 명시적으로 전달됐을 때만 비교 (빈 문자열 '' 은 지움 의도로 간주)
    const descriptionMismatch =
      params.description !== undefined &&
      (existing.description ?? '') !== params.description
    const needsUpdate = contentIdMismatch || urlMismatch || descriptionMismatch
    if (!needsUpdate) return { assignment: existing, created: false, updated: false }
    const updated = await updateExternalToolAssignment({
      baseUrl: params.baseUrl,
      apiToken: params.apiToken,
      courseId: params.courseId,
      assignmentId: existing.id,
      launchUrl: params.launchUrl,
      contentId: params.contentId,
      description: params.description,
    })
    return { assignment: updated, created: false, updated: true }
  }
  const created = await createExternalToolAssignment(params)
  return { assignment: created, created: true, updated: false }
}
