// 단일 Vercel Function — Hobby 플랜 12 function 제한 대응.
// 기존 /api/** 개별 핸들러(server/**/*.ts) 를 Express 로 내부 라우팅해 1 개 function 으로 통합.
import type { VercelRequest, VercelResponse } from '@vercel/node'
import express, { type Request, type Response, type NextFunction } from 'express'

import health from '../server/health.js'
import authDevLogin from '../server/auth/dev-login.js'
import authMe from '../server/auth/me.js'
import courses from '../server/courses/index.js'
import students from '../server/students/index.js'
import quizzesIndex from '../server/quizzes/index.js'
import quizzesById from '../server/quizzes/[id].js'
import quizQuestions from '../server/quizzes/[id]/questions.js'
import questionsById from '../server/questions/[id].js'
import questionsRegrade from '../server/questions/[id]/regrade.js'
import banksIndex from '../server/banks/index.js'
import banksById from '../server/banks/[id].js'
import bankQuestions from '../server/banks/[id]/questions.js'
import bankQuestionsById from '../server/bank-questions/[id].js'
import attemptsIndex from '../server/attempts/index.js'
import attemptsById from '../server/attempts/[id].js'
import attemptsAnswers from '../server/attempts/[id]/answers.js'
import attemptsSubmit from '../server/attempts/[id]/submit.js'
import ltiJwks from '../server/lti/jwks.js'
import ltiLogin from '../server/lti/login.js'
import ltiLaunch from '../server/lti/launch.js'

type VercelHandler = (req: VercelRequest, res: VercelResponse) => Promise<unknown> | unknown

// Express → Vercel 어댑터: Express req.params 를 req.query 에 병합해 Vercel 핸들러로 전달
function vh(h: VercelHandler) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const mergedQuery = { ...(req.query as Record<string, unknown>), ...req.params }
    Object.defineProperty(req, 'query', { value: mergedQuery, writable: true, configurable: true })
    try {
      await h(req as unknown as VercelRequest, res as unknown as VercelResponse)
    } catch (err) {
      next(err)
    }
  }
}

let cached: express.Application | null = null

function buildApp() {
  const app = express()
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))

  app.all('/api/health', vh(health))

  // /api/auth/* 는 Vercel 이 OAuth 용도로 예약 → /api/session/* 로 이동
  app.all('/api/session/dev-login', vh(authDevLogin))
  app.all('/api/session/me', vh(authMe))
  // 로컬 dev-server 호환을 위해 구 경로도 유지
  app.all('/api/auth/dev-login', vh(authDevLogin))
  app.all('/api/auth/me', vh(authMe))

  app.all('/api/courses', vh(courses))
  app.all('/api/students', vh(students))

  app.all('/api/quizzes', vh(quizzesIndex))
  app.all('/api/quizzes/:id', vh(quizzesById))
  app.all('/api/quizzes/:id/questions', vh(quizQuestions))

  app.all('/api/questions/:id', vh(questionsById))
  app.all('/api/questions/:id/regrade', vh(questionsRegrade))

  app.all('/api/banks', vh(banksIndex))
  app.all('/api/banks/:id', vh(banksById))
  app.all('/api/banks/:id/questions', vh(bankQuestions))
  app.all('/api/bank-questions/:id', vh(bankQuestionsById))

  app.all('/api/attempts', vh(attemptsIndex))
  app.all('/api/attempts/:id', vh(attemptsById))
  app.all('/api/attempts/:id/answers', vh(attemptsAnswers))
  app.all('/api/attempts/:id/submit', vh(attemptsSubmit))

  // LTI 1.3 엔드포인트
  app.all('/api/lti/jwks', vh(ltiJwks))
  app.all('/api/lti/login', vh(ltiLogin))
  app.all('/api/lti/launch', vh(ltiLaunch))

  app.use('/api', (req, res) => {
    res.status(404).json({ error: `Not Found: ${req.method} ${req.originalUrl}` })
  })

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[api error]', err)
    if (!res.headersSent) res.status(500).json({ error: err.message })
  })

  return app
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!cached) cached = buildApp()
  return cached(req as unknown as Request, res as unknown as Response)
}
