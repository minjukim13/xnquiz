# PM4 QA 테스트 보고서 — XN Quizzes 프로토타입

**작성일**: 2026-03-26
**작성자**: PM4 (QA 엔지니어)
**검토 대상**: XN Quizzes 프로토타입 (React 19 + Vite 8 + Tailwind CSS v4)
**검토 파일**: App.jsx, mockData.js, QuizList, QuizCreate, QuizEdit, GradingDashboard, QuizStats, QuestionBank, Layout, CustomSelect

---

## 요약 (Executive Summary)

| 구분 | Critical | High | Medium | Low | 합계 |
|---|---:|---:|---:|---:|---:|
| **기능 테스트** | 2 | 4 | 5 | 3 | 14 |
| **성능 테스트** | 0 | 2 | 3 | 2 | 7 |
| **보안 테스트** | 1 | 3 | 2 | 1 | 7 |
| **합계** | **3** | **9** | **10** | **6** | **28** |

---

## 1. 기능 테스트

### 1-1. 결과 요약표

| # | 테스트 항목 | 대상 파일 | 결과 | 심각도 |
|---|---|---|:---:|:---:|
| F-01 | 퀴즈 생성 — 발행 시 실제 저장 동작 없음 | QuizCreate | 실패 | Critical |
| F-02 | 퀴즈 편집 — URL :id와 데이터 비연결 (하드코딩) | QuizEdit | 실패 | Critical |
| F-03 | 채점 저장 — 로컬 state만 변경, 새로고침 시 초기화 | GradingDashboard | 실패 | High |
| F-04 | 문제은행 문항 추가 — 실제 저장 없음 | QuestionBank | 실패 | High |
| F-05 | 문제은행 문항 편집 저장 버튼 — onClick 핸들러 없음 | QuestionBank | 실패 | High |
| F-06 | 문제은행 문항 삭제 버튼 — onClick 핸들러 없음 | QuestionBank | 실패 | High |
| F-07 | 퀴즈 생성 — 시작일 > 마감일 허용 (역순 날짜 유효성 미검증) | QuizCreate | 실패 | Medium |
| F-08 | 퀴즈 생성 — 임시저장 버튼 동작 없음 | QuizCreate | 실패 | Medium |
| F-09 | 채점 대시보드 — 존재하지 않는 :id 접근 시 첫 번째 퀴즈로 fallback | GradingDashboard, QuizStats | 경고 | Medium |
| F-10 | QuizStats — 통계 페이지도 동일한 fallback 문제 | QuizStats | 경고 | Medium |
| F-11 | 채점 점수 입력 — 소수점 입력 가능 (정수 제한 없음) | GradingDashboard | 실패 | Medium |
| F-12 | QuizList — 상태 필터/검색 기능 없음 (전체 목록만 노출) | QuizList | 결함 | Low |
| F-13 | 문제은행 — 검색 초기화 버튼 없음 | QuestionBank | 결함 | Low |
| F-14 | 채점 모드 전환 — 문항 중심 ↔ 학생 중심 전환 시 선택 상태 미초기화 | GradingDashboard | 경고 | Low |

---

### 1-2. 상세 내용 및 재현 시나리오

#### F-01 Critical — 퀴즈 생성 발행 버튼이 저장하지 않음

**재현 시나리오**
1. `/quiz/new` 접속
2. 제목, 시작일, 마감일 입력
3. "다음: 문항 구성 →" 클릭
4. "발행하기" 클릭
5. `/`(QuizList)으로 navigate만 되고, 입력 데이터가 어디에도 저장되지 않음

**코드 근거**
```jsx
// QuizCreate.jsx:152-155
<button
  disabled={!isFormValid}
  onClick={() => navigate('/')}   // ← navigate만 실행, 저장 로직 없음
  className="btn-primary ..."
>발행하기</button>
```

**수정 권고안**: 발행하기 클릭 시 form + questions 데이터를 mockData.js 배열에 push(프로토타입)하거나, 실데이터 전환 시 POST API 연동. 최소한 퀴즈 목록에 신규 항목이 반영되어야 데모 흐름이 완성됨.

