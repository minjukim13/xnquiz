import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, ChevronDown, GraduationCap, BookOpen, LayoutList } from 'lucide-react'
import { useRole, DEMO_STUDENTS } from '../context/RoleContext'

export default function Layout({ children, breadcrumbs = [] }) {
  const { role, setRole, currentStudent, setCurrentStudent } = useRole()
  const [showStudentPicker, setShowStudentPicker] = useState(false)
  const pickerRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    function handleClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowStudentPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const navItems = role === 'student'
    ? [{ label: '내 퀴즈', href: '/', icon: LayoutList }]
    : [
        { label: '퀴즈 관리', href: '/', icon: LayoutList },
        { label: '문제은행', href: '/question-banks', icon: BookOpen },
      ]

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/' || location.pathname.startsWith('/quiz')
    return location.pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]" style={{ color: '#222222' }}>
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-40" style={{ borderBottom: '1px solid #E0E0E0' }}>
        <div className="px-4 sm:px-6 h-[56px] flex items-center gap-2.5">

          {/* 로고 */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-[28px] h-[28px] bg-indigo-600 rounded flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
                <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
                <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
                <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
              </svg>
            </div>
            <span className="text-sm font-bold" style={{ color: '#222222' }}>XN Quizzes</span>
          </Link>

          {/* 브레드크럼 */}
          {breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 overflow-hidden min-w-0">
              <span className="text-sm font-light select-none mx-0.5" style={{ color: '#BDBDBD' }}>/</span>
              {breadcrumbs.map((b, i) => (
                <span key={i} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <ChevronRight size={12} className="shrink-0" style={{ color: '#BDBDBD' }} />}
                  {b.href ? (
                    <Link
                      to={b.href}
                      className="text-sm truncate transition-colors"
                      style={{ color: '#9E9E9E' }}
                      onMouseEnter={e => e.target.style.color = '#424242'}
                      onMouseLeave={e => e.target.style.color = '#9E9E9E'}
                    >
                      {b.label}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold truncate" style={{ color: '#222222' }}>{b.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}

          {/* 역할 토글 (우측 끝) */}
          <div className="ml-auto flex items-center gap-2 shrink-0">

            {/* 역할 전환 토글 */}
            <div
              className="flex items-center p-0.5 rounded text-xs"
              style={{ background: '#F5F5F5', border: '1px solid #E0E0E0' }}
            >
              <button
                onClick={() => setRole('instructor')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors"
                style={role === 'instructor'
                  ? { background: '#fff', color: '#222222', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }
                  : { color: '#9E9E9E' }
                }
              >
                <BookOpen size={12} />
                <span className="hidden sm:block">교수자</span>
              </button>
              <button
                onClick={() => setRole('student')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors"
                style={role === 'student'
                  ? { background: '#fff', color: '#222222', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }
                  : { color: '#9E9E9E' }
                }
              >
                <GraduationCap size={12} />
                <span className="hidden sm:block">학생</span>
              </button>
            </div>

            {/* 학생 선택기 (학생 모드일 때만) */}
            {role === 'student' && (
              <div className="relative" ref={pickerRef}>
                <button
                  onClick={() => setShowStudentPicker(v => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors"
                  style={{
                    background: showStudentPicker ? '#EEF2FF' : '#fff',
                    border: '1px solid #c7d2fe',
                    color: '#4338ca',
                    fontWeight: 500,
                  }}
                >
                  <GraduationCap size={12} />
                  <span>{currentStudent.name}</span>
                  <ChevronDown size={11} style={{ transform: showStudentPicker ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                </button>

                {showStudentPicker && (
                  <div
                    className="absolute right-0 top-full mt-1 rounded overflow-hidden z-50"
                    style={{ background: '#fff', border: '1px solid #E0E0E0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 180 }}
                  >
                    <div className="px-3 py-2" style={{ borderBottom: '1px solid #EEEEEE' }}>
                      <p className="text-xs font-semibold" style={{ color: '#9E9E9E' }}>학생 계정 선택 (데모)</p>
                    </div>
                    {DEMO_STUDENTS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setCurrentStudent(s); setShowStudentPicker(false) }}
                        className="w-full text-left px-3 py-2.5 text-xs transition-colors"
                        style={{
                          background: currentStudent.id === s.id ? '#F5F5FF' : 'transparent',
                          color: currentStudent.id === s.id ? '#4338ca' : '#424242',
                        }}
                        onMouseEnter={e => { if (currentStudent.id !== s.id) e.currentTarget.style.background = '#F5F5F5' }}
                        onMouseLeave={e => { if (currentStudent.id !== s.id) e.currentTarget.style.background = 'transparent' }}
                      >
                        <span className="font-medium">{s.name}</span>
                        <span className="ml-1.5" style={{ color: '#9E9E9E' }}>{s.studentId}</span>
                        <p className="mt-0.5" style={{ color: '#BDBDBD' }}>{s.department}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 학생 모드 안내 배너 */}
        {role === 'student' && (
          <div
            className="px-4 sm:px-6 py-2 flex items-center gap-2 text-xs"
            style={{ background: '#EEF2FF', borderTop: '1px solid #c7d2fe' }}
          >
            <GraduationCap size={12} style={{ color: '#4338ca' }} />
            <span style={{ color: '#4338ca', fontWeight: 500 }}>학생 모드</span>
            <span style={{ color: '#6366f1' }}>— {currentStudent.name} ({currentStudent.studentId}) 로 응시 중 · 데모 전용</span>
          </div>
        )}
      </header>

      {/* 본문 레이아웃: 사이드바 + 콘텐츠 */}
      <div className="flex" style={{ minHeight: 'calc(100vh - 56px)' }}>

        {/* 좌측 네비게이션 */}
        <aside
          className="hidden sm:flex flex-col shrink-0 bg-white"
          style={{
            width: 200,
            borderRight: '1px solid #E0E0E0',
            position: 'sticky',
            top: 56,
            height: 'calc(100vh - 56px)',
            overflowY: 'auto',
          }}
        >
          <nav className="p-3 space-y-0.5">
            <p className="text-xs font-semibold px-2 pt-2 pb-1.5" style={{ color: '#BDBDBD', letterSpacing: '0.06em' }}>
              {role === 'student' ? '학습' : '강의'}
            </p>
            {navItems.map(item => {
              const active = isActive(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded text-sm font-medium transition-colors"
                  style={active
                    ? { background: '#EEF2FF', color: '#4338ca' }
                    : { color: '#616161' }
                  }
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F5F5F5' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <Icon size={15} style={{ color: active ? '#4338ca' : '#9E9E9E' }} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
