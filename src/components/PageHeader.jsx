import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

// 페이지 공통 헤더 — 뒤로가기 아이콘 + 제목 + (옵션) 액션 / 메타 / 설명
// 제목은 string 또는 ReactNode (인라인 편집 등 커스텀 노드 허용)
// backTo 미지정 시 navigate(-1)
export default function PageHeader({
  backTo,
  onBack,
  ariaLabel = '뒤로가기',
  title,
  description,
  actions,
  meta,
  className,
}) {
  const navigate = useNavigate()

  const backClass =
    '-ml-1 inline-flex items-center gap-0.5 px-1 py-1 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors'

  const BackBtn = backTo ? (
    <Link to={backTo} className={backClass}>
      <ArrowLeft size={16} />
      {ariaLabel}
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => (onBack ? onBack() : navigate(-1))}
      className={backClass}
    >
      <ArrowLeft size={16} />
      {ariaLabel}
    </button>
  )

  return (
    <div className={cn('pt-2 pb-4', className)}>
      <div className="mb-3">{BackBtn}</div>

      <div className="flex items-start justify-between gap-4">
        {typeof title === 'string' ? (
          <h1 className="text-[22px] font-bold text-foreground leading-tight truncate flex-1 min-w-0">
            {title}
          </h1>
        ) : (
          <div className="flex-1 min-w-0">{title}</div>
        )}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>

      {meta && (
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          {meta}
        </div>
      )}

      {description && (
        typeof description === 'string'
          ? <p className="text-xs mt-2 text-muted-foreground">{description}</p>
          : <div className="mt-2">{description}</div>
      )}
    </div>
  )
}
