import { defineConfig } from '@playwright/test'

// 로컬 E2E 전용 설정 — CI 와 별개 (CI 는 나중에 별도 구성)
// 전제: dev-server (http://localhost:3000) 와 Vite (http://localhost:5173) 가 떠 있어야 함.
// 실행: npx playwright test
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1, // 동일 DB 를 공유하므로 직렬 실행
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { channel: 'chromium' } },
  ],
})
