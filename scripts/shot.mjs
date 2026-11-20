import { chromium, devices } from '@playwright/test';
// 截图脚本：用真实界面流程造演示数据（虚构，含封面上传），截首页/书架/详情三张图。
const iphone = devices['iPhone 13'];
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...iphone, browserName: 'chromium', locale: 'zh-CN', timezoneId: 'Asia/Shanghai' });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:4315/yueji/');

// 《活着》在读 + 封面
await page.getByRole('button', { name: '添加第一部作品' }).click();
await page.getByLabel('作品名').fill('活着');
await page.getByLabel('创作者').fill('余华');
await page.getByRole('button', { name: '文学', exact: true }).click();
await page.getByLabel('总页数').fill('200');
await page.getByRole('radio', { name: '在读' }).click();
await page.getByLabel('印象深刻').check();
await page.getByRole('dialog').locator('input[type="file"]').setInputFiles('/tmp/cover-book.png');
await page.waitForTimeout(600);
await page.getByRole('button', { name: '保存', exact: true }).click();
await page.getByRole('button', { name: '书架' }).click();
await page.getByText('《活着》').first().click();
await page.getByRole('button', { name: '＋ 记一次阅读' }).click();
await page.getByLabel('读到第几页').fill('126');
await page.getByLabel('时长分钟').fill('45');
await page.getByRole('button', { name: '＋ 写点感受 / 收藏一句话' }).click();
await page.getByLabel('想法和感受').fill('福贵把苦日子过成了平常日子，看着看着鼻子发酸。');
await page.getByLabel('收藏的句子').fill('人是为了活着本身而活着的');
await page.getByRole('button', { name: '保存记录' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: 'docs/screenshots/detail.png' });

// 《漫长的季节》在看 + 海报
await page.getByRole('button', { name: '返回' }).click();
await page.getByRole('button', { name: '添加作品' }).click();
await page.getByRole('dialog').getByRole('radio', { name: '📺 剧' }).click();
await page.getByLabel('作品名').fill('漫长的季节');
await page.getByLabel('创作者').fill('辛爽');
await page.getByRole('button', { name: '悬疑', exact: true }).click();
await page.getByLabel('总集数').fill('12');
await page.getByRole('radio', { name: '在看' }).click();
await page.getByRole('dialog').locator('input[type="file"]').setInputFiles('/tmp/cover-tv.png');
await page.waitForTimeout(600);
await page.getByRole('button', { name: '保存', exact: true }).click();
await page.getByText('《漫长的季节》').first().click();
await page.getByRole('button', { name: '＋ 记一次追剧' }).click();
await page.getByLabel('看到第几集').fill('7');
await page.getByRole('button', { name: '＋ 写点感受 / 收藏一句话' }).click();
await page.getByLabel('想法和感受').fill('王响的执念看得人心酸，东北的秋天真短。');
await page.getByLabel('收藏的句子').fill('往前看，别回头');
await page.getByRole('button', { name: '保存记录' }).click();

// 《重庆森林》看完 + 海报
await page.getByRole('button', { name: '返回' }).click();
await page.getByRole('button', { name: '添加作品' }).click();
await page.getByRole('dialog').getByRole('radio', { name: '🎬 电影' }).click();
await page.getByLabel('作品名').fill('重庆森林');
await page.getByLabel('创作者').fill('王家卫');
await page.getByRole('button', { name: '剧情', exact: true }).click();
await page.getByLabel('片长').fill('102');
await page.getByRole('dialog').locator('input[type="file"]').setInputFiles('/tmp/cover-movie.png');
await page.waitForTimeout(600);
await page.getByRole('button', { name: '保存', exact: true }).click();
await page.getByText('《重庆森林》').first().click();
await page.getByRole('button', { name: '＋ 记一次观影' }).click();
await page.getByRole('button', { name: '＋ 写点感受 / 收藏一句话' }).click();
await page.getByLabel('想法和感受').fill('像一场潮湿的梦，配乐一直在脑子里转。');
await page.getByLabel('收藏的句子').fill('我们最接近的时候，距离只有0.01公分');
await page.getByRole('button', { name: '保存记录' }).click();

await page.getByRole('button', { name: '返回' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: 'docs/screenshots/shelf.png' });
await page.getByRole('radio', { name: '网格' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: 'docs/screenshots/shelf-grid.png' });
await page.getByRole('button', { name: '记录' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: 'docs/screenshots/records.png' });
await page.getByRole('button', { name: '首页' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: 'docs/screenshots/home.png' });
await browser.close();
console.log('done');
