/**
 * 데이터 레이어 진입점 (re-export)
 *
 * 사용:
 *   import { listQuizzes, createQuiz } from '@/lib/data'
 */
import { MODE, shouldUseApi } from './_common'

export * from './quizzes'
export * from './courses'
export * from './banks'
export * from './students'
export * from './attempts'

export const DATA_MODE = MODE
// LTI 런칭 상태에서는 mock 으로 배포됐어도 api 코드패스가 정답
export const isApiMode = shouldUseApi
