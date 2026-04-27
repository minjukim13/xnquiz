// 문항 본문/보기 이미지·동영상 첨부 유틸
// item 구조: { kind: 'image'|'video'|'youtube', source: 'upload'|'url', data: string, name?: string, alt?: string }

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024    // 2MB
export const MAX_VIDEO_BYTES = 10 * 1024 * 1024   // 10MB
export const MAX_BODY_MEDIA = 4                   // 문제 본문은 최대 4개까지

export const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
export const VIDEO_EXTS = ['mp4', 'webm', 'ogg', 'mov']

export function formatBytes(n) {
  if (!n) return '0B'
  if (n < 1024) return `${n}B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`
  return `${(n / 1024 / 1024).toFixed(1)}MB`
}

export function extOf(filename = '') {
  const m = String(filename).toLowerCase().match(/\.([a-z0-9]+)$/)
  return m ? m[1] : ''
}

export function detectKind(file) {
  if (!file) return null
  if (file.type?.startsWith('image/')) return 'image'
  if (file.type?.startsWith('video/')) return 'video'
  const e = extOf(file.name)
  if (IMAGE_EXTS.includes(e)) return 'image'
  if (VIDEO_EXTS.includes(e)) return 'video'
  return null
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(new Error('파일을 읽지 못했습니다'))
    r.readAsDataURL(file)
  })
}

export async function fileToMediaItem(file) {
  const kind = detectKind(file)
  if (!kind) throw new Error('이미지 또는 동영상 파일만 업로드할 수 있습니다')
  if (kind === 'image' && file.size > MAX_IMAGE_BYTES) {
    throw new Error(`이미지는 ${MAX_IMAGE_BYTES / 1024 / 1024}MB 이하만 업로드할 수 있습니다`)
  }
  if (kind === 'video' && file.size > MAX_VIDEO_BYTES) {
    throw new Error(`동영상은 ${MAX_VIDEO_BYTES / 1024 / 1024}MB 이하만 업로드할 수 있습니다`)
  }
  const data = await readFileAsDataURL(file)
  return { kind, source: 'upload', data, name: file.name, size: file.size }
}

// YouTube / Vimeo URL → embed URL 변환
export function parseEmbedUrl(url) {
  const s = String(url || '').trim()
  if (!s) return null
  // YouTube
  const yt = s.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/)
  if (yt) return { kind: 'youtube', embedUrl: `https://www.youtube.com/embed/${yt[1]}`, provider: 'youtube' }
  // Vimeo
  const vm = s.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return { kind: 'youtube', embedUrl: `https://player.vimeo.com/video/${vm[1]}`, provider: 'vimeo' }
  return null
}

export function urlToMediaItem(url, kindHint) {
  const s = String(url || '').trim()
  if (!s) throw new Error('URL을 입력하세요')
  const embed = parseEmbedUrl(s)
  if (embed) return { kind: 'youtube', source: 'url', data: embed.embedUrl, provider: embed.provider }
  // 확장자 기반 판단
  const e = extOf(s.split('?')[0])
  let kind = kindHint
  if (!kind) {
    if (IMAGE_EXTS.includes(e)) kind = 'image'
    else if (VIDEO_EXTS.includes(e)) kind = 'video'
    else kind = 'image' // 기본값
  }
  if (!/^https?:\/\//i.test(s)) throw new Error('http:// 또는 https:// 로 시작하는 URL을 입력하세요')
  return { kind, source: 'url', data: s }
}

export function normalizeMediaList(list) {
  if (!Array.isArray(list)) return []
  return list.filter(m => m && typeof m.data === 'string' && m.data.trim())
}
