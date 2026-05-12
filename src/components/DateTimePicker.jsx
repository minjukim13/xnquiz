import { useState, useEffect, useMemo } from 'react'
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const pad = (n) => String(n).padStart(2, '0')
const clamp = (n, min, max) => Math.min(Math.max(n, min), max)

const parseValue = (v) => {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

const toLocalString = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

const formatDisplay = (v) => {
  const d = parseValue(v)
  if (!d) return ''
  const ampm = d.getHours() >= 12 ? '오후' : '오전'
  const h12 = d.getHours() % 12 || 12
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${ampm} ${pad(h12)}:${pad(d.getMinutes())}`
}

const isSameDay = (a, b) =>
  a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const startOfDay = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

const to12 = (h) => {
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return { h12, period }
}

const to24 = (h12, period) => {
  if (period === 'AM') return h12 === 12 ? 0 : h12
  return h12 === 12 ? 12 : h12 + 12
}

export default function DateTimePicker({
  value,
  onChange,
  min,
  placeholder = '연도-월-일 --:--',
  className,
  size = 'md',
  disabled,
}) {
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(parseValue(value))
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseValue(value) || new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const init = parseValue(value) || new Date()
  const initial12 = to12(init.getHours())
  const [hour12, setHour12] = useState(initial12.h12)
  const [minute, setMinute] = useState(init.getMinutes())
  const [period, setPeriod] = useState(initial12.period)
  const [hourText, setHourText] = useState(pad(initial12.h12))
  const [minuteText, setMinuteText] = useState(pad(init.getMinutes()))

  useEffect(() => {
    if (!open) return
    const d = parseValue(value) || new Date()
    setSelectedDate(parseValue(value))
    setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1))
    const t = to12(d.getHours())
    setHour12(t.h12)
    setMinute(d.getMinutes())
    setPeriod(t.period)
    setHourText(pad(t.h12))
    setMinuteText(pad(d.getMinutes()))
  }, [open, value])

  const minDate = useMemo(() => parseValue(min), [min])
  const minDisplay = useMemo(() => (minDate ? formatDisplay(min) : ''), [minDate, min])
  const display = formatDisplay(value)
  const hasValue = !!value

  // 현재 입력값이 min 보다 이전인지 (날짜 + 시간 모두 고려)
  const candidate = useMemo(() => {
    if (!selectedDate) return null
    const h24 = to24(hour12, period)
    const d = new Date(selectedDate)
    d.setHours(h24, minute, 0, 0)
    return d
  }, [selectedDate, hour12, minute, period])
  const candidateBeforeMin = !!(minDate && candidate && candidate < minDate)

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const today = new Date()

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()
    const cells = []
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month - 1, prevMonthDays - i), current: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), current: true })
    }
    let nextDay = 1
    while (cells.length % 7 !== 0 || cells.length < 42) {
      cells.push({ date: new Date(year, month + 1, nextDay++), current: false })
      if (cells.length >= 42) break
    }
    return cells
  }, [year, month])

  const isDateDisabled = (date) => {
    if (!minDate) return false
    return startOfDay(date) < startOfDay(minDate)
  }

  const handleClear = (e) => {
    e?.stopPropagation()
    e?.preventDefault()
    onChange('')
    setOpen(false)
  }

  const commitHour = () => {
    const n = parseInt(hourText, 10)
    const safe = Number.isFinite(n) ? clamp(n, 1, 12) : hour12
    setHour12(safe)
    setHourText(pad(safe))
  }

  const commitMinute = () => {
    const n = parseInt(minuteText, 10)
    const safe = Number.isFinite(n) ? clamp(n, 0, 59) : minute
    setMinute(safe)
    setMinuteText(pad(safe))
  }

  const handleConfirm = () => {
    if (!selectedDate) return
    const h24 = to24(hour12, period)
    const d = new Date(selectedDate)
    d.setHours(h24, minute, 0, 0)
    if (minDate && d < minDate) return
    onChange(toLocalString(d))
    setOpen(false)
  }

  const handleToday = () => {
    const now = new Date()
    setSelectedDate(now)
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    const t = to12(now.getHours())
    setHour12(t.h12)
    setMinute(now.getMinutes())
    setPeriod(t.period)
    setHourText(pad(t.h12))
    setMinuteText(pad(now.getMinutes()))
  }

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2.5 py-2'
    : 'text-sm px-3.5 py-2.5'

  return (
    <Popover open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'group/dt w-full flex items-center justify-between gap-2 rounded-md border border-border bg-white text-left transition-all',
            'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary',
            'aria-expanded:border-primary aria-expanded:ring-2 aria-expanded:ring-blue-100',
            'disabled:cursor-not-allowed disabled:opacity-50',
            sizeClasses,
            className,
          )}
        >
          <span className={cn('truncate', !hasValue && 'text-muted-foreground')}>
            {hasValue ? display : placeholder}
          </span>
          <span className="flex items-center gap-0.5 shrink-0">
            {hasValue && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="지우기"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleClear(e)
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 rounded-xl"
        align="start"
        sideOffset={6}
      >
        <div className="p-3.5">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              className="p-1.5 rounded-md hover:bg-secondary transition-colors"
              aria-label="이전 달"
            >
              <ChevronLeft className="w-4 h-4 text-secondary-foreground" />
            </button>
            <div className="text-sm font-semibold text-foreground tabular-nums">
              {year}년 {pad(month + 1)}월
            </div>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              className="p-1.5 rounded-md hover:bg-secondary transition-colors"
              aria-label="다음 달"
            >
              <ChevronRight className="w-4 h-4 text-secondary-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div
                key={d}
                className={cn(
                  'w-9 h-7 flex items-center justify-center text-[11px] font-medium',
                  i === 0 && 'text-rose-500',
                  i === 6 && 'text-primary',
                  i > 0 && i < 6 && 'text-muted-foreground',
                )}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((cell, idx) => {
              const dis = isDateDisabled(cell.date)
              const sel = isSameDay(cell.date, selectedDate)
              const isToday = isSameDay(cell.date, today)
              const dow = cell.date.getDay()
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => !dis && setSelectedDate(cell.date)}
                  disabled={dis}
                  title={dis ? `${minDisplay} 이후로 설정해주세요` : ''}
                  className={cn(
                    'w-9 h-9 flex items-center justify-center text-sm rounded-md transition-colors tabular-nums',
                    !cell.current && 'text-muted-foreground/40',
                    cell.current && !sel && dow === 0 && 'text-rose-500',
                    cell.current && !sel && dow === 6 && 'text-primary',
                    cell.current && !sel && dow > 0 && dow < 6 && 'text-foreground',
                    !sel && !dis && 'hover:bg-secondary',
                    sel && 'bg-primary text-white font-semibold hover:bg-primary-hover',
                    isToday && !sel && 'ring-1 ring-inset ring-primary/40',
                    dis && 'opacity-30 cursor-not-allowed',
                  )}
                >
                  {cell.date.getDate()}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 sm:px-3.5 py-2.5 border-t border-border">
          <span className="text-xs font-medium text-secondary-foreground shrink-0">시각</span>
          <div className="flex items-center gap-1 flex-1 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={hourText}
              onChange={(e) => setHourText(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
              onBlur={commitHour}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitHour() } }}
              className="w-11 text-center text-sm py-1.5 rounded-md border border-border bg-white tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-blue-100 transition-all"
              aria-label="시"
            />
            <span className="text-foreground font-semibold select-none">:</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={minuteText}
              onChange={(e) => setMinuteText(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
              onBlur={commitMinute}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitMinute() } }}
              className="w-11 text-center text-sm py-1.5 rounded-md border border-border bg-white tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-blue-100 transition-all"
              aria-label="분"
            />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm py-1.5 pl-2 pr-1 rounded-md border border-border bg-white outline-none focus:border-primary focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
              aria-label="오전/오후"
            >
              <option value="AM">오전</option>
              <option value="PM">오후</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t border-border bg-secondary/40 rounded-b-xl">
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleClear()}
              className="text-muted-foreground hover:text-destructive"
            >
              지우기
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToday}
            >
              오늘
            </Button>
          </div>
          <div className="flex gap-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="button" size="sm" onClick={handleConfirm} disabled={!selectedDate || candidateBeforeMin}>
              완료
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
