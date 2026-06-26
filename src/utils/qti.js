/**
 * qti.js — Canvas Classic Quizzes QTI 1.2 (IMS Content Cartridge 1.1.3) 가져오기/내보내기
 *
 * 대상 포맷: imsqti_xmlv1p2 (Canvas 네이티브 내보내기와 동일 구조)
 *   - .zip 안에 imsmanifest.xml + 퀴즈별 폴더({id}/{id}.xml = 문항, {id}/assessment_meta.xml = 설정)
 *
 * 1차(MVP) 범위:
 *   - 문항 12유형 type 식별 전부 보존 (question_type 메타 기반)
 *   - 자동채점 가능 유형(객관식/OX/복수정답/단답/수치)은 정답까지 왕복
 *   - 서술/파일첨부/텍스트는 본문만, 연결형/빈칸/드롭다운/수식형은 본문+유형만(best-effort)
 *   - 미디어 첨부, 추가 할당(override), 문제은행 랜덤그룹 자동연결은 2차
 *
 * api/mock 모드 공통: 파싱·생성 모두 클라이언트에서 수행.
 */
import JSZip from 'jszip'

// ─────────────────────────────── 유형 매핑 ───────────────────────────────
// 프로토타입 type ↔ Canvas QTI question_type
const TYPE_TO_QTI = {
  multiple_choice: 'multiple_choice_question',
  true_false: 'true_false_question',
  multiple_answers: 'multiple_answers_question',
  short_answer: 'short_answer_question',
  essay: 'essay_question',
  numerical: 'numerical_question',
  formula: 'calculated_question',
  matching: 'matching_question',
  fill_in_multiple_blanks: 'fill_in_multiple_blanks_question',
  multiple_dropdowns: 'multiple_dropdowns_question',
  file_upload: 'file_upload_question',
  text: 'text_only_question',
}
const QTI_TO_TYPE = Object.fromEntries(
  Object.entries(TYPE_TO_QTI).map(([k, v]) => [v, k])
)

// 선택지(render_choice) 기반 유형 — 정답이 response_label ident로 표현됨
const CHOICE_TYPES = new Set(['multiple_choice', 'true_false', 'multiple_answers'])
// 정답 문자열을 그대로 갖는 자동채점 유형 (render_fib)
const FIB_TYPES = new Set(['short_answer', 'numerical'])

const SCORE_POLICY_TO_QTI = {
  '최고 점수 유지': 'keep_highest',
  '최신 점수 유지': 'keep_latest',
  '평균 점수': 'keep_average',
}
const QTI_TO_SCORE_POLICY = {
  keep_highest: '최고 점수 유지',
  keep_latest: '최신 점수 유지',
  keep_average: '평균 점수',
}

// ─────────────────────────────── 공통 유틸 ───────────────────────────────
function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// 프로토타입 날짜('YYYY-MM-DD HH:mm') → QTI ISO('YYYY-MM-DDTHH:mm:ss')
function toQtiDate(d) {
  if (!d) return ''
  const s = String(d).trim().replace(' ', 'T')
  return s.length === 16 ? `${s}:00` : s
}
// QTI ISO → 프로토타입 표시 형식('YYYY-MM-DD HH:mm')
function fromQtiDate(d) {
  if (!d) return ''
  const s = String(d).trim().replace('T', ' ')
  return s.length >= 16 ? s.slice(0, 16) : s
}

// 16자리 hex id (Canvas는 'g' + 32hex, 여기선 충돌만 피하면 됨)
function makeId(seed) {
  let h = 0
  const str = `${seed}`
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0
  }
  return 'g' + (h.toString(16) + '0'.repeat(8)).slice(0, 8) + (str.length.toString(16) + '00000000').slice(0, 8) + 'abcd0000abcd0000'.slice(0, 16)
}

// HTML 문자열 → 평문 (가져오기 시 문항 본문 정리)
function htmlToText(html) {
  if (!html) return ''
  try {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
    return (doc.body.textContent || '').trim()
  } catch {
    return String(html).replace(/<[^>]+>/g, '').trim()
  }
}

// ═══════════════════════════════ 내보내기 (buildQti) ═══════════════════════════════