---

#### F-02 Critical — 퀴즈 편집이 URL :id와 무관하게 동작

**재현 시나리오**
1. QuizList에서 퀴즈 ID 2, 3, 4번의 "편집" 클릭
2. 모두 동일한 하드코딩 데이터("중간고사 - 데이터베이스 설계 및 SQL") 노출
3. URL은 `/quiz/2/edit`, `/quiz/3/edit`로 다르나 내용은 동일

**코드 근거**
```jsx
// QuizEdit.jsx:43-49
export default function QuizEdit() {
  const { id } = useParams()          // id는 받지만 사용하지 않음
  const [questions, setQuestions] = useState([
    QUESTION_BANK[0], QUESTION_BANK[2], QUESTION_BANK[4],  // 항상 고정값
  ])
```

**수정 권고안**: `mockQuizzes.find(q => q.id === id)`로 퀴즈 데이터를 조회하고, 해당 퀴즈의 설정값을 초기 state에 반영.

---

#### F-03 High — 채점 점수가 새로고침 시 초기화됨

**재현 시나리오**
1. 채점 대시보드 접속
2. 미채점 학생 선택, 점수 입력 후 "저장" 클릭
3. 저장됨 표시 확인
4. 브라우저 새로고침
5. 입력했던 점수가 사라지고 mockData 초기값으로 복구됨

**코드 근거**
```jsx
// GradingDashboard.jsx:511-513
const [score, setScore] = useState(student.score ?? '')
const [saved, setSaved] = useState(student.score !== null)
// setSaved(true)만 호출 — mockStudents 원본 데이터 변경 없음
```

**수정 권고안**: 프로토타입 단계에서는 localStorage 또는 React Context/Zustand에 채점 결과를 persist. 실데이터 전환 시 PATCH API 호출로 교체.

---

#### F-04 High — 문제은행 문항 추가가 QUESTION_BANK 상수에 반영되지 않음

**재현 시나리오**
1. `/question-bank` 접속
2. "문항 추가" 클릭, 내용 입력 후 저장
3. 모달이 닫히고 목록에 새 문항 미노출

**코드 근거**
```jsx
// QuestionBank.jsx:297-300
<button
  disabled={!form.text}
  className="..."   // onClick 핸들러 없음 — AddQuestionModal 내부 저장 버튼
>추가</button>
```
AddQuestionModal의 "추가" 버튼에 onClick이 없고, 상위 컴포넌트에도 추가 로직이 없음.

**수정 권고안**: `onAdd` 콜백 prop을 모달에 주입하고, QuestionBank 컴포넌트에서 local state 배열을 관리하여 렌더링에 반영.

---

#### F-05 High — 문제은행 문항 편집 저장 버튼 미연결

**재현 시나리오**
1. 문제은행 목록에서 편집 아이콘 클릭
2. 인라인 편집 폼 노출
3. 내용 수정 후 "저장" 클릭
4. 화면이 닫히지만 수정 내용이 반영되지 않음

**코드 근거**
```jsx
// QuestionBank.jsx:234-235
<button onClick={onEdit} ...>취소</button>  // onEdit = toggle
<button className="...">저장</button>        // onClick 없음
```

---

#### F-06 High — 문제은행 문항 삭제 버튼 미연결

**재현 시나리오**
1. 문제은행 목록에서 삭제 아이콘(휴지통) 클릭
2. 아무 반응 없음

**코드 근거**
```jsx
// QuestionBank.jsx:191
<button className="...">  // onClick 핸들러 없음
  <Trash2 size={14} />
</button>
```

---

#### F-07 Medium — 시작일 > 마감일 유효성 검증 없음

**재현 시나리오**
1. 퀴즈 생성 기본 정보 탭
2. 시작일: 2026-06-15 18:00, 마감일: 2026-06-15 09:00 입력
3. "다음: 문항 구성 →" 클릭 가능 — 오류 없음
4. 발행하기 활성화됨

**코드 근거**
```jsx
// QuizCreate.jsx:94
const isFormValid = form.title && form.startDate && form.dueDate
// 날짜 역순 여부 검사 없음
```

