# API 디렉터리 구조

Vercel Serverless Functions. 각 파일(또는 폴더의 `index.ts`)이 하나의 엔드포인트로 매핑됩니다.

## 라우팅 규칙

| 파일 경로                             | URL                               |
| ------------------------------------- | --------------------------------- |
| `api/health.ts`                       | `GET /api/health`                 |
| `api/auth/login.ts`                   | `POST /api/auth/login`            |
| `api/auth/register.ts`                | `POST /api/auth/register`         |
| `api/auth/me.ts`                      | `GET /api/auth/me`                |
| `api/courses/index.ts`                | `GET/POST /api/courses`           |
| `api/courses/[id].ts`                 | `GET/PATCH/DELETE /api/courses/:id` |
| `api/quizzes/index.ts`                | `GET/POST /api/quizzes`           |
| `api/quizzes/[id].ts`                 | `GET/PATCH/DELETE /api/quizzes/:id` |
| `api/quizzes/[id]/questions.ts`       | `GET/POST /api/quizzes/:id/questions` |
| `api/questions/[id].ts`               | `GET/PATCH/DELETE /api/questions/:id` |
| `api/banks/index.ts`                  | `GET/POST /api/banks`             |
| `api/banks/[id]/questions.ts`         | `GET/POST /api/banks/:id/questions` |
| `api/attempts/index.ts`               | `GET/POST /api/attempts`          |
| `api/attempts/[id].ts`                | `GET/PATCH /api/attempts/:id`     |
| `api/attempts/[id]/answers.ts`        | `PUT /api/attempts/:id/answers`   |
| `api/attempts/[id]/submit.ts`         | `POST /api/attempts/:id/submit`   |
| `api/students/index.ts`               | `GET /api/students`               |

## 공통 유틸

- `lib/prisma.ts` — Prisma 클라이언트 싱글턴 (Serverless 환경 최적화)
- `lib/auth.ts` — JWT 발급/검증, 비밀번호 해싱, Bearer 토큰 추출

## 인증

- 로그인 성공 시 `lib/auth.ts`의 `signToken()`으로 JWT 발급
- 보호된 엔드포인트는 `Authorization: Bearer <token>` 헤더 필요
- 각 핸들러에서 `getAuthFromRequest(req)` 호출해 검증
