# XN Quizzes — 프론트엔드

React 19 + Vite 8 + Tailwind v4. 모든 화면이 `src/data/mockData.js` 시드로 동작합니다.

## 실행

```bash
npm install
npm run dev
```

`http://localhost:5173` 에서 띄워 보고, 우측 상단 RoleToggle 로 교수자/학생 전환.

## 데이터 모드

`.env.local` 의 `VITE_DATA_SOURCE` 로 토글:

- `mock` (기본): 브라우저 localStorage + `mockData.js` 시드
- `api` : 동일 오리진의 `/api/*` 호출

`src/lib/data/*.js` 각 함수의 api 분기 코드가 곧 백엔드 엔드포인트 계약입니다. 함수 시그니처와 fetch 호출 패턴을 그대로 따라 구현하면 됩니다.

인증은 `POST /api/auth/dev-login` 으로 JWT 발급 → `localStorage.xnq_token` 저장 → 이후 fetch 에 `Authorization: Bearer` 자동 첨부 (`src/lib/api.js`).
