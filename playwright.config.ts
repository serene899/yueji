import { defineConfig, devices } from '@playwright/test';

// iPhone 视口端到端测试。本机没有系统 Chrome，使用 Playwright 自带 Chromium 模拟 iPhone 13
// （视口/触控/UA 一致，引擎非 WebKit，真机 Safari 仍需所有者验收）。
// 在子路径 /yueji/ 下运行，与 GitHub Pages 部署形态一致。
const iphone = devices['iPhone 13'];
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4315/yueji/', trace: 'off', locale: 'zh-CN', timezoneId: 'Asia/Shanghai' },
  webServer: { command: 'node scripts/serve.mjs 4315 /yueji', url: 'http://127.0.0.1:4315/yueji/', reuseExistingServer: false },
  projects: [{ name: 'iphone13-chromium', use: { ...iphone, browserName: 'chromium', defaultBrowserType: 'chromium' } }],
});
