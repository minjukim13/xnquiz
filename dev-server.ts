// 로컬 개발용 API 서버 — vercel dev 대체
// Vercel Serverless 핸들러(`server/**/*.ts`) 를 그대로 Express 라우트로 마운트.
// 실행: npm run dev:api → http://localhost:3000
//
// 파일 → 라우트 매핑 규칙
//   server/health.ts                    → /api/health
//   server/auth/dev-login.ts            → /api/auth/dev-login
//   server/quizzes/index.ts             → /api/quizzes
//   server/quizzes/[id].ts              → /api/quizzes/:id
//   server/quizzes/[id]/questions.ts    → /api/quizzes/:id/questions
//
// 프로덕션에서는 api/[[...slug]].ts 가 동일 라우팅을 Express 로 수행 (함수 1개).
// 재로드: tsx watch 가 파일 변경 시 자동 재시작 (npm run dev:api 스크립트 참고)

import 'dotenv/config'
import express, { type Request, type Response, type NextFunction } from 'express'
import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const PORT = Number(process.env.PORT ?? 3000)
const API_DIR = join(process.cwd(), 'server')

function filePathToRoute(absPath: string): string {
  let rel = relative(API_DIR, absPath).split(sep).join('/')
  rel = rel.replace(/\.ts$/, '')
  rel = rel.replace(/\/index$/, '')
  rel = rel.replace(/\[([^\]]+)\]/g, ':$1')
  return '/api' + (rel ? '/' + rel : '')
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (name.endsWith('.ts')) out.push(p)
  }
  return out
}

async function main() {
  const app = express()

  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))

  // 요청 로그 (응답 시간 포함)
  app.use((req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
      const ms = Date.now() - start
      const color = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m'
      console.log(`${color}${res.statusCode}\x1b[0m ${req.method} ${req.originalUrl} — ${ms}ms`)
    })
    next()
  })

  const files = walk(API_DIR)
  for (const file of files) {
    const route = filePathToRoute(file)
    const mod = await import(pathToFileURL(file).href)
    const handler = mod.default
    if (typeof handler !== 'function') {
      console.warn(`  ⚠ ${route} — default export 가 함수가 아님 (skip)`)
      continue
    }

    app.all(route, async (req: Request, res: Response, next: NextFunction) => {
      // Vercel 은 동적 세그먼트를 req.query 에 넣음. Express 의 req.params 와 병합.
      const mergedQuery = { ...(req.query as Record<string, unknown>), ...req.params }
      Object.defineProperty(req, 'query', { value: mergedQuery, writable: true, configurable: true })

      try {
        await handler(req, res)
      } catch (err) {
        next(err)
      }
    })

    console.log(`  ✓ ${route}`)
  }

  // 404 (API 만)
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `Not Found: ${req.method} ${req.originalUrl}` })
  })

  // 에러 핸들러
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[server error]', err)
    if (!res.headersSent) res.status(500).json({ error: err.message })
  })

  app.listen(PORT, () => {
    console.log(`\n🚀 dev API server on http://localhost:${PORT}\n`)
  })
}

main().catch(e => { console.error(e); process.exit(1) })