**수정 권고안**: `isFormValid`에 `new Date(form.dueDate) > new Date(form.startDate)` 조건 추가. 오류 시 인라인 메시지 표시.

---

#### F-08 Medium — 임시저장 버튼 동작 없음

**재현 시나리오**
1. 퀴즈 생성 화면에서 내용 입력
2. "임시저장" 클릭
3. 아무 피드백 없음

**코드 근거**
```jsx
// QuizCreate.jsx:144
<button className="btn-secondary text-sm">임시저장</button>
// onClick 없음
```

---

#### F-09 / F-10 Medium — 잘못된 :id 접근 시 첫 번째 퀴즈로 무음 fallback

**재현 시나리오**
1. `/quiz/999/grade` 직접 접속
2. "중간고사 - 데이터베이스 설계 및 SQL" 채점 대시보드가 열림 (id=1 데이터)
3. 사용자는 정상 접속으로 착각 가능

**코드 근거**
```jsx
// GradingDashboard.jsx:35
const QUIZ_INFO = mockQuizzes.find(q => q.id === id) ?? mockQuizzes[0]  // fallback

// QuizStats.jsx:37
const quiz = mockQuizzes.find(q => q.id === id) ?? mockQuizzes[0]      // 동일 패턴
```

**수정 권고안**: fallback 대신 404 또는 "퀴즈를 찾을 수 없습니다" 빈 상태 표시 후 목록으로 이동 유도.

---

#### F-11 Medium — 점수 입력에서 소수점 허용

**재현 시나리오**
1. 채점 대시보드에서 점수 입력란에 `7.5` 입력
2. 저장 버튼 활성화 및 저장 가능
3. `7.5점`으로 표시됨

**코드 근거**
```jsx
// GradingDashboard.jsx:583-590
<input
  type="number"
  min={0}
  max={question.points}
  // step 속성 없음 → 소수점 입력 가능
/>
```

**수정 권고안**: `step={1}` 속성 추가. 또는 저장 시 `Math.round()` 또는 `parseInt()` 처리.

---

## 2. 성능 테스트

### 2-1. 결과 요약표

| # | 테스트 항목 | 대상 | 결과 | 심각도 |
|---|---|---|:---:|:---:|
| P-01 | 82명 학생 목록 — 전체 렌더링 (가상화 없음) | GradingDashboard | 경고 | High |
| P-02 | 60개 문항 — 무한스크롤 미구현 시 전체 렌더링 | QuestionBank | 경고 | High |
| P-03 | 문제은행 모달 내 60개 문항 필터 — 매 입력마다 전체 재계산 | QuizCreate, QuizEdit | 경고 | Medium |
| P-04 | 점수 분포 차트 — 45개 데이터 포인트 X축 밀집 | QuizStats | 경고 | Medium |
| P-05 | manualChunks 함수형 적용 — 올바름 | vite.config.js | 통과 | - |
| P-06 | Lazy loading + Suspense — 전 페이지 적용 | App.jsx | 통과 | - |
| P-07 | recharts/lucide-react 별도 청크 분리 — 적용됨 | vite.config.js | 통과 | - |
| P-08 | QuizStats — scores.length > 0 체크 없이 Math.max/min 실행 가능성 | QuizStats | 경고 | Medium |
| P-09 | GradingDashboard — StatsTab 내 분포 계산이 메모이제이션 없음 | GradingDashboard | 경고 | Low |
| P-10 | QuestionBank — useMemo 적용 (filtered) — 올바름 | QuestionBank | 통과 | - |

---

### 2-2. 상세 내용

#### P-01 High — 82명 학생 목록 가상화 없음

GradingDashboard의 학생 중심 모드에서 82명 전체를 DOM에 렌더링한다. 프로토타입 규모에서는 문제없으나, 실데이터 환경에서 학생 수가 300명 이상이 되면 DOM 노드 과다 생성으로 렌더링 지연이 발생할 수 있다.

