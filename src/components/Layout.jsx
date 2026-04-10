import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, ChevronDown, GraduationCap, BookOpen, LayoutList, Menu } from 'lucide-react'
import { useRole, DEMO_STUDENTS } from '../context/RoleContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

export default function Layout({ children, breadcrumbs = [] }) {
  const { role, setRole, currentStudent, setCurrentStudent } = useRole()
  const [studentPickerOpen, setStudentPickerOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()

  const navItems = role === 'student'
    ? [{ label: '내 퀴즈', href: '/', icon: LayoutList }]
    : [
        { label: '퀴즈', href: '/', icon: LayoutList },
        { label: '문제은행', href: '/question-banks', icon: BookOpen },
      ]

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/' || location.pathname.startsWith('/quiz')
    return location.pathname.startsWith(href)
  }

  const NavLinks = ({ onNavigate } = {}) => (
    <nav className="p-3 space-y-0.5">
      <p className="text-xs font-semibold px-2 pt-2 pb-1.5 text-muted-foreground/60 tracking-wide">
        {role === 'student' ? '학습' : '강의'}
      </p>
      {navItems.map(item => {
        const active = isActive(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors',
              active
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <Icon size={15} className={active ? 'text-indigo-700' : 'text-muted-foreground/60'} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-40 border-b border-border">
        <div className="px-4 sm:px-6 h-14 flex items-center gap-2.5">

          {/* 모바일 메뉴 */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="sm:hidden">
                <Menu size={18} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[220px] p-0">
              <div className="p-4">
                <Link to="/" className="flex items-center gap-2" onClick={() => setMobileNavOpen(false)}>
                  <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
                      <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
                      <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
                      <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
                    </svg>
                  </div>
                  <span className="text-sm font-bold">XN Quizzes</span>
                </Link>
              </div>
              <Separator />
              <NavLinks onNavigate={() => setMobileNavOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* 로고 */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
                <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
                <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
                <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
              </svg>
            </div>
            <span className="text-sm font-bold hidden sm:block">XN Quizzes</span>
          </Link>

          {/* 브레드크럼 */}
          {breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 overflow-hidden min-w-0">
              <span className="text-sm font-light select-none mx-0.5 text-muted-foreground/40">/</span>
              {breadcrumbs.map((b, i) => (
                <span key={i} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <ChevronRight size={12} className="shrink-0 text-muted-foreground/40" />}
                  {b.href ? (
                    <Link
                      to={b.href}
                      className="text-sm truncate text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {b.label}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold truncate">{b.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}

          {/* 역할 토글 (우측 끝) */}
          <div className="ml-auto flex items-center gap-2 shrink-0">

            {/* 역할 전환 토글 */}
            <div className="flex items-center p-0.5 rounded-md text-xs bg-muted border border-border">
              <button
                onClick={() => setRole('instructor')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all',
                  role === 'instructor'
                    ? 'bg-white text-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <BookOpen size={12} />
                <span className="hidden sm:block">교수자</span>
              </button>
              <button
                onClick={() => setRole('student')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all',
                  role === 'student'
                    ? 'bg-white text-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <GraduationCap size={12} />
                <span className="hidden sm:block">학생</span>
              </button>
            </div>

            {/* 학생 선택기 (학생 모드일 때만) */}
            {role === 'student' && (
              <Popover open={studentPickerOpen} onOpenChange={setStudentPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border border-indigo-300',
                      studentPickerOpen ? 'bg-indigo-50 text-indigo-700' : 'bg-white text-indigo-700'
                    )}
                  >
                    <GraduationCap size={12} />
                    <span>{currentStudent.name}</span>
                    <ChevronDown size={11} className={cn('transition-transform', studentPickerOpen && 'rotate-180')} />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[200px] p-0">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground">학생 계정 선택 (데모)</p>
                  </div>
                  <div className="py-1">
                    {DEMO_STUDENTS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setCurrentStudent(s); setStudentPickerOpen(false) }}
                        className={cn(
                          'w-full text-left px-3 py-2.5 text-xs transition-colors',
                          currentStudent.id === s.id
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'hover:bg-muted text-foreground'
                        )}
                      >
                        <span className="font-medium">{s.name}</span>
                        <span className="ml-1.5 text-muted-foreground">{s.studentId}</span>
                        <p className="mt-0.5 text-muted-foreground/60">{s.department}</p>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* 학생 모드 안내 배너 */}
        {role === 'student' && (
          <div className="px-4 sm:px-6 py-2 flex items-center gap-2 text-xs bg-indigo-50 border-t border-indigo-200">
            <GraduationCap size={12} className="text-indigo-700" />
            <span className="text-indigo-700 font-medium">학생 모드</span>
            <span className="text-indigo-600">— {currentStudent.name} ({currentStudent.studentId}) 로 응시 중 · 데모 전용</span>
          </div>
        )}
      </header>

      {/* 본문 레이아웃: 사이드바 + 콘텐츠 */}
      <div className="flex min-h-[calc(100vh-56px)]">

        {/* 좌측 네비게이션 */}
        <aside className="hidden sm:flex flex-col shrink-0 w-[180px] bg-white border-r border-border sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
          <NavLinks />
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 min-w-0 px-6 lg:px-10 py-6">{children}</main>
      </div>
    </div>
  )
}
