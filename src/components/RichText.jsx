import { useRef, useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import katex from 'katex'
import {
  Image as ImageIcon, Youtube, Link as LinkIcon, X, Trash2,
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Music, Sigma, FolderOpen,
} from 'lucide-react'
import {
  fileToMediaItem,
  parseEmbedUrl,
  readFileAsDataURL,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from '@/utils/mediaUtils'
import { cn } from '@/lib/utils'

// ── HTML sanitize ──
// 텍스트 서식(b/i/u/s/목록), 이미지/동영상/오디오/임베드 허용
const ALLOWED_TAGS = ['p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'sub', 'sup', 'ul', 'ol', 'li', 'img', 'iframe', 'video', 'audio', 'source']
const ALLOWED_ATTR = ['src', 'alt', 'title', 'controls', 'preload', 'allowfullscreen', 'frameborder', 'class', 'style', 'width', 'height', 'type']

export function sanitizeHtml(html) {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    ADD_ATTR: ['allow'],
  })
}

// 본문이 plain text인지 (HTML 태그 미포함) — 레거시 데이터용 fallback
function isPlainText(html) {
  if (!html) return true
  return !/<[a-z][\s\S]*>/i.test(html)
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── 수식(LaTeX) 렌더 ──
function renderTex(tex, displayMode) {
  try {
    return katex.renderToString(String(tex).trim(), { displayMode, throwOnError: false, output: 'html' })
  } catch {
    return displayMode ? `$$${tex}$$` : `$${tex}$`
  }
}

// HTML 문자열에서 태그 밖 텍스트의 $$...$$ / $...$ 를 KaTeX 로 렌더 (태그 내부는 건드리지 않음)
export function renderLatexInHtml(html) {
  if (!html || html.indexOf('$') === -1) return html
  return html.replace(/(<[^>]+>)|([^<]+)/g, (_m, tag, text) => {
    if (tag != null) return tag
    return text
      .replace(/\$\$([^$]+?)\$\$/g, (_, tex) => renderTex(tex, true))
      .replace(/\$([^$\n]+?)\$/g, (_, tex) => renderTex(tex, false))
  })
}

// ── 학생/교수자 화면 렌더 ────────────────────────────────────
export function RichTextRenderer({ html, className, plainTextFallbackClass = '' }) {
  if (!html) return null
  if (isPlainText(html)) {
    // plain text 라도 LaTeX($...$)가 있으면 렌더
    if (html.indexOf('$') !== -1) {
      const safe = renderLatexInHtml(escapeHtml(html).replace(/\n/g, '<br/>'))
      return <div className={cn('rich-text', className)} dangerouslySetInnerHTML={{ __html: safe }} />
    }
    return <span className={cn('whitespace-pre-wrap', plainTextFallbackClass, className)}>{html}</span>
  }
  return (
    <div
      className={cn('rich-text', className)}
      dangerouslySetInnerHTML={{ __html: renderLatexInHtml(sanitizeHtml(html)) }}
    />
  )
}

// ── HTML 안에 텍스트가 (태그 제외하고) 있는지 ──────────────
export function richTextHasContent(html) {
  if (!html) return false
  const stripped = String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  if (stripped.length > 0) return true
  return /<(img|iframe|video|audio)\b/i.test(html)
}

// ── HTML → plain text (목록/요약용) ──────────────────────────
export function htmlToPlainText(html) {
  if (!html) return ''
  const raw = String(html)
  const text = raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  if (text) return text
  if (/<img\b/i.test(raw)) return '[이미지]'
  if (/<(video|iframe)\b/i.test(raw)) return '[동영상]'
  if (/<audio\b/i.test(raw)) return '[오디오]'
  return ''
}

// ── 편집기 ───────────────────────────────────────────────────
// props:
//   value: HTML string
//   onChange: (html: string) => void
//   placeholder, minHeight, variant('full'|'inline'), autoFocus, onRefReady, onDelete
export function RichTextEditor({ value, onChange, placeholder, minHeight = 'min-h-[100px]', variant = 'full', autoFocus, onRefReady, onDelete }) {
  const ref = useRef(null)
  const [panel, setPanel] = useState(null) // 'image' | 'embed' | 'audio' | 'math' | 'commons' | null
  const [urlValue, setUrlValue] = useState('')
  const [mathTex, setMathTex] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const audioRef = useRef(null)
  const lastRangeRef = useRef(null) // 에디터 내부 마지막 selection (툴바/패널 클릭으로 포커스가 옮겨가도 삽입 위치 보존)

  // 외부 value → DOM 동기화 (포커스 중일 땐 건드리지 않음)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (document.activeElement === el) return
    const next = value || ''
    const normalized = isPlainText(next)
      ? next.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
      : next
    if (el.innerHTML !== normalized) {
      el.innerHTML = normalized
    }
  }, [value])

  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus()
    if (onRefReady && ref.current) onRefReady(ref.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emitChange = () => {
    const el = ref.current
    if (!el) return
    onChange(el.innerHTML)
  }

  // 에디터 내부 caret/selection 을 저장 — 입력/클릭 후, blur 직전에 기록
  const saveRange = () => {
    const el = ref.current
    const sel = window.getSelection()
    if (el && sel && sel.rangeCount && el.contains(sel.getRangeAt(0).startContainer)) {
      lastRangeRef.current = sel.getRangeAt(0).cloneRange()
    }
  }

  // execCommand 기반 서식 — mousedown 에서 preventDefault 로 선택 영역 보존
  const exec = (cmd) => {
    const el = ref.current
    if (!el) return
    el.focus()
    document.execCommand(cmd, false, null)
    emitChange()
  }

  const insertHtmlAtCursor = (html) => {
    const el = ref.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    const saved = lastRangeRef.current
    // 저장된 에디터 내부 selection 이 있으면 복원, 없으면(=에디터에 캐럿이 없던 경우) 끝에 추가
    if (!saved || !el.contains(saved.startContainer)) {
      el.insertAdjacentHTML('beforeend', html)
      lastRangeRef.current = null
      emitChange()
      return
    }
    sel.removeAllRanges()
    sel.addRange(saved)
    const range = sel.getRangeAt(0)
    range.deleteContents()
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    const frag = document.createDocumentFragment()
    let lastNode = null
    while (tmp.firstChild) lastNode = frag.appendChild(tmp.firstChild)
    range.insertNode(frag)
    if (lastNode) {
      const newRange = document.createRange()
      newRange.setStartAfter(lastNode)
      newRange.collapse(true)
      sel.removeAllRanges()
      sel.addRange(newRange)
      lastRangeRef.current = newRange.cloneRange()
    }
    emitChange()
  }

  const handleFile = async (file) => {
    setError('')
    if (!file) return
    try {
      const item = await fileToMediaItem(file)
      if (item.kind === 'image') {
        insertHtmlAtCursor(`<img src="${item.data}" alt="${item.name || ''}" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:8px 0;" />`)
      } else {
        insertHtmlAtCursor(`<video src="${item.data}" controls preload="metadata" style="max-width:100%;border-radius:8px;display:block;margin:8px 0;"></video>`)
      }
    } catch (e) {
      setError(e.message || '업로드 실패')
    }
  }

  const handleAudioFile = async (file) => {
    setError('')
    if (!file) return
    const isAudio = file.type?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name)
    if (!isAudio) { setError('오디오 파일만 업로드할 수 있습니다'); return }
    if (file.size > MAX_VIDEO_BYTES) { setError(`오디오는 ${MAX_VIDEO_BYTES / 1024 / 1024}MB 이하만 업로드할 수 있습니다`); return }
    try {
      const data = await readFileAsDataURL(file)
      insertHtmlAtCursor(`<audio src="${data}" controls preload="metadata" style="display:block;margin:8px 0;width:100%;max-width:360px;"></audio>`)
    } catch (e) {
      setError(e.message || '업로드 실패')
    }
  }

  const handleImageUrlConfirm = () => {
    setError('')
    const url = urlValue.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) { setError('http:// 또는 https:// 로 시작하는 URL을 입력하세요'); return }
    insertHtmlAtCursor(`<img src="${url}" alt="" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:8px 0;" />`)
    setUrlValue(''); setPanel(null)
  }

  const handleEmbedConfirm = () => {
    setError('')
    const url = urlValue.trim()
    if (!url) return
    const embed = parseEmbedUrl(url)
    if (!embed) { setError('YouTube 또는 Vimeo URL을 입력하세요'); return }
    insertHtmlAtCursor(`<div style="position:relative;padding-bottom:56.25%;height:0;margin:8px 0;border-radius:8px;overflow:hidden;"><iframe src="${embed.embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen frameborder="0" style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe></div><p><br/></p>`)
    setUrlValue(''); setPanel(null)
  }

  const insertMath = () => {
    const tex = mathTex.trim()
    if (!tex) { setError('수식(LaTeX)을 입력하세요'); return }
    insertHtmlAtCursor(escapeHtml(`$${tex}$`))
    setMathTex(''); setPanel(null); setError('')
  }

  const openPanel = (which) => { setPanel(which); setUrlValue(''); setMathTex(''); setError('') }
  const closePanel = () => { setPanel(null); setUrlValue(''); setMathTex(''); setError('') }

  const handlePaste = (e) => {
    const items = e.clipboardData?.items || []
    for (const it of items) {
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        const file = it.getAsFile()
        if (file) { e.preventDefault(); handleFile(file); return }
      }
    }
  }

  const handleKeyDown = (e) => {
    if (variant === 'inline' && e.key === 'Enter') e.preventDefault()
  }

  const showFormatting = variant !== 'inline'

  return (
    <div className="w-full">
      {/* 툴바 */}
      <div className="flex items-center gap-0.5 flex-wrap px-2 py-1.5 border border-b-0 border-border rounded-t-lg bg-slate-50">
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }} />
        <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={e => { handleAudioFile(e.target.files?.[0]); e.target.value = '' }} />

        {showFormatting && (
          <>
            <ToolbarBtn title="굵게" onMouseDown={e => { e.preventDefault(); exec('bold') }}><Bold size={14} /></ToolbarBtn>
            <ToolbarBtn title="기울임" onMouseDown={e => { e.preventDefault(); exec('italic') }}><Italic size={14} /></ToolbarBtn>
            <ToolbarBtn title="밑줄" onMouseDown={e => { e.preventDefault(); exec('underline') }}><Underline size={14} /></ToolbarBtn>
            <ToolbarBtn title="취소선" onMouseDown={e => { e.preventDefault(); exec('strikeThrough') }}><Strikethrough size={14} /></ToolbarBtn>
            <Divider />
            <ToolbarBtn title="글머리 목록" onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList') }}><List size={14} /></ToolbarBtn>
            <ToolbarBtn title="번호 목록" onMouseDown={e => { e.preventDefault(); exec('insertOrderedList') }}><ListOrdered size={14} /></ToolbarBtn>
            <Divider />
          </>
        )}

        <ToolbarBtn title="이미지 업로드" onClick={() => fileRef.current?.click()}><ImageIcon size={14} /></ToolbarBtn>
        <ToolbarBtn title="이미지 URL" onClick={() => openPanel('image')}><LinkIcon size={14} /></ToolbarBtn>
        <ToolbarBtn title="오디오 업로드" onClick={() => audioRef.current?.click()}><Music size={14} /></ToolbarBtn>
        <ToolbarBtn title="YouTube / Vimeo" onClick={() => openPanel('embed')}><Youtube size={14} /></ToolbarBtn>
        <ToolbarBtn title="수식 입력 (LaTeX)" onClick={() => openPanel('math')}><Sigma size={14} /></ToolbarBtn>
        <ToolbarBtn title="Commons 미디어" onClick={() => openPanel('commons')}><FolderOpen size={14} /></ToolbarBtn>

        {onDelete && (
          <button type="button" onClick={onDelete} title="삭제" className="ml-auto p-1 rounded text-muted-foreground hover:text-destructive hover:bg-white transition-colors">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* URL 입력 패널 (이미지 / 임베드) */}
      {(panel === 'image' || panel === 'embed') && (
        <div className="flex items-center gap-1 px-2 py-2 border border-b-0 border-border bg-white">
          <input
            type="url"
            value={urlValue}
            autoFocus
            placeholder={panel === 'embed' ? 'https://www.youtube.com/watch?v=...' : 'https://...'}
            onChange={e => setUrlValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); panel === 'embed' ? handleEmbedConfirm() : handleImageUrlConfirm() }
              else if (e.key === 'Escape') closePanel()
            }}
            className="flex-1 text-xs px-2 py-1 rounded border border-border focus:outline-none focus:border-indigo-400"
          />
          <button type="button" onClick={panel === 'embed' ? handleEmbedConfirm : handleImageUrlConfirm} className="px-2 py-1 text-xs rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100">삽입</button>
          <button type="button" onClick={closePanel} className="p-1 text-muted-foreground hover:text-foreground" title="닫기"><X size={12} /></button>
        </div>
      )}

      {/* 수식 입력 패널 */}
      {panel === 'math' && (
        <div className="px-2 py-2 border border-b-0 border-border bg-white space-y-2">
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={mathTex}
              autoFocus
              placeholder="LaTeX 입력 (예: \frac{a}{b},  x^2,  \sum_{i=1}^{n})"
              onChange={e => setMathTex(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); insertMath() } else if (e.key === 'Escape') closePanel() }}
              className="flex-1 text-xs px-2 py-1 rounded border border-border focus:outline-none focus:border-indigo-400 font-mono"
            />
            <button type="button" onClick={closePanel} className="p-1 text-muted-foreground hover:text-foreground" title="닫기"><X size={12} /></button>
          </div>
          {mathTex.trim() && (
            <div className="px-2 py-1.5 rounded bg-slate-50 border border-border flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground shrink-0">미리보기</span>
              <span className="text-[15px]" dangerouslySetInnerHTML={{ __html: renderTex(mathTex, false) }} />
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <button type="button" disabled={!mathTex.trim()} onClick={insertMath} className={cn('px-2.5 py-1 text-xs rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium', !mathTex.trim() && 'opacity-50 cursor-not-allowed hover:bg-indigo-50')}>삽입</button>
            <span className="text-[10px] text-muted-foreground">$ 사이에 LaTeX를 직접 입력해도 됩니다</span>
          </div>
        </div>
      )}

      {/* Commons 진입점 (LMS 연동 예정 — 프로토타입 placeholder) */}
      {panel === 'commons' && (
        <div className="flex items-start gap-2 px-2.5 py-2 border border-b-0 border-border bg-accent/40 text-xs text-secondary-foreground">
          <FolderOpen size={14} className="shrink-0 mt-0.5 text-primary" />
          <p className="flex-1 leading-relaxed">Commons CMS 미디어 라이브러리는 LearningX LMS 연동 시 제공됩니다. 연동 후 이 버튼에서 강의 미디어를 바로 삽입할 수 있습니다.</p>
          <button type="button" onClick={closePanel} className="p-1 text-muted-foreground hover:text-foreground" title="닫기"><X size={12} /></button>
        </div>
      )}

      {error && (
        <div className="px-2 py-1 text-xs text-destructive border border-b-0 border-border bg-destructive-soft">{error}</div>
      )}

      {/* 편집 영역 */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { emitChange(); saveRange() }}
        onBlur={() => { emitChange(); saveRange() }}
        onMouseUp={saveRange}
        onKeyUp={saveRange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        className={cn(
          'w-full bg-white text-[15px] px-3 py-2.5 rounded-b-lg border border-border text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30',
          'rich-text-editable',
          minHeight,
        )}
      />

      {/* 수식 미리보기 — 본문에 $...$ 가 있을 때만 */}
      {showFormatting && (value || '').indexOf('$') !== -1 && (
        <div className="mt-1.5 px-3 py-2 rounded-lg border border-dashed border-border bg-slate-50">
          <p className="text-[10px] text-muted-foreground mb-1">수식 미리보기</p>
          <div className="rich-text text-[15px]" dangerouslySetInnerHTML={{ __html: renderLatexInHtml(sanitizeHtml(value)) }} />
        </div>
      )}
    </div>
  )
}

function ToolbarBtn({ children, title, onClick, onMouseDown }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={onMouseDown}
      title={title}
      className="p-1.5 rounded text-slate-600 hover:bg-slate-200 hover:text-indigo-600 transition-colors"
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="w-px h-4 bg-border mx-0.5" />
}