**현황**: `allStudents`(82개) 전체를 `map()` 렌더링.
**권고**: react-window 또는 react-virtual 도입 검토. 우선순위는 실데이터 전환 이후로 미뤄도 무방.

---

#### P-02 High — QuestionBank 60개 문항 전체 렌더링

QuestionBank 페이지는 QUESTION_BANK(60개)를 필터 결과에 따라 전체 렌더링한다. 문제은행 모달(QuizCreate, QuizEdit 내부)은 `visibleCount` 기반 무한스크롤로 15개씩 노출하나, 메인 페이지는 이 최적화가 없다.

**현황**
```jsx
// QuestionBank.jsx:131-143
{filtered.map(q => (    // filtered 결과 전체를 한 번에 렌더링
  <QuestionBankItem ... />
))}
```
**권고**: 메인 페이지에도 모달과 동일한 무한스크롤 또는 페이지네이션 적용.

---

#### P-03 Medium — 문제은행 모달 필터링에 useMemo 없음

QuizCreate의 QuestionBankModal 내 `filtered` 계산이 useMemo 없이 매 렌더에 재실행된다. QuizEdit의 동일 컴포넌트는 `handleScroll`에 useCallback을 적용했으나 `filtered`는 미적용.

**현황**
```jsx
// QuizCreate.jsx:558-563
const filtered = QUESTION_BANK.filter(q => {  // 메모이제이션 없음
  ...
})
```
QuizEdit.jsx의 동일 컴포넌트(354-363)도 동일 문제.

**권고**: `filtered`를 `useMemo(() => ..., [search, filterType, filterBank])`로 감싸기.

---

#### P-04 Medium — QuizStats 점수 분포 X축 밀집

점수 범위가 61~92점이면 X축 레이블이 31개가 된다. 현재 BarChart의 `distData`는 점수 하나당 1개 데이터 포인트를 생성하므로, X축이 지나치게 밀집되어 가독성이 저하된다.

**현황**: `Array.from({ length: maxScore - minScore + 1 }, ...)`
**권고**: 5점 또는 10점 단위로 구간화(bucket). GradingDashboard의 `StatsTab`처럼 구간 분포로 변경 권장.

---

#### P-08 Medium — QuizStats scores 빈 배열 시 Math.max/min 위험

`scores`가 빈 배열이면 `Math.max(...[])` = -Infinity, `Math.min(...[])` = Infinity가 반환된다. 현재는 `scores.length` 삼항 연산자로 보호하고 있으나, `distData` 생성 로직에서 `maxScore - minScore + 1`이 음수가 될 여지가 있다.

**현황**
```jsx
// QuizStats.jsx:44-45
const maxScore = scores.length ? Math.max(...scores) : 0
const minScore = scores.length ? Math.min(...scores) : 0
// scores 빈 배열 시 distData = Array.from({length: 0+1}, ...) → 1개 항목 생성
```
scores가 비어있으면 distData에 `{ score: '0점', count: 0 }` 한 건이 들어가 빈 차트 대신 0점 막대가 보임.

**권고**: `distData` 생성 조건에 `scores.length > 0` 가드 추가.

---

## 3. 보안 테스트

### 3-1. 결과 요약표

| # | 테스트 항목 | 대상 | 결과 | 심각도 |
|---|---|---|:---:|:---:|
| S-01 | 인증/인가 없음 — 모든 URL 무조건 접근 가능 | App.jsx | 실패 | Critical |
| S-02 | 문항 텍스트 입력값 XSS 위험 — dangerouslySetInnerHTML 없으나 구조적 위험 존재 | 전체 | 경고 | High |
| S-03 | 점수 입력에 서버 측 검증 없음 — 클라이언트 max 속성만 의존 | GradingDashboard | 경고 | High |
| S-04 | 학번 패턴이 실번호 형식과 유사 | mockData.js | 경고 | High |
| S-05 | 퀴즈 안내사항 textarea XSS | QuizCreate | 경고 | Medium |
| S-06 | URL 직접 접근 시 접근 제어 없음 | App.jsx | 실패 | Medium |
| S-07 | 실제 개인정보 사용 여부 | mockData.js | 통과 | - |

