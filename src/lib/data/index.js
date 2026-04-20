/**
 * 데이터 레이어 진입점 (re-export)
 *
 * 사용:
 *   import { listQuizzes, createQuiz } from '@/lib/data'
 */
export * from './quizzes'
export * from './courses'
export * from './banks'
export * from './students'
export * from './attempts'

export const DATA_MODE = import.meta.env.VITE_DATA_SOURCE ?? 'mock'
export const isApiMode = () => DATA_MODE === 'api'