function buildItemXml(q, idGen) {
  const qtiType = TYPE_TO_QTI[q.type] || 'text_only_question'
  const itemId = idGen()
  const title = escapeXml(q.title || '문제')
  const points = Number(q.points ?? 0).toFixed(1)
  const stem = escapeXml(`<div><p>${escapeXml(q.text || '')}</p></div>`)

  let metaExtra = ''
  let presentation = ''
  let resprocessing = ''

  if (CHOICE_TYPES.has(q.type)) {
    const choices = Array.isArray(q.choices) && q.choices.length
      ? q.choices
      : (q.type === 'true_false' ? ['참', '거짓'] : [])
    const labels = choices.map((c, i) => ({ id: String(idGen('a') % 100000), text: c }))
    metaExtra = `\n            <qtimetadatafield>\n              <fieldlabel>original_answer_ids</fieldlabel>\n              <fieldentry>${labels.map(l => l.id).join(',')}</fieldentry>\n            </qtimetadatafield>`

    const rcardinality = q.type === 'multiple_answers' ? 'Multiple' : 'Single'
    presentation =
      `        <response_lid ident="response1" rcardinality="${rcardinality}">\n` +
      `          <render_choice>\n` +
      labels.map(l =>
        `            <response_label ident="${l.id}">\n` +
        `              <material>\n` +
        `                <mattext texttype="text/plain">${escapeXml(l.text)}</mattext>\n` +
        `              </material>\n` +
        `            </response_label>`
      ).join('\n') + '\n' +
      `          </render_choice>\n` +
      `        </response_lid>`

    // 정답 판정
    if (q.type === 'multiple_answers') {
      const correctSet = new Set(
        String(q.correctAnswer || '').split(',').map(s => s.trim()).filter(Boolean)
      )
      const conds = labels.map(l =>
        correctSet.has(l.text)
          ? `              <varequal respident="response1">${l.id}</varequal>`
          : `              <not>\n                <varequal respident="response1">${l.id}</varequal>\n              </not>`
      ).join('\n')
      resprocessing =
        `          <respcondition continue="No">\n` +
        `            <conditionvar>\n` +
        `              <and>\n${conds}\n              </and>\n` +
        `            </conditionvar>\n` +
        `            <setvar action="Set" varname="SCORE">100</setvar>\n` +
        `          </respcondition>`
    } else {
      const correct = labels.find(l => l.text === q.correctAnswer)
      if (correct) {
        resprocessing =
          `          <respcondition continue="No">\n` +
          `            <conditionvar>\n` +
          `              <varequal respident="response1">${correct.id}</varequal>\n` +
          `            </conditionvar>\n` +
          `            <setvar action="Set" varname="SCORE">100</setvar>\n` +
          `          </respcondition>`
      }
    }
  } else if (FIB_TYPES.has(q.type)) {
    presentation =
      `        <response_str ident="response1" rcardinality="Single">\n` +
      `          <render_fib>\n` +
      `            <response_label ident="answer1"/>\n` +
      `          </render_fib>\n` +
      `        </response_str>`
    const answers = String(q.correctAnswer ?? '').split(',').map(s => s.trim()).filter(Boolean)
    if (answers.length) {
      resprocessing = answers.map(a =>
        `          <respcondition continue="No">\n` +
        `            <conditionvar>\n` +
        `              <varequal respident="response1">${escapeXml(a)}</varequal>\n` +
        `            </conditionvar>\n` +
        `            <setvar action="Set" varname="SCORE">100</setvar>\n` +
        `          </respcondition>`
      ).join('\n')
    }
  } else if (q.type === 'essay' || q.type === 'file_upload') {
    presentation =
      `        <response_str ident="response1" rcardinality="Single">\n` +
      `          <render_fib>\n` +
      `            <response_label ident="answer1" rshuffle="No"/>\n` +
      `          </render_fib>\n` +
      `        </response_str>`
  }
  // text / matching / fill_in_multiple_blanks / multiple_dropdowns / formula
  // → 본문만 (presentation 비움). 유형은 question_type 메타로 보존됨.

  const presBlock = presentation ? `\n${presentation}` : ''
  const respBlock = resprocessing
    ? `\n        <resprocessing>\n` +
      `          <outcomes>\n` +
      `            <decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/>\n` +
      `          </outcomes>\n${resprocessing}\n        </resprocessing>`
    : ''

  return (
    `      <item ident="${itemId}" title="${title}">\n` +
    `        <itemmetadata>\n` +
    `          <qtimetadata>\n` +
    `            <qtimetadatafield>\n` +
    `              <fieldlabel>question_type</fieldlabel>\n` +
    `              <fieldentry>${qtiType}</fieldentry>\n` +
    `            </qtimetadatafield>\n` +
    `            <qtimetadatafield>\n` +
    `              <fieldlabel>points_possible</fieldlabel>\n` +
    `              <fieldentry>${points}</fieldentry>\n` +
    `            </qtimetadatafield>${metaExtra}\n` +
    `          </qtimetadata>\n` +
    `        </itemmetadata>\n` +
    `        <presentation>\n` +
    `          <material>\n` +
    `            <mattext texttype="text/html">${stem}</mattext>\n` +
    `          </material>${presBlock}\n` +
    `        </presentation>${respBlock}\n` +
    `      </item>`
  )
}

