import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { GraduationCap, BookOpen, LayoutList, Menu } from 'lucide-react'
import { useRole } from '../context/role'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

function NavLinks({ navItems, isActive, role, onNavigate }) {
  return (
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
                ? 'bg-accent text-primary'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <Icon size={15} className={active ? 'text-primary' : 'text-muted-foreground/60'} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

/* ── 역할 토글 (사이드바/모바일 공용) ── */
function RoleToggle({ role, setRole }) {
  return (
    <div className="flex items-center p-0.5 rounded-lg w-full bg-secondary">
      <button
        onClick={() => setRole('instructor')}
        className={cn(
          'flex-1 flex items-center justify-center px-2 py-2 rounded-md text-xs transition-all',
          role === 'instructor'
            ? 'bg-white text-foreground font-semibold shadow-sm'
            : 'text-caption hover:text-muted-foreground'
        )}
      >
        교수자
      </button>
      <button
        onClick={() => setRole('student')}
        className={cn(
          'flex-1 flex items-center justify-center px-2 py-2 rounded-md text-xs transition-all',
          role === 'student'
            ? 'bg-white text-foreground font-semibold shadow-sm'
            : 'text-caption hover:text-muted-foreground'
        )}
      >
        학생
      </button>
    </div>
  )
}

function isLtiActive() {
  try { return typeof window !== 'undefined' && localStorage.getItem('xnq_lti_active') === '1' } catch { return false }
}

export default function Layout({ children }) {
  const { role, setRole, currentStudent } = useRole()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()

  // LTI 모드 (Canvas iframe 진입): Canvas 가 이미 좌측 네비게이션 제공
  // → xnquiz 내부 사이드바/헤더/역할토글 숨김. 콘텐츠만 렌더.
  // → lti-mode 클래스로 페이지별 max-w-5xl 중앙정렬 해제 (index.css)
  if (isLtiActive()) {
    return (
      <div className="lti-mode min-h-screen bg-background text-foreground">
        <main className="px-6 lg:px-10 py-6">{children}</main>
      </div>
    )
  }

  const navItems = role === 'student'
    ? [{ label: '내 퀴즈', href: '/', icon: LayoutList }]
    : [
        { label: '퀴즈', href: '/', icon: LayoutList },
        { label: '문제모음', href: '/question-banks', icon: BookOpen },
      ]

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/' || location.pathname.startsWith('/quiz')
    return location.pathname.startsWith(href)
  }


  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── 모바일 전용 헤더 ── */}
      <header className="sm:hidden bg-background sticky top-0 z-40">
        <div className="px-4 h-12 flex items-center gap-2.5">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <Menu size={18} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] p-0 flex flex-col">
              <div className="p-4">
                <Link to="/" className="flex items-center gap-2" onClick={() => setMobileNavOpen(false)}>
                  <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
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
              <NavLinks navItems={navItems} isActive={isActive} role={role} onNavigate={() => setMobileNavOpen(false)} />
              <div className="mt-auto p-3 space-y-2">
                <RoleToggle role={role} setRole={setRole} />
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
                <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
                <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
                <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
              </svg>
            </div>
            <span className="text-sm font-bold">XN Quizzes</span>
          </Link>

        </div>

        {role === 'student' && (
          <div className="px-4 py-1.5 flex items-center gap-2 text-xs bg-accent">
            <GraduationCap size={11} className="text-primary" />
            <span className="text-primary truncate">{currentStudent.name} ({currentStudent.studentId})</span>
          </div>
        )}
      </header>

      {/* ── 본문 레이아웃 ── */}
      <div className="flex min-h-screen">

        {/* 좌측 사이드바 — 데스크톱 전용 */}
        <aside className="hidden sm:flex flex-col shrink-0 w-[200px] bg-background sticky top-0 h-screen overflow-y-auto z-30">
          {/* 로고 */}
          <div className="px-4 pt-5 pb-1">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
                  <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
                  <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
                  <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
                </svg>
              </div>
              <span className="text-sm font-bold text-foreground">XN Quizzes</span>
            </Link>
          </div>

          {/* 네비게이션 */}
          <NavLinks navItems={navItems} isActive={isActive} role={role} />

          {/* 하단 고정: 역할 토글 */}
          <div className="mt-auto p-3 space-y-2">
            <RoleToggle role={role} setRole={setRole} />
          </div>
        </aside>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* 학생 모드 안내 배너 — 데스크톱 */}
          {role === 'student' && (
            <div className="hidden sm:flex items-center gap-2 mx-6 lg:mx-10 mt-4 px-4 py-2.5 rounded-lg text-xs bg-accent">
              <GraduationCap size={12} className="text-primary" />
              <span className="text-primary font-medium">학생 모드</span>
              <span className="text-primary">— {currentStudent.name} ({currentStudent.studentId}) 로 응시 중 · 데모 전용</span>
            </div>
          )}

          <main className="flex-1 min-w-0 px-6 lg:px-10 pb-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
