import { QUIZ_TYPES } from '../data/mockData'
import { cn } from '@/lib/utils'

// 유형별 미리보기 — AddQuestionModal 에서 type 선택 시 우측 패널에 표시
export default function QuestionTypePreview({ type }) {
  if (!type) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100">
          <span className="text-base">?</span>
        </div>
        <p className="text-xs text-center leading-relaxed">유형에 마우스를 올리면<br />예시 문항이 표시됩니다</p>
      </div>
    )
  }

  const previewMap = {
    multiple_choice: (
      <>
        <p className="text-xs font-semibold mb-2 text-neutral-700">Q. 다음 중 소수(prime number)는?</p>
        {[['① 1', false], ['② 2', true], ['③ 4', false], ['④ 6', false]].map(([opt, correct], i) => (
          <div key={i} className="flex items-center gap-1.5 py-0.5">
            <div className={cn(
              'w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center',
              correct ? 'border-indigo-500 bg-indigo-500' : 'border-neutral-300 bg-white'
            )}>
              {correct && <div className="w-1 h-1 rounded-full bg-white" />}
            </div>
            <span className={cn('text-xs', correct ? 'text-indigo-700 font-medium' : 'text-neutral-500')}>{opt}</span>
          </div>
        ))}
        <p className="text-xs mt-2 text-muted-foreground">보기 중 1개 선택, 자동채점</p>
      </>
    ),
    true_false: (
      <>
        <p className="text-xs font-semibold mb-2 text-neutral-700">Q. 지구는 태양 주위를 공전한다.</p>
        <div className="flex gap-2 mb-2">
          {['참 (True)', '거짓 (False)'].map((label, i) => (
            <div key={i} className={cn(
              'flex-1 text-center py-1.5 rounded text-xs font-medium border',
              i === 0 ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-neutral-100 border-neutral-200 text-neutral-500'
            )}>
              {label}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">참/거짓 중 1개 선택, 자동채점</p>
      </>
    ),
    multiple_answers: (
      <>
        <p className="text-xs font-semibold mb-2 text-neutral-700">Q. 다음 중 포유류를 모두 고르시오.</p>
        {[['고래', true], ['상어', false], ['박쥐', true], ['개구리', false]].map(([opt, correct], i) => (
          <div key={i} className="flex items-center gap-1.5 py-0.5">
            <div className={cn(
              'w-3 h-3 rounded flex-shrink-0 flex items-center justify-center border',
              correct ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-neutral-300'
            )}>
              {correct && <span className="text-white text-[8px]">✓</span>}
            </div>
            <span className={cn('text-xs', correct ? 'text-indigo-700' : 'text-neutral-500')}>{opt}</span>
          </div>
        ))}
        <p className="text-xs mt-2 text-muted-foreground">여러 개 선택 가능, 자동채점</p>
      </>
    ),
    short_answer: (
      <>
        <p className="text-xs font-semibold mb-2 text-neutral-700">Q. 대한민국의 수도는?</p>
        <div className="rounded px-2 py-1 text-xs mb-1 border border-neutral-200 text-muted-foreground">서울 입력</div>
        <p className="text-xs text-indigo-500">정답: 서울, Seoul (복수 정답 가능)</p>
        <p className="text-xs mt-1 text-muted-foreground">짧은 텍스트, 부분 자동채점</p>
      </>
    ),
    essay: (
      <>
        <p className="text-xs font-semibold mb-2 text-neutral-700">Q. 기후 변화의 원인과 해결 방안을 서술하시오.</p>
        <div className="rounded px-2 py-2 text-xs mb-1 border border-neutral-200 text-muted-foreground min-h-9">자유롭게 서술</div>
        <p className="text-xs text-muted-foreground">자유 서술형, 교수자 직접 채점</p>
      </>
    ),
    numerical: (
      <>
        <p className="text-xs font-semibold mb-2 text-neutral-700">Q. 원주율을 소수점 2자리까지 입력하시오.</p>
        <div className="flex items-center gap-2 mb-1">
          <div className="rounded px-2 py-1 text-xs font-medium border border-indigo-500 text-indigo-700">3.14</div>
          <span className="text-xs text-muted-foreground">± 0.01 허용</span>
        </div>
        <p className="text-xs text-muted-foreground">숫자 입력, 오차 범위 설정 가능</p>
      </>
    ),
    matching: (
      <>
        <p className="text-xs font-semibold mb-2 text-neutral-700">Q. 단어와 뜻을 연결하시오.</p>
        {[['사과', 'Apple'], ['바나나', 'Banana'], ['포도', 'Grape']].map(([l, r], i) => (
          <div key={i} className="flex items-center gap-1 py-0.5">
            <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">{l}</span>
            <span className="text-xs text-muted-foreground">→</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-800">{r}</span>
          </div>
        ))}
        <p className="text-xs mt-1.5 text-muted-foreground">항목 연결, 자동채점</p>
      </>
    ),
    formula: (
      <>
        <p className="text-xs font-semibold mb-2 text-neutral-700">Q. a개의 과일이 b개 바구니에 담겨 있을 때, 총 과일 수는?</p>
        <div className="rounded p-2 mb-2 space-y-1 bg-teal-50 border border-teal-200">
          <div className="flex gap-2 text-xs">
            <span className="font-medium text-teal-700">a</span>
            <span className="text-muted-foreground">= 1~10 정수</span>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="font-medium text-teal-700">b</span>
            <span className="text-muted-foreground">= 2~5 정수</span>
          </div>
          <div className="flex gap-1.5 items-center text-xs mt-1.5 pt-1.5 border-t border-teal-200">
            <span className="text-neutral-700">수식:</span>
            <span className="font-mono font-medium px-1.5 rounded bg-teal-100 text-teal-600">a * b</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">학생마다 a, b 값 다름 → 정답 자동계산</p>
      </>
    ),
    fill_in_multiple_blanks: (
      <>
        <p className="text-xs font-semibold mb-2 text-neutral-700">Q. 빈칸을 순서대로 채우세요.</p>
        <p className="text-xs leading-relaxed mb-2 text-neutral-700">
          <span className="px-1 py-0.5 rounded font-medium bg-indigo-50 text-indigo-700 border border-dashed border-indigo-500">봄</span>
          {' '}다음은{' '}
          <span className="px-1 py-0.5 rounded font-medium bg-indigo-50 text-indigo-700 border border-dashed border-indigo-500">여름</span>
          {' '}이다.
        </p>
        <p className="text-xs text-muted-foreground">빈칸 여러 개, 각각 채점</p>
      </>
    ),
    multiple_dropdowns: (
      <>
        <p className="text-xs font-semibold mb-2 text-neutral-700">Q. 알맞은 단어를 선택하세요.</p>
        <p className="text-xs leading-relaxed mb-2 text-neutral-700">
          계절은{' '}
          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-500">봄 ▾</span>
          {' '}이고, 색은{' '}
          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-500">파랑 ▾</span>
          {' '}이다.
        </p>
        <p className="text-xs text-muted-foreground">드롭다운 선택, 자동채점</p>
      </>
    ),
    text: (
      <>
        <div className="rounded px-3 py-2.5 mb-2 text-xs leading-relaxed bg-neutral-100 text-neutral-700 border border-neutral-200">
          이번 시험은 총 10문항으로 구성되어 있습니다. 계산기 사용은 허용되지 않으며, 모든 풀이 과정을 작성해 주세요.
        </div>
        <p className="text-xs text-muted-foreground">채점 없음, 학생에게 안내문으로 표시</p>
      </>
    ),
    file_upload: (
      <>
        <p className="text-xs font-semibold mb-2 text-neutral-700">Q. 완성된 보고서를 제출하시오.</p>
        <div className="rounded px-2 py-3 text-center mb-1 border-2 border-dashed border-neutral-200">
          <p className="text-xs text-muted-foreground">파일을 드래그하거나 클릭</p>
          <p className="text-xs mt-0.5 text-muted-foreground">PDF, DOC, DOCX, HWP</p>
        </div>
        <p className="text-xs text-muted-foreground">파일 업로드, 교수자 직접 채점</p>
      </>
    ),
  }

  return (
    <div>
      <p className="text-xs font-semibold mb-2.5 pb-2 text-indigo-500 border-b border-indigo-50">
        {QUIZ_TYPES[type]?.label} 예시
      </p>
      {previewMap[type] ?? <p className="text-xs text-muted-foreground">미리보기 없음</p>}
    </div>
  )
}
