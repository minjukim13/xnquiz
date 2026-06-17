import { Section } from './Section'
import { Toggle } from './Toggle'
import { Field } from './Field'

export const DEFAULT_CONSENT_TEXT = `- 응시 중 화면, 웹캠 이미지, 시스템 활동 로그가 본 시험의 부정행위 검증 목적으로 기록됩니다.
- 수집된 정보는 시험 종료 후 6개월간 보관 후 안전하게 삭제됩니다.
- 응시 중 다른 응용프로그램 사용/외부 통신은 부정행위로 판단될 수 있습니다.`

export function SecuritySection({ form, set }) {
  return (
    <Section title="응시 보안">
      <Toggle
        checked={form.securityTrustLock}
        onChange={v => set('securityTrustLock', v)}
        label="시험 전용 브라우저"
        description="학생은 지정된 안전 브라우저에서만 응시할 수 있으며 다른 응용프로그램이 제한됩니다."
      />
      <Toggle
        checked={form.securityAiProctoring}
        onChange={v => set('securityAiProctoring', v)}
        label="AI 시험 감독"
        description="응시 중 학생 화면과 웹캠 영상을 AI 가 모니터링하여 이상 행동을 단서로 표시합니다."
      />
      <Toggle
        checked={form.securityRequireConsent}
        onChange={v => set('securityRequireConsent', v)}
        label="응시 전 필수 동의"
        description="학생이 동의하지 않으면 응시 화면에 진입할 수 없습니다."
      />
      {form.securityRequireConsent && (
        <div className="border-l-2 border-border pl-4 ml-0.5 space-y-2">
          <label className="block text-sm font-medium text-secondary-foreground">동의 안내문</label>
          <textarea
            value={form.securityConsentText}
            onChange={e => set('securityConsentText', e.target.value)}
            placeholder={DEFAULT_CONSENT_TEXT}
            rows={5}
            className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all resize-y leading-relaxed"
          />
          <p className="text-xs text-muted-foreground">미입력 시 placeholder 의 기본 안내문이 학생 화면에 노출됩니다.</p>
        </div>
      )}
      <Toggle
        checked={form.accessControlEnabled}
        onChange={v => set('accessControlEnabled', v)}
        label="접근 제한"
        description="액세스 코드 또는 허용 IP 를 지정해 응시 가능 범위를 제한합니다."
      />
      {form.accessControlEnabled && (
        <div className="border-l-2 border-border pl-4 ml-0.5 space-y-3">
          <Field label="액세스 코드">
            <input type="text" value={form.accessCode} onChange={e => set('accessCode', e.target.value)} placeholder="코드를 입력하면 응시 시 코드 입력이 필요합니다" className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all" />
            <p className="text-xs mt-1.5 text-muted-foreground">비워두면 액세스 코드 없이 응시 가능합니다.</p>
          </Field>
          <Field label="접근 가능한 IP 주소">
            <textarea value={form.ipRestriction} onChange={e => set('ipRestriction', e.target.value)} placeholder={'허용할 IP 주소를 한 줄에 하나씩 입력하세요\n예) 192.168.1.0/24\n    203.0.113.10'} rows={3} className="w-full text-sm px-3.5 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-all resize-none" />
            <p className="text-xs mt-1.5 text-muted-foreground">비워두면 모든 IP에서 접근 가능합니다. (CIDR 표기법 지원)</p>
          </Field>
        </div>
      )}
    </Section>
  )
}
