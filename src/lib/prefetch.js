// 네비게이션 링크 hover/focus/idle 시 라우트 청크 프리페치용
// App.jsx 의 lazy() 와 동일한 import() 를 공유 → 중복 다운로드 없음
export const prefetchRoute = {
  quizList: () => import('../pages/QuizList'),
  questionBankList: () => import('../pages/QuestionBankList'),
}