function buildAssessmentXml(quiz, questions, quizId) {
  const idGen = makeIdGen(quizId)
  const items = (questions || []).map(q => buildItemXml(q, idGen)).join('\n')
  const maxAttempts = quiz.unlimitedAttempts ? -1 : (quiz.allowAttempts ?? 1)
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/ims_qtiasiv1p2 http://www.imsglobal.org/xsd/ims_qtiasiv1p2p1.xsd">\n` +
    `  <assessment ident="${quizId}" title="${escapeXml(quiz.title || '제목 없음')}">\n` +
    `    <qtimetadata>\n` +
    `      <qtimetadatafield>\n` +
    `        <fieldlabel>cc_maxattempts</fieldlabel>\n` +
    `        <fieldentry>${maxAttempts}</fieldentry>\n` +
    `      </qtimetadatafield>\n` +
    `    </qtimetadata>\n` +
    `    <section ident="root_section">\n${items}\n    </section>\n` +
    `  </assessment>\n` +
    `</questestinterop>\n`
  )
}

function buildAssessmentMetaXml(quiz, quizId) {
  const scoring = SCORE_POLICY_TO_QTI[quiz.scorePolicy] || 'keep_highest'
  const attempts = quiz.unlimitedAttempts ? -1 : (quiz.allowAttempts ?? 1)
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<quiz identifier="${quizId}" xmlns="http://canvas.instructure.com/xsd/cccv1p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://canvas.instructure.com/xsd/cccv1p0 https://canvas.instructure.com/xsd/cccv1p0.xsd">\n` +
    `  <title>${escapeXml(quiz.title || '제목 없음')}</title>\n` +
    `  <description>${escapeXml(quiz.description || '')}</description>\n` +
    `  <lock_at>${toQtiDate(quiz.lockDate)}</lock_at>\n` +
    `  <unlock_at>${toQtiDate(quiz.startDate)}</unlock_at>\n` +
    `  <due_at>${toQtiDate(quiz.dueDate)}</due_at>\n` +
    `  <shuffle_answers>${quiz.shuffleChoices ? 'true' : 'false'}</shuffle_answers>\n` +
    `  <scoring_policy>${scoring}</scoring_policy>\n` +
    `  <quiz_type>${quiz.assignmentGroupId || getQuizMode(quiz) === 'graded' ? 'assignment' : 'practice_quiz'}</quiz_type>\n` +
    `  <points_possible>${Number(quiz.totalPoints ?? 0).toFixed(1)}</points_possible>\n` +
    `  <allowed_attempts>${attempts}</allowed_attempts>\n` +
    `  <one_question_at_a_time>${quiz.oneQuestionAtATime ? 'true' : 'false'}</one_question_at_a_time>\n` +
    `  <cant_go_back>${quiz.lockAfterAnswer ? 'true' : 'false'}</cant_go_back>\n` +
    (quiz.timeLimit ? `  <time_limit>${quiz.timeLimit}</time_limit>\n` : '') +
    `  <available>true</available>\n` +
    `</quiz>\n`
  )
}

function getQuizMode(quiz) {
  if (quiz.quizMode === 'graded' || quiz.quizMode === 'practice') return quiz.quizMode
  return quiz.assignmentGroupId ? 'graded' : 'practice'
}

function buildManifestXml(entries, courseName) {
  const resources = entries.map(e =>
    `    <resource identifier="${e.quizId}" type="imsqti_xmlv1p2">\n` +
    `      <file href="${e.quizId}/${e.quizId}.xml"/>\n` +
    `      <dependency identifierref="${e.metaId}"/>\n` +
    `    </resource>\n` +
    `    <resource identifier="${e.metaId}" type="associatedcontent/imscc_xmlv1p1/learning-application-resource" href="${e.quizId}/assessment_meta.xml">\n` +
    `      <file href="${e.quizId}/assessment_meta.xml"/>\n` +
    `    </resource>`
  ).join('\n')
  const manifestId = makeId(`manifest_${courseName}`)
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<manifest identifier="${manifestId}" xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1" xmlns:lom="http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource" xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource http://www.imsglobal.org/profile/cc/ccv1p1/LOM/ccv1p1_lomresource_v1p0.xsd http://www.imsglobal.org/xsd/imsmd_v1p2 http://www.imsglobal.org/xsd/imsmd_v1p2p2.xsd">\n` +
    `  <metadata>\n` +
    `    <schema>IMS Content</schema>\n` +
    `    <schemaversion>1.1.3</schemaversion>\n` +
    `    <imsmd:lom>\n` +
    `      <imsmd:general>\n` +
    `        <imsmd:title>\n` +
    `          <imsmd:string>QTI Quiz Export for course "${escapeXml(courseName || '')}"</imsmd:string>\n` +
    `        </imsmd:title>\n` +
    `      </imsmd:general>\n` +
    `    </imsmd:lom>\n` +
    `  </metadata>\n` +
    `  <organizations/>\n` +
    `  <resources>\n${resources}\n  </resources>\n` +
    `</manifest>\n`
  )
}

