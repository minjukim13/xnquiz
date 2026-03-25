import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function Layout({ children, breadcrumbs = [] }) {
  return (
    <div className="min-h-screen bg-[#F5F6F8] text-gray-900">
      <header className="border-b border-[#EAECF0] bg-white sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-[56px] flex items-center gap-2.5">

          {/* 로고 */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-[28px] h-[28px] bg-indigo-600 rounded-[8px] flex items-center justify-center shadow-sm">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1.5" fill="white" fillOpacity="0.9"/>
                <rect x="8" y="1" width="5" height="5" rx="1.5" fill="white" fillOpacity="0.5"/>
                <rect x="1" y="8" width="5" height="5" rx="1.5" fill="white" fillOpacity="0.5"/>
                <rect x="8" y="8" width="5" height="5" rx="1.5" fill="white" fillOpacity="0.9"/>
              </svg>
            </div>
            <span className="hidden sm:block text-[13px] font-bold text-gray-900 tracking-tight">XN Quizzes</span>
          </Link>

          {/* 브레드크럼 */}
          {breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 overflow-hidden min-w-0">
              <span className="text-gray-300 text-[13px] font-light select-none mx-0.5">/</span>
              {breadcrumbs.map((b, i) => (
                <span key={i} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <ChevronRight size={12} className="text-gray-300 shrink-0" />}
                  {b.href ? (
                    <Link
                      to={b.href}
                      className="text-[13px] text-gray-400 hover:text-gray-700 truncate transition-colors"
                    >
                      {b.label}
                    </Link>
                  ) : (
                    <span className="text-[13px] font-semibold text-gray-800 truncate">{b.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}
