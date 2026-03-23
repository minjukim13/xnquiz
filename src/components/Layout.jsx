import { Link, useLocation } from 'react-router-dom'
import { BookOpen, ChevronRight } from 'lucide-react'

export default function Layout({ children, breadcrumbs = [] }) {
  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">
      {/* 상단 네비게이션 */}
      <header className="border-b border-slate-800 bg-[#0f1117]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-indigo-400 font-semibold text-sm shrink-0">
            <div className="w-7 h-7 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <BookOpen size={14} className="text-indigo-400" />
            </div>
            <span className="hidden sm:block">XN Quizzes</span>
          </Link>

          {breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 text-sm overflow-hidden">
              {breadcrumbs.map((b, i) => (
                <span key={i} className="flex items-center gap-1 min-w-0">
                  <ChevronRight size={14} className="text-slate-600 shrink-0" />
                  {b.href ? (
                    <Link to={b.href} className="text-slate-400 hover:text-slate-200 truncate transition-colors">
                      {b.label}
                    </Link>
                  ) : (
                    <span className="text-slate-200 truncate">{b.label}</span>
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