// 퀴즈별 결정적 id 시퀀스 (Math.random 미사용 — 재현 가능)
function makeIdGen(seed) {
  let n = 0
  return (prefix) => {
    n += 1
    if (prefix === 'a') {
      // response_label용 숫자 ident
      let h = 0
      const s = `${seed}_a_${n}`
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
      return h
    }
    return makeId(`${seed}_item_${n}`)
  }
}

/**
 * 퀴즈 배열을 Canvas QTI 1.2 .zip Blob으로 생성.
 * @param {Array<{quiz, questions}>} bundles
 * @param {string} courseName
 * @returns {Promise<Blob>}
 */
export async function buildQti(bundles, courseName) {
  const zip = new JSZip()
  const entries = []
  bundles.forEach((b, i) => {
    const quizId = makeId(`quiz_${b.quiz.id ?? i}_${b.quiz.title ?? ''}`)
    const metaId = makeId(`meta_${b.quiz.id ?? i}_${b.quiz.title ?? ''}`)
    zip.file(`${quizId}/${quizId}.xml`, buildAssessmentXml(b.quiz, b.questions, quizId))
    zip.file(`${quizId}/assessment_meta.xml`, buildAssessmentMetaXml(b.quiz, quizId))
    entries.push({ quizId, metaId })
  })
  zip.file('imsmanifest.xml', buildManifestXml(entries, courseName))
  return zip.generateAsync({ type: 'blob' })
}

// ═══════════════════════════════ 가져오기 (parseQti) ═══════════════════════════════

function text(el, selector) {
  const node = el.querySelector(selector)
  return node ? (node.textContent || '').trim() : ''
}

function parseMetaField(itemEl, label) {
  const fields = itemEl.querySelectorAll('qtimetadatafield')
  for (const f of fields) {
    const fl = f.querySelector('fieldlabel')
    if (fl && (fl.textContent || '').trim() === label) {
      const fe = f.querySelector('fieldentry')
      return fe ? (fe.textContent || '').trim() : ''
    }
  }
  return ''
}

