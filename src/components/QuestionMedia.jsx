import { useRef, useState } from 'react'
import { Image as ImageIcon, Video, Link as LinkIcon, Upload, X, Youtube } from 'lucide-react'
import {
  fileToMediaItem,
  urlToMediaItem,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_BODY_MEDIA,
} from '@/utils/mediaUtils'
import { cn } from '@/lib/utils'

// ── 단일 미디어 렌더러 (학생/교수자 화면 공통) ─────────────────
export function MediaRenderer({ item, size = 'md', className }) {
  if (!item || !item.data) return null
  const sizeCls = size === 'sm' ? 'max-h-32' : size === 'lg' ? 'max-h-[480px]' : 'max-h-80'
  if (item.kind === 'image') {
    return (
      <img
        src={item.data}
        alt={item.alt || item.name || ''}
        className={cn('rounded-md border border-slate-200 object-contain bg-slate-50', sizeCls, className)}
      />
    )
  }
  if (item.kind === 'video') {
    return (
      <video
        src={item.data}
        controls
        preload="metadata"
        className={cn('rounded-md border border-slate-200 bg-black w-full', sizeCls, className)}
      />
    )
  }
  if (item.kind === 'youtube') {
    return (
      <div className={cn('relative w-full aspect-video rounded-md overflow-hidden border border-slate-200 bg-black', className)}>
        <iframe
          src={item.data}
          title="embedded video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    )
  }
  return null
}

// ── 미디어 리스트 렌더러 (문제 본문용, 여러 개) ──────────────
export function MediaList({ items, size = 'md', className }) {
  const list = Array.isArray(items) ? items.filter(Boolean) : []
  if (list.length === 0) return null
  return (
    <div className={cn('space-y-2', className)}>
      {list.map((m, i) => (
        <MediaRenderer key={i} item={m} size={size} />
      ))}
    </div>
  )
}

// ── 편집용: 본문 미디어 첨부 컨트롤 (복수 개) ────────────────
export function MediaEditor({ value = [], onChange, max = MAX_BODY_MEDIA, label = '이미지/동영상 첨부' }) {
  const list = Array.isArray(value) ? value : []
  const fileRef = useRef(null)
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState('')

  const add = (item) => {
    setError('')
    onChange([...list, item])
  }
  const removeAt = (i) => onChange(list.filter((_, j) => j !== i))

  const handleFiles = async (files) => {
    setError('')
    const arr = Array.from(files || [])
    if (arr.length === 0) return
    if (list.length + arr.length > max) {
      setError(`최대 ${max}개까지 첨부할 수 있습니다`)
      return
    }
    try {
      const next = [...list]
      for (const f of arr) {
        const item = await fileToMediaItem(f)
        next.push(item)
      }
      onChange(next)
    } catch (e) {
      setError(e.message || '업로드 실패')
    }
  }

  const handleAddUrl = () => {
    setError('')
    if (!urlInput.trim()) return
    if (list.length >= max) {
      setError(`최대 ${max}개까지 첨부할 수 있습니다`)
      return
    }
    try {
      const item = urlToMediaItem(urlInput)
      add(item)
      setUrlInput('')
    } catch (e) {
      setError(e.message || 'URL 파싱 실패')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground">
          이미지 {MAX_IMAGE_BYTES / 1024 / 1024}MB · 동영상 {MAX_VIDEO_BYTES / 1024 / 1024}MB · 최대 {max}개
        </span>
      </div>

      {/* 첨부 버튼들 */}
      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border bg-white hover:border-indigo-300 hover:text-indigo-600 transition-colors"
        >
          <Upload size={13} /> 파일 업로드
        </button>
        <div className="flex items-center gap-1 flex-1 min-w-[200px]">
          <div className="flex-1 flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-white focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
            <LinkIcon size={12} className="text-muted-foreground shrink-0" />
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl() } }}
              placeholder="이미지 URL 또는 YouTube / Vimeo 링크"
              className="flex-1 text-xs focus:outline-none bg-transparent"
            />
          </div>
          <button
            type="button"
            onClick={handleAddUrl}
            disabled={!urlInput.trim()}
            className="px-2.5 py-1.5 text-xs rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            추가
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* 첨부된 미디어 썸네일 + 삭제 */}
      {list.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {list.map((m, i) => (
            <MediaThumb key={i} item={m} onRemove={() => removeAt(i)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 편집용: 단일 이미지 첨부 (보기 옵션용) ───────────────────
export function InlineImagePicker({ value, onChange }) {
  const fileRef = useRef(null)
  const [error, setError] = useState('')

  const handleFile = async (file) => {
    setError('')
    if (!file) return
    if (!file.type?.startsWith('image/')) {
      setError('이미지 파일만 첨부할 수 있습니다')
      return
    }
    try {
      const item = await fileToMediaItem(file)
      onChange(item)
    } catch (e) {
      setError(e.message || '업로드 실패')
    }
  }

  if (value) {
    return (
      <div className="relative inline-flex items-center gap-1 px-1 py-1 rounded-md border border-border bg-white">
        <img
          src={value.data}
          alt=""
          className="h-8 w-8 object-cover rounded"
        />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="p-0.5 text-muted-foreground hover:text-destructive"
          title="이미지 제거"
        >
          <X size={12} />
        </button>
      </div>
    )
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="shrink-0 p-1.5 rounded-md border border-dashed border-border text-muted-foreground hover:border-indigo-400 hover:text-indigo-500 transition-colors"
        title={error || '이미지 첨부'}
      >
        <ImageIcon size={14} />
      </button>
    </>
  )
}

// ── 썸네일 + 삭제 카드 ───────────────────────────────────────
function MediaThumb({ item, onRemove }) {
  const icon = item.kind === 'image' ? ImageIcon : item.kind === 'youtube' ? Youtube : Video
  const Icon = icon
  return (
    <div className="relative rounded-md overflow-hidden border border-border bg-slate-50 group">
      {item.kind === 'image' ? (
        <img src={item.data} alt="" className="w-full h-24 object-cover" />
      ) : item.kind === 'video' ? (
        <video src={item.data} className="w-full h-24 object-cover bg-black" muted />
      ) : (
        <div className="w-full h-24 flex items-center justify-center bg-slate-900 text-white">
          <Youtube size={28} className="text-red-400" />
        </div>
      )}
      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] flex items-center gap-1">
        <Icon size={10} />
        {item.kind === 'image' ? '이미지' : item.kind === 'video' ? '동영상' : '영상링크'}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
        title="삭제"
      >
        <X size={11} />
      </button>
    </div>
  )
}
