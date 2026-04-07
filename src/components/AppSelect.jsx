// 공통 스타일 select 컴포넌트 — 네이티브 select를 디자인 시스템에 맞게 래핑
const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23999999' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`

export function AppSelect({ className = '', style = {}, onFocus, onBlur, ...props }) {
  return (
    <select
      {...props}
      className={`bg-white focus:outline-none appearance-none ${className}`}
      style={{
        border: '1px solid #E0E0E0',
        borderRadius: 6,
        padding: '6px 26px 6px 10px',
        fontSize: 13,
        color: '#424242',
        backgroundImage: CHEVRON,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        cursor: 'pointer',
        lineHeight: 1.4,
        ...style,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = '#6366f1'; onFocus?.(e) }}
      onBlur={e => { e.currentTarget.style.borderColor = '#E0E0E0'; onBlur?.(e) }}
    />
  )
}