---

### 3-2. 상세 내용

#### S-01 Critical — 인증/인가 없음

App.jsx에 인증 Guard가 전혀 없다. 교수자 전용 페이지인 채점 대시보드, 문제은행, 퀴즈 생성/편집 모두 URL 직접 입력으로 접근 가능하다. 프로토타입 특성상 의도된 생략일 수 있으나, 실서비스 전환 시 가장 먼저 해결해야 하는 항목이다.

**현황**
```jsx
// App.jsx:23-31
<Routes>
  <Route path="/"              element={<QuizList />} />
  <Route path="/quiz/new"      element={<QuizCreate />} />
  <Route path="/quiz/:id/edit" element={<QuizEdit />} />
  <Route path="/quiz/:id/grade" element={<GradingDashboard />} />
  // ...인증 wrapper 없음
</Routes>
```
**수정 권고안**: `<ProtectedRoute>` 컴포넌트를 만들어 인증 여부 확인 후 미인증 시 `/login`으로 redirect.

---

#### S-02 High — 입력값 XSS 위험 (구조적)

현재 코드는 `dangerouslySetInnerHTML`을 사용하지 않으므로 직접적인 XSS 취약점은 없다. 그러나 사용자 입력값(문항 텍스트, 정답, 안내사항)을 별도 sanitize 없이 state에 저장하고 렌더링한다. 실데이터 연동 후 서버에서 저장된 문자열을 innerHTML 방식으로 렌더링하는 컴포넌트가 추가될 경우 XSS 취약점이 생긴다.

**점검 대상 input/textarea**
- QuizCreate.jsx: 제목(line 203), 설명(line 212), 안내사항(line 339)
- QuizCreate/QuizEdit AddQuestionModal: 문제 내용, 정답 입력
- QuestionBank AddQuestionModal: 문제 내용
- QuestionBank QuestionBankItem 인라인 편집: textarea(line 205)

**수정 권고안**: 실데이터 전환 시 DOMPurify 도입 또는 서버 측 입력값 sanitization 적용.

---

#### S-03 High — 점수 유효성을 클라이언트 속성에만 의존

채점 점수 입력의 범위 제한이 HTML `min=0 max={question.points}` 속성에만 의존한다. DevTools로 속성을 제거하거나 API를 직접 호출하면 범위를 벗어난 점수를 저장할 수 있다.

**현황**
```jsx
// GradingDashboard.jsx:594-595
disabled={score === '' || Number(score) > question.points || Number(score) < 0}
```
disabled 조건은 UI 레벨 가드이며, 네트워크 레벨에서는 무력화 가능.

**수정 권고안**: 실데이터 전환 시 서버 측에서 `0 <= score <= question.points` 검증 필수. 프로토타입에서도 저장 함수 내부에 범위 체크 조건 추가 권장.

---

#### S-04 High — 학번 패턴이 실번호 형식과 유사

CLAUDE.md 정책("실데이터 사용 금지, 학번 절대 사용 불가")과 대조 시 주의가 필요한 형태의 학번 패턴이 생성된다.

**현황**
```js
// mockData.js:211
studentId: `2022${String(i + 1001).slice(1)}`
// → 2022001 ~ 2022082 형태
```
실제 대학의 2022학번 학번 체계(예: 2022XXXXX)와 구조적으로 유사하다. 무작위 문자열 또는 명확히 가상임을 표시하는 형식(예: TEST-001)으로 변경하는 것이 적합하다.

**수정 권고안**: `studentId: `TEST-${String(i + 1).padStart(3, '0')}`` 또는 `DEMO${i + 1001}` 형식으로 변경.

---

#### S-05 Medium — 퀴즈 안내사항 textarea 입력 미검증

QuizCreate의 안내사항 textarea는 `DEFAULT_NOTICE` 문자열을 초기값으로 가지며, 사용자가 임의로 수정 가능하다. 현재 프로토타입에서는 React의 JSX 렌더링으로 HTML 이스케이프가 자동 적용되어 문제없으나, 향후 이 값을 PDF 생성이나 이메일 본문에 HTML로 삽입하는 기능이 추가될 경우 위험하다.