function parseItem(itemEl, warnings) {
  const qtiType = parseMetaField(itemEl, 'question_type')
  const type = QTI_TO_TYPE[qtiType] || 'text'
  const points = parseFloat(parseMetaField(itemEl, 'points_possible')) || 0
  const title = itemEl.getAttribute('title') || '문제'

  const presentation = itemEl.querySelector('presentation')
  let stem = ''
  if (presentation) {
    const mat = presentation.querySelector(':scope > material mattext')
    stem = htmlToText(mat ? mat.textContent : '')
  }

  const q = { type, title, text: stem, points, autoGrade: false }

  // 선택지 + ident→텍스트 맵
  const labelMap = {}
  const choices = []
  if (presentation) {
    presentation.querySelectorAll('response_label').forEach(rl => {
      const id = rl.getAttribute('ident')
      const mat = rl.querySelector('mattext')
      if (mat) {
        const t = (mat.textContent || '').trim()
        labelMap[id] = t
        // render_fib의 빈 response_label(answer1 등)은 선택지가 아님
        if (rl.querySelector('material')) choices.push(t)
      }
    })
  }

  // 정답: 최고 점수 respcondition의 varequal 수집
  const correctTexts = []
  itemEl.querySelectorAll('resprocessing respcondition').forEach(rc => {
    const sv = rc.querySelector('setvar')
    const score = sv ? parseFloat(sv.textContent) : 0
    if (score <= 0) return
    rc.querySelectorAll('varequal').forEach(ve => {
      // <not> 하위(오답 조건)는 제외
      let p = ve.parentElement
      let negated = false
      while (p && p !== rc) {
        if (p.tagName && p.tagName.toLowerCase() === 'not') { negated = true; break }
        p = p.parentElement
      }
      if (negated) return
      const val = (ve.textContent || '').trim()
      correctTexts.push(labelMap[val] !== undefined ? labelMap[val] : val)
    })
  })

  if (CHOICE_TYPES.has(type)) {
    q.choices = choices.length ? choices : (type === 'true_false' ? ['참', '거짓'] : [])
    if (type === 'multiple_answers') {
      q.correctAnswer = correctTexts.join(', ')
    } else {
      q.correctAnswer = correctTexts[0] ?? null
    }
    q.autoGrade = true
  } else if (FIB_TYPES.has(type)) {
    q.correctAnswer = correctTexts.length ? correctTexts.join(', ') : null
    q.autoGrade = true
  } else if (type === 'essay' || type === 'file_upload') {
    q.correctAnswer = null
    q.autoGrade = false
  } else {
    // matching / fill_in_multiple_blanks / multiple_dropdowns / formula / text
    q.correctAnswer = null
    q.autoGrade = false
    if (['matching', 'fill_in_multiple_blanks', 'multiple_dropdowns', 'formula'].includes(type)) {
      warnings.push(`'${title}' (${qtiType}): 본문/유형만 가져왔습니다. 정답·보기는 편집에서 직접 입력하세요.`)
    }
  }

  return q
}

function parseAssessmentMeta(metaXml) {
  if (!metaXml) return {}
  const doc = new DOMParser().parseFromString(metaXml, 'application/xml')
  const root = doc.documentElement
  if (!root) return {}
  const get = (tag) => {
    const n = root.getElementsByTagName(tag)[0]
    return n ? (n.textContent || '').trim() : ''
  }
  const attempts = parseInt(get('allowed_attempts'), 10)
  const unlimited = attempts === -1
  return {
    title: get('title'),
    description: get('description'),
    startDate: fromQtiDate(get('unlock_at')),
    dueDate: fromQtiDate(get('due_at')),
    lockDate: fromQtiDate(get('lock_at')),
    shuffleChoices: get('shuffle_answers') === 'true',
    scorePolicy: QTI_TO_SCORE_POLICY[get('scoring_policy')] || '최고 점수 유지',
    allowAttempts: unlimited ? 2 : (Number.isFinite(attempts) ? attempts : 1),
    unlimitedAttempts: unlimited,
    oneQuestionAtATime: get('one_question_at_a_time') === 'true',
    lockAfterAnswer: get('cant_go_back') === 'true',
    timeLimit: parseInt(get('time_limit'), 10) || null,
  }
}

/**
 * Canvas QTI .zip 파일을 파싱해 프로토타입 퀴즈 묶음으로 변환.
 * @param {File|Blob} file
 * @returns {Promise<{bundles: Array<{quiz, questions, warnings}>, totalWarnings: number}>}
 */
