import { useRef, useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import { Image as ImageIcon, Youtube, Link as LinkIcon, X, Trash2 } from 'lucide-react'
import {
  fileToMediaItem,
  parseEmbedUrl,
  MAX_IMAGE_BYTES,
} from '@/utils/mediaUtils'
import { cn } from '@/lib/utils'

// ── HTML sanitize: <img>, <iframe>(YouTube/Vimeo), <video>, <br>, <p>, <span>, <b/i/u> 만 허용 ──
const ALLOWED_TAGS = ['p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 'img', 'iframe', 'video', 'source']
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

// ── 학생/교수자 화면 렌더 ────────────────────────────────────
export function RichTextRenderer({ html, className, plainTextFallbackClass = '' }) {
  if (!html) return null
  if (isPlainText(html)) {
    return <span className={cn('whitespace-pre-wrap', plainTextFallbackClass, className)}>{html}</span>
  }
  return (
    <div
      className={cn('rich-text', className)}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  )
}

// ── HTML 안에 텍스트가 (태그 제외하고) 있는지 ──────────────
export function richTextHasContent(html) {
  if (!html) return false
  const stripped = String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  if (stripped.length > 0) return true
  // 텍스트는 없어도 이미지/비디오가 있으면 콘텐츠 있음
  return /<(img|iframe|video)\b/i.test(html)
}

// ── 편집기 ───────────────────────────────────────────────────
// props:
//   value: HTML string
//   onChange: (html: string) => void
//   placeholder: string
//   minHeight: tailwind class (예: 'min-h-[80px]')
//   variant: 'full' | 'inline' (inline은 줄바꿈 비활성)
export function RichTextEditor({ value, onChange, placeholder, minHeight = 'min-h-[100px]', variant = 'full', autoFocus, onRefReady, onDelete }) {
  const ref = useRef(null)
  const [showUrlPrompt, setShowUrlPrompt] = useState(null) // 'image' | 'embed' | null
  const [urlValue, setUrlValue] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  // 외부 value → DOM 동기화 (포커스 중일 땐 건드리지 않음)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (document.activeElement === el) return
    // 레거시 plain text 호환: 태그가 없는 입력은 줄바꿈을 <br/> 로 변환
    const next = value || ''
    const normalized = isPlainText(next)
      ? next.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
      : next
    if (el.innerHTML !== normalized) {
      el.innerHTML = normalized
    }
  }, [value])

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus()
    }
    if (onRefReady && ref.current) onRefReady(ref.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emitChange = () => {
    const el = ref.current
    if (!el) return
    onChange(el.innerHTML)
  }

  const insertHtmlAtCursor = (html) => {
    const el = ref.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      el.insertAdjacentHTML('beforeend', html)
    } else {
      const range = sel.getRangeAt(0)
      // 셀렉션이 편집기 안인지 확인
      if (!el.contains(range.startContainer)) {
        el.insertAdjacentHTML('beforeend', html)
      } else {
        range.deleteContents()
        const tmp = document.createElement('div')
        tmp.innerHTML = html
        const frag = document.createDocumentFragment()
        let lastNode = null
        while (tmp.firstChild) {
          lastNode = frag.appendChild(tmp.firstChild)
        }
        range.insertNode(frag)
        if (lastNode) {
          const newRange = document.createRange()
          newRange.setStartAfter(lastNode)
          newRange.collapse(true)
          sel.removeAllRanges()
          sel.addRange(newRange)
        }
      }
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
        // video upload (base64 — 가능하면 작은 파일만 권장)
        insertHtmlAtCursor(`<video src="${item.data}" controls preload="metadata" style="max-width:100%;border-radius:8px;display:block;margin:8px 0;"></video>`)
      }
    } catch (e) {
      setError(e.message || '업로드 실패')
    }
  }

  const handleImageUrlConfirm = () => {
    setError('')
    const url = urlValue.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      setError('http:// 또는 https:// 로 시작하는 URL을 입력하세요')
      return
    }
    insertHtmlAtCursor(`<img src="${url}" alt="" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:8px 0;" />`)
    setUrlValue('')
    setShowUrlPrompt(null)
  }

  const handleEmbedConfirm = () => {
    setError('')
    const url = urlValue.trim()
    if (!url) return
    const embed = parseEmbedUrl(url)
    if (!embed) {
      setError('YouTube 또는 Vimeo URL을 입력하세요')
      return
    }
    insertHtmlAtCursor(`<div style="position:relative;padding-bottom:56.25%;height:0;margin:8px 0;border-radius:8px;overflow:hidden;"><iframe src="${embed.embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen frameborder="0" style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe></div><p><br/></p>`)
    setUrlValue('')
    setShowUrlPrompt(null)
  }

  const handlePaste = (e) => {
    const items = e.clipboardData?.items || []
    for (const it of items) {
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        const file = it.getAsFile()
        if (file) {
          e.preventDefault()
          handleFile(file)
          return
        }
      }
    }
  }

  const handleKeyDown = (e) => {
    if (variant === 'inline' && e.key === 'Enter') {
      e.preventDefault()
    }
  }

  return (
    <div className="w-full">
      {/* 툴바 */}
      <div className="flex items-center gap-1 px-2 py-1.5 border border-b-0 border-border rounded-t-lg bg-slate-50">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }}
        />
        <ToolbarBtn title="이미지 업로드" onClick={() => fileRef.current?.click()}>
          <ImageIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="이미지 URL" onClick={() => { setShowUrlPrompt('image'); setUrlValue(''); setError('') }}>
          <LinkIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="YouTube / Vimeo" onClick={() => { setShowUrlPrompt('embed'); setUrlValue(''); setError('') }}>
          <Youtube size={14} />
        </ToolbarBtn>
        <span className="ml-auto text-[10px] text-muted-foreground pr-1">이미지 {MAX_IMAGE_BYTES / 1024 / 1024}MB 이하</span>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="보기 삭제"
            className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-white transition-colors"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* URL 입력 패널 */}
      {showUrlPrompt && (
        <div className="flex items-center gap-1 px-2 py-2 border border-b-0 border-border bg-white">
          <input
            type="url"
            value={urlValue}
            autoFocus
            placeholder={showUrlPrompt === 'embed' ? 'https://www.youtube.com/watch?v=...' : 'https://...'}
            onChange={e => setUrlValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                showUrlPrompt === 'embed' ? handleEmbedConfirm() : handleImageUrlConfirm()
              } else if (e.key === 'Escape') {
                setShowUrlPrompt(null); setUrlValue(''); setError('')
              }
            }}
            className="flex-1 text-xs px-2 py-1 rounded border border-border focus:outline-none focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={showUrlPrompt === 'embed' ? handleEmbedConfirm : handleImageUrlConfirm}
            className="px-2 py-1 text-xs rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
          >삽입</button>
          <button
            type="button"
            onClick={() => { setShowUrlPrompt(null); setUrlValue(''); setError('') }}
            className="p-1 text-muted-foreground hover:text-foreground"
            title="닫기"
          ><X size={12} /></button>
        </div>
      )}
      {error && (
        <div className="px-2 py-1 text-xs text-destructive border border-b-0 border-border bg-red-50">{error}</div>
      )}

      {/* 편집 영역 */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        className={cn(
          'w-full bg-white text-[15px] px-3 py-2.5 rounded-b-lg border border-border text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30',
          'rich-text-editable',
          minHeight,
        )}
      />
    </div>
  )
}

function ToolbarBtn({ children, title, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded text-slate-600 hover:bg-slate-200 hover:text-indigo-600 transition-colors"
    >
      {children}
    </button>
  )
}