---

#### S-06 Medium — URL 직접 접근 시 무음 처리

앞서 F-09/F-10에서 설명한 것처럼, 존재하지 않는 퀴즈 ID로 접근 시 첫 번째 퀴즈 데이터가 그대로 노출된다. 이는 기능 결함이기도 하지만, 잘못된 데이터가 의도치 않게 노출된다는 점에서 보안(정보 노출) 관점 이슈이기도 하다.

---

#### S-07 통과 — 실데이터 사용 금지 정책 준수 여부

학생 이름은 `DEMO_NAMES` 배열(학생 A~L)을 사용하며 실명이 없다. 이메일, 실제 주민번호, 연락처는 존재하지 않는다. 학과명은 일반적인 학과명(컴퓨터공학과 등)이며 특정 기관을 식별할 수 없다. 다만 학번 패턴(S-04)은 보완 필요.

---

## 4. 우선순위별 통합 이슈 목록

### Critical (즉시 수정)

| ID | 내용 | 파일 |
|---|---|---|
| F-01 | 발행 버튼에 저장 로직 없음 — 퀴즈 생성 흐름 미완성 | QuizCreate.jsx |
| F-02 | 편집 페이지가 URL :id 무시, 하드코딩 데이터 표시 | QuizEdit.jsx |
| S-01 | 인증/인가 없음 — 모든 라우트 무조건 접근 가능 | App.jsx |

### High (다음 스프린트 수정)

| ID | 내용 | 파일 |
|---|---|---|
| F-03 | 채점 점수 새로고침 시 초기화 | GradingDashboard.jsx |
| F-04 | 문제은행 문항 추가 저장 미동작 | QuestionBank.jsx |
| F-05 | 문제은행 문항 편집 저장 버튼 핸들러 없음 | QuestionBank.jsx |
| F-06 | 문제은행 문항 삭제 버튼 핸들러 없음 | QuestionBank.jsx |
| P-01 | 82명 학생 목록 가상화 없음 | GradingDashboard.jsx |
| P-02 | 문제은행 60개 전체 렌더링 (메인 페이지 가상화 미적용) | QuestionBank.jsx |
| S-02 | XSS 구조적 위험 — 입력값 sanitize 미적용 | 전체 input/textarea |
| S-03 | 점수 범위 검증 클라이언트 의존 | GradingDashboard.jsx |
| S-04 | 학번 패턴이 실번호 형식과 유사 | mockData.js |

### Medium (백로그 등록)

| ID | 내용 | 파일 |
|---|---|---|
| F-07 | 시작일 > 마감일 역순 허용 | QuizCreate.jsx |
| F-08 | 임시저장 버튼 동작 없음 | QuizCreate.jsx |
| F-09/F-10 | 잘못된 :id로 첫 번째 데이터 fallback | GradingDashboard.jsx, QuizStats.jsx |
| F-11 | 점수 소수점 입력 허용 | GradingDashboard.jsx |
| P-03 | 문제은행 모달 filtered useMemo 미적용 | QuizCreate.jsx, QuizEdit.jsx |
| P-04 | 점수 분포 X축 지나치게 세분화 | QuizStats.jsx |
| P-08 | scores 빈 배열 시 distData 버그 | QuizStats.jsx |
| S-05 | 안내사항 textarea 실 서비스 연동 시 XSS 위험 | QuizCreate.jsx |
| S-06 | 잘못된 :id 접근 시 정보 노출 | GradingDashboard.jsx, QuizStats.jsx |

### Low (기술 부채 목록)

| ID | 내용 | 파일 |
|---|---|---|
| F-12 | QuizList 상태 필터/검색 없음 | QuizList.jsx |
| F-13 | 문제은행 검색 초기화 버튼 없음 | QuestionBank.jsx |
| F-14 | 채점 모드 전환 시 선택 상태 미초기화 | GradingDashboard.jsx |
| P-09 | StatsTab 분포 계산 useMemo 미적용 | GradingDashboard.jsx |

