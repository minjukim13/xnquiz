import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Camera, Lock, FileCheck2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DEFAULT_CONSENT_TEXT } from '@/components/quiz-form'

const SECURITY_ITEMS = [
  {
    key: 'securityTrustLock',
    icon: Lock,
    title: 'TrustLock 시험 전용 브라우저',
    detail: '시험 전용 브라우저에서만 응시 가능합니다. 다른 응용프로그램을 종료한 뒤 시험 브라우저를 실행해 주세요.',
    checklist: [
      '시험 전용 브라우저가 설치되어 있어야 합니다.',
      '응시 중 시험 브라우저를 닫으면 응시가 강제 종료될 수 있습니다.',
    ],
  },
  {
    key: 'securityAiProctoring',
    icon: Camera,
    title: 'AI 시험 감독',
    detail: '응시 중 화면과 웹캠 영상이 기록되어 부정행위 검증에 활용됩니다.',
    checklist: [
      '웹캠 사용을 허용해 주세요.',
      '얼굴이 화면에 정확히 보이도록 카메라 위치를 조정해 주세요.',
      '주변 인물/외부 자료가 보이지 않는 환경에서 응시해 주세요.',
    ],
  },
  {
    key: 'securityRequireConsent',
    icon: FileCheck2,
    title: '응시 전 필수 동의',
    detail: '아래 안내문을 확인하고 동의해야 응시할 수 있습니다.',
    checklist: [],
  },
]

export default function PreflightGate({ quiz, onConsent, onCancel }) {
  const navigate = useNavigate()
  const [confirmed, setConfirmed] = useState(false)

  const handleCancel = () => {
    if (onCancel) onCancel()
    else navigate('/')
  }

  const activeItems = SECURITY_ITEMS.filter(it => quiz[it.key])
  const consentText = quiz.securityConsentText || DEFAULT_CONSENT_TEXT

  return (
    <div className="max-w-2xl mx-auto py-8 pb-12">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={20} className="text-primary" />
        <h1 className="text-lg font-bold text-foreground">응시 전 필수 안내</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        이 시험은 응시 전에 확인해야 하는 보안/감독 항목이 있습니다. 모든 안내를 확인하고 동의한 뒤 응시를 시작해 주세요.
      </p>

      <Card className="mb-4 p-5 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">시험명</p>
          <p className="text-base font-semibold text-foreground">{quiz.title}</p>
        </div>

        <div className="space-y-3">
          {activeItems.map(item => (
            <SecurityItemCard key={item.key} item={item} />
          ))}
        </div>

        {quiz.securityRequireConsent && (
          <div className="border-t border-secondary pt-4">
            <p className="text-sm font-medium text-foreground mb-2">동의 안내문</p>
            <pre className="text-xs leading-relaxed bg-secondary border border-border rounded-md p-3 whitespace-pre-wrap font-sans text-secondary-foreground">
              {consentText}
            </pre>
          </div>
        )}

        <label className="flex items-start gap-2.5 p-3 rounded-md border border-border bg-white cursor-pointer hover:border-primary/50 transition-colors">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 accent-primary"
          />
          <span className="text-sm text-foreground">
            위 안내 사항을 모두 읽었으며, 응시 중 보안 옵션이 활성화되는 데 동의합니다.
          </span>
        </label>

        <div className="bg-warning-bg border border-warning-border rounded-md p-3 flex items-start gap-2 text-xs text-warning-foreground">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <p>동의하지 않으면 응시 화면으로 진입할 수 없습니다. 동의 후에는 응시가 종료될 때까지 보안 옵션이 활성 상태로 유지됩니다.</p>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={handleCancel}>응시 취소</Button>
        <Button onClick={onConsent} disabled={!confirmed}>
          동의하고 응시 시작
        </Button>
      </div>
    </div>
  )
}

function SecurityItemCard({ item }) {
  const Icon = item.icon
  return (
    <div className="rounded-md border border-border bg-secondary/40 p-3">
      <div className="flex items-start gap-2.5">
        <span className="w-7 h-7 rounded-md bg-primary/10 text-primary inline-flex items-center justify-center shrink-0">
          <Icon size={15} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
          {item.checklist.length > 0 && (
            <ul className="mt-2 space-y-0.5 list-disc list-inside text-xs text-secondary-foreground">
              {item.checklist.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export function SecurityActiveBadges({ quiz }) {
  if (!quiz) return null
  const badges = []
  if (quiz.securityTrustLock) badges.push({ icon: Lock, label: '전용 브라우저 활성' })
  if (quiz.securityAiProctoring) badges.push({ icon: Camera, label: 'AI 감독 동작 중' })
  if (quiz.securityRequireConsent) badges.push({ icon: FileCheck2, label: '동의 완료' })
  if (badges.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {badges.map((b, i) => {
        const Icon = b.icon
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-accent text-primary"
            title="응시 중 활성 보안 옵션"
          >
            <Icon size={11} />
            {b.label}
          </span>
        )
      })}
    </div>
  )
}
