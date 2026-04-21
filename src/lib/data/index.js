/**
 * 데이터 레이어 진입점 (re-export)
 *
 * 사용:
 *   import { listQuizzes, createQuiz } from '@/lib/data'
 */
import { MODE } from './_common'

export * from './quizzes'
export * from './courses'
export * from './banks'
export * from './students'
export * from './attempts'

export const DATA_MODE = MODE
export const isApiMode = () => MODE === 'api'