---

## 5. 실데이터 전환 시 체크리스트

| 항목 | 현재 상태 | 전환 필요 작업 |
|---|---|---|
| 퀴즈 CRUD | mockData.js 배열 직접 참조 | GET/POST/PUT/DELETE API 교체 |
| 채점 저장 | localStorage 없이 로컬 state만 | PATCH /api/grades/:id 연동 |
| 문제은행 CRUD | 상수 배열 + 저장 로직 없음 | 전체 API 연동 |
| 학생 목록 | mockStudents 82명 고정 | GET /api/students?quizId= 연동 |
| 학번 형식 | 2022001 형태 | 실 학번 체계에 맞게 교체 |
| 인증 | 없음 | JWT 또는 세션 기반 인증 Guard 추가 |
| 입력값 검증 | HTML 속성 의존 | 클라이언트 + 서버 이중 검증 |

---

---

## 6. 추가 발견 이슈 (2026-03-26 재검토)

이번 전체 코드 재독 과정에서 기존 보고서에서 누락된 이슈를 추가 기록한다.

### 6-1. 기능 이슈 추가

#### F-15 High — QuizCreate 발행 시 저장 로직이 부분 구현됨 (기존 F-01 보정)

기존 F-01 보고서 작성 후 코드를 재확인한 결과, 발행 버튼 onClick에 `mockQuizzes.push(...)` 로직이 실제로 존재하여 목록에 반영된다. 단, 문항 구성(`questions`, `totalPoints`) 데이터는 포함되나 `form.description`, `timeLimitType`, `notice` 등 상세 설정값은 push 대상에서 누락된다.

```jsx
// QuizCreate.jsx L.142-157
mockQuizzes.push({
  id: String(Date.now()),
  title: form.title,
  course: 'CS301 데이터베이스',
  status: 'open',
  startDate: form.startDate,
  dueDate: form.dueDate,
  week: form.week || 1,
  session: form.session || 1,
  totalStudents: 0,
  submitted: 0,
  graded: 0,
  pendingGrade: 0,
  questions: questions.length,
  totalPoints,
  // 누락: description, timeLimitType, allowAttempts, scorePolicy, shuffleChoices, notice
})
```

**심각도 재분류**: Critical → Medium (기본 흐름은 동작하나 상세 설정 일부 누락)

---

#### F-16 Medium — draft 상태 퀴즈에 "통계" 링크가 노출됨

QuizList의 QuizCard 컴포넌트에서 closed 상태가 아닌 퀴즈(open, grading, draft)에는 "통계"와 "편집" 링크가 모두 표시된다. draft 상태는 아직 응시자가 없음에도 통계 페이지로 이동 가능하며, 해당 페이지에서는 응시자 0명 데이터가 표시된다.

```jsx
// QuizList.jsx L.97-126
{quiz.status === 'closed' ? (
  <Link to={`/quiz/${quiz.id}/stats`}>결과 보기</Link>
) : (
  <>
    <Link to={`/quiz/${quiz.id}/stats`}>통계</Link>  // draft도 포함
    <Link to={`/quiz/${quiz.id}/edit`}>편집</Link>
  </>
)}
```

**수정 권고**: `quiz.status === 'draft'`인 경우 통계 링크 비노출 또는 클릭 시 안내 메시지 표시.

---

#### F-17 Low — 응시 횟수 1회 설정 시 "복수 응시 채점 방식" 항목이 항상 노출

QuizCreate의 InfoTab에서 응시 횟수를 1회로 설정해도 "복수 응시 시 채점 방식" 선택 항목이 항상 표시된다. 1회 응시에서는 이 항목이 의미 없는 UI가 된다.

**수정 권고**: `form.allowAttempts > 1`일 때만 채점 방식 필드 표시.

---

#### F-18 Medium — localStorage 채점 저장은 구현됨 (기존 F-03 보정)