export async function parseQti(file) {
  const zip = await JSZip.loadAsync(file)

  // 1) 단일 XML(.qti/.xml) 직접 업로드도 허용
  const manifestFile = zip.file('imsmanifest.xml')
  const bundles = []

  if (!manifestFile) {
    // manifest 없으면 questestinterop XML 파일들을 직접 탐색
    const xmlFiles = zip.file(/\.xml$/i)
    for (const xf of xmlFiles) {
      const content = await xf.async('string')
      if (content.includes('questestinterop')) {
        const b = parseAssessmentFromXml(content, null)
        if (b) bundles.push(b)
      }
    }
    if (!bundles.length) throw new Error('QTI 문항(questestinterop)을 찾지 못했습니다')
    return finalize(bundles)
  }

  // 2) 표준 IMS CC: manifest에서 imsqti_xmlv1p2 리소스 수집
  const manifestXml = await manifestFile.async('string')
  const mdoc = new DOMParser().parseFromString(manifestXml, 'application/xml')
  const resources = Array.from(mdoc.getElementsByTagName('resource'))
    .filter(r => (r.getAttribute('type') || '').includes('imsqti_xmlv1p2'))

  for (const res of resources) {
    const fileEl = res.getElementsByTagName('file')[0]
    const href = fileEl ? fileEl.getAttribute('href') : null
    if (!href) continue
    const assessmentFile = zip.file(href)
    if (!assessmentFile) continue
    const assessmentXml = await assessmentFile.async('string')

    // 같은 폴더의 assessment_meta.xml
    const dir = href.includes('/') ? href.slice(0, href.lastIndexOf('/')) : ''
    const metaFile = zip.file(dir ? `${dir}/assessment_meta.xml` : 'assessment_meta.xml')
    const metaXml = metaFile ? await metaFile.async('string') : null

    const b = parseAssessmentFromXml(assessmentXml, metaXml)
    if (b) bundles.push(b)
  }

  if (!bundles.length) throw new Error('가져올 수 있는 퀴즈를 찾지 못했습니다')
  return finalize(bundles)
}

function parseAssessmentFromXml(assessmentXml, metaXml) {
  const doc = new DOMParser().parseFromString(assessmentXml, 'application/xml')
  const assessment = doc.querySelector('assessment')
  if (!assessment) return null

  const warnings = []
  const meta = parseAssessmentMeta(metaXml)
  const titleFromAssessment = assessment.getAttribute('title') || ''

  // 랜덤 선택 그룹 감지
  const hasRandomGroup = !!assessment.querySelector('selection_ordering')
  if (hasRandomGroup) {
    warnings.push('랜덤 출제 그룹(문제은행 참조)이 포함돼 있습니다. 가져온 뒤 문제은행 연결을 직접 지정하세요.')
  }

  const items = Array.from(assessment.querySelectorAll('item'))
  const questions = items.map((it, i) => {
    const q = parseItem(it, warnings)
    return { ...q, id: `imp_q${i + 1}`, order: i + 1 }
  })

  const totalPoints = questions.reduce((s, q) => s + (Number(q.points) || 0), 0)

  const quiz = {
    title: meta.title || titleFromAssessment || '가져온 퀴즈',
    description: meta.description || '',
    startDate: meta.startDate || '',
    dueDate: meta.dueDate || '',
    lockDate: meta.lockDate || '',
    shuffleChoices: meta.shuffleChoices ?? false,
    shuffleQuestions: false,
    scorePolicy: meta.scorePolicy || '최고 점수 유지',
    allowAttempts: meta.allowAttempts ?? 1,
    unlimitedAttempts: meta.unlimitedAttempts ?? false,
    oneQuestionAtATime: meta.oneQuestionAtATime ?? false,
    lockAfterAnswer: meta.lockAfterAnswer ?? false,
    timeLimit: meta.timeLimit ?? null,
    questions: questions.length,
    totalPoints,
  }

  return { quiz, questions, warnings }
}

function finalize(bundles) {
  const totalWarnings = bundles.reduce((s, b) => s + b.warnings.length, 0)
  return { bundles, totalWarnings }
}