기존 F-03 보고서는 "채점 점수가 새로고침 시 초기화됨"으로 기재됐으나, 실제 코드에서는 `localStorage.setItem('xnq_manual_grades', ...)` 로직이 구현되어 있고 초기화 시 `localStorage.getItem`으로 복원한다. 단, `student.score` 업데이트는 메모리상의 `mockStudents` 배열에 직접 mutation하며 새로고침 시 이 값은 초기화된다. 즉, 채점 점수 자체는 localStorage로 유지되나 `student.score`(총점)는 새로고침 시 mockData 초기값으로 돌아간다.

**심각도 재분류**: High → Medium (개별 문항 점수는 유지되나 총점 표시가 새로고침 시 이전 값으로 돌아가는 혼란 발생)

---

### 6-2. 성능 이슈 추가

#### P-11 High — GradingDashboard manualQuestions가 useMemo 바깥 선언

```jsx
// GradingDashboard.jsx L.43
const manualQuestions = mockQuestions.filter(q => !q.autoGrade)

const sortedQuestions = useMemo(() => {
  ...
}, [sortBy])  // manualQuestions가 의존성 배열에 없음
```

`manualQuestions`는 컴포넌트 렌더마다 새 배열 참조로 재생성된다. `sortedQuestions`의 useMemo는 `sortBy`만 감시하므로 `manualQuestions` 변경을 감지하지 못한다. mock 환경에서는 실질 영향이 없으나 실데이터 연동 시 문제가 될 수 있다.

**수정 권고**: `manualQuestions`를 `useMemo(() => mockQuestions.filter(q => !q.autoGrade), [])`로 감싸기.

---

#### P-12 Medium — QUESTION_BANK 배열이 3개 파일에 독립 선언

QuizCreate.jsx, QuizEdit.jsx, QuestionBank.jsx 세 파일 모두 동일한 패턴의 `QUESTION_BANK` 배열(60개)을 모듈 최상위 레벨에서 독립 생성한다. 코드 중복이며, 세 페이지가 동시에 로드되면 180개 객체가 생성된다.

**수정 권고**: `mockData.js`에 `export const QUESTION_BANK = ...`로 단일 선언 후 세 파일에서 import.

---

### 6-3. 보안 이슈 추가

#### S-08 High — localStorage 쓰기에 예외 처리 없음

```jsx
// GradingDashboard.jsx L.608-609
localStorage.setItem('xnq_manual_grades', JSON.stringify(grades))
// try-catch 없음
```

브라우저 localStorage 용량(보통 5~10MB) 초과 시 `QuotaExceededError` 예외가 발생하며 앱이 크래시될 수 있다. 다수의 채점 데이터가 누적될수록 위험이 높아진다.

**수정 권고**:
```jsx
try {
  localStorage.setItem('xnq_manual_grades', JSON.stringify(grades))
} catch (e) {
  if (e.name === 'QuotaExceededError') {
    alert('저장 공간 부족: 채점 데이터를 백업 후 캐시를 정리해주세요.')
  }
}
```

---

### 6-4. 수정된 우선순위 종합표

기존 보고서 + 추가 이슈 통합 기준.

| 심각도 | 이슈 수 | 주요 항목 |
|---|---|---|
| **Critical** | 2 | S-01 (인증 없음), F-02 (편집 URL 비연동) |
| **High** | 10 | F-05/06 (문제은행 편집·삭제 미구현), F-03 (총점 새로고침 초기화), S-02~04, S-08, P-01/02/11 |
| **Medium** | 12 | F-07/08/09/10/15/16/18, P-03/04/08/12, S-05/06 |
| **Low** | 5 | F-12/13/14/17, P-09 |

---

## 7. 테스트 환경 및 방법론

- **테스트 방식**: 코드 정적 분석 (Static Code Review) — 전체 소스 직접 독해
- **실제 E2E 테스트**: 미수행 (브라우저 실행 환경 검증 필요)
- **동시 접속 부하 테스트**: mock 환경 특성상 미적용
- **네트워크 지연 시뮬레이션**: 미적용

---

*본 보고서는 코드 정적 분석 및 시나리오 기반 검토 결과이며, 실제 브라우저 실행 환경 테스트(E2E)는 별도 수행이 필요합니다.*
