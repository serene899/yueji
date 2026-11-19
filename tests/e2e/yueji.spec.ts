import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// 阅迹 v0.1.0 全流程：添加书籍 → 阅读记录与进度 → 刷新恢复 → 读完 →
// 添加电影与观影记录 → 编辑 → 年度回顾 → 导出备份校验 → 删除记录与作品。
test('阅迹全流程', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: '添加第一部作品' })).toBeVisible();

  // ---- 添加书籍《活着》----
  await page.getByRole('button', { name: '添加第一部作品' }).click();
  await page.getByLabel('作品名').fill('活着');
  await page.getByLabel('创作者').fill('余华');
  await page.getByRole('button', { name: '文学', exact: true }).click();
  await page.getByLabel('总页数').fill('200');
  await page.getByRole('radio', { name: '在读' }).click();
  await page.getByLabel('开始日期').fill('2026-11-18');
  await page.getByRole('button', { name: '保存', exact: true }).click();

  // ---- 进书架打开详情 ----
  await page.getByRole('button', { name: '书架' }).click();
  await page.getByText('《活着》').first().click();
  await expect(page.getByRole('heading', { name: '《活着》' })).toBeVisible();

  // ---- 记一次阅读：读到 80 页 ----
  await page.getByRole('button', { name: '＋ 记一次阅读' }).click();
  await page.getByLabel('记录日期').fill('2026-11-19');
  await page.getByLabel('读到第几页').fill('80');
  await page.getByLabel('阅读时长').fill('40');
  await page.getByLabel('想法和感受').fill('福贵把苦日子过成了平常日子。');
  await page.getByLabel('收藏的句子').fill('人是为了活着本身而活着的');
  await page.getByRole('button', { name: '保存记录' }).click();

  // 进度 = 80/200 = 40%
  await expect(page.getByText('40%')).toBeVisible();
  await expect(page.getByText('福贵把苦日子过成了平常日子。')).toBeVisible();
  await expect(page.getByText('「人是为了活着本身而活着的」').first()).toBeVisible();

  // ---- 刷新后数据仍在 ----
  await page.reload();
  await page.getByRole('button', { name: '书架' }).click();
  await page.getByText('《活着》').first().click();
  await expect(page.getByText('40%')).toBeVisible();
  await expect(page.getByText('福贵把苦日子过成了平常日子。')).toBeVisible();

  // ---- 再记一次，读到最后一页 → 自动读完 ----
  await page.getByRole('button', { name: '＋ 记一次阅读' }).click();
  await page.getByLabel('读到第几页').fill('200');
  await page.getByLabel('想法和感受').fill('读完了，后劲很大。');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.getByText('100%')).toBeVisible();
  await expect(page.getByText('读完', { exact: true }).first()).toBeVisible();

  // ---- 添加电影《重庆森林》并记观影 ----
  await page.getByRole('button', { name: '返回' }).click();
  await page.getByRole('button', { name: '添加作品' }).click();
  await page.getByRole('dialog').getByRole('radio', { name: '🎬 电影' }).click();
  await page.getByLabel('作品名').fill('重庆森林');
  await page.getByLabel('创作者').fill('王家卫');
  await page.getByRole('button', { name: '剧情', exact: true }).click();
  await page.getByLabel('片长').fill('102');
  await page.getByRole('button', { name: '保存', exact: true }).click();

  await page.getByText('《重庆森林》').first().click();
  await page.getByRole('button', { name: '＋ 记一次观影' }).click();
  await page.getByLabel('想法和感受').fill('像一场潮湿的梦。');
  await page.getByLabel('收藏的句子').fill('我们最接近的时候，距离只有0.01公分');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('像一场潮湿的梦。')).toBeVisible();

  // ---- 编辑电影：改成印象深刻 ----
  await page.getByRole('button', { name: '编辑作品' }).click();
  await page.getByLabel('印象深刻').check();
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByText('印象深刻').first()).toBeVisible();

  // ---- 年度回顾：2026 年 1 本读完 + 1 部看过 ----
  await page.getByRole('button', { name: '返回' }).click();
  await page.getByRole('button', { name: '年度' }).click();
  await expect(page.getByText('本读完的书')).toBeVisible();
  await expect(page.getByText('部看过的电影')).toBeVisible();
  await expect(page.getByText('《重庆森林》').first()).toBeVisible(); // 印象深刻区

  // ---- 导出备份并校验内容 ----
  await page.getByRole('button', { name: '我的' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出备份（JSON）' }).click(),
  ]);
  const path = await download.path();
  const backup = JSON.parse(await readFile(path!, 'utf8'));
  expect(backup.app).toBe('yueji');
  expect(backup.works).toHaveLength(2);
  expect(backup.entries).toHaveLength(3);

  // ---- 删除一条记录 ----
  await page.getByRole('button', { name: '书架' }).click();
  await page.getByText('《重庆森林》').first().click();
  await page.getByText('像一场潮湿的梦。').click();
  await page.getByRole('button', { name: '删除这条记录' }).click();
  await page.getByRole('button', { name: '再点一次确认删除' }).click();
  await expect(page.getByText('像一场潮湿的梦。')).toHaveCount(0);

  // ---- 删除整部作品（连带记录）----
  await page.getByRole('button', { name: '编辑作品' }).click();
  await page.getByRole('button', { name: /删除这部作品/ }).click();
  await page.getByRole('button', { name: '再点一次确认删除' }).click();
  await page.getByRole('button', { name: '书架' }).click();
  await expect(page.getByText('《重庆森林》')).toHaveCount(0);
  await expect(page.getByText('《活着》').first()).toBeVisible();
});

// 恢复流程：导出 → 删除全部数据 → 用备份文件导入 → 数据回来。
test('导出备份后可导入恢复', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '添加第一部作品' }).click();
  await page.getByLabel('作品名').fill('三国演义');
  await page.getByLabel('创作者').fill('罗贯中');
  await page.getByRole('button', { name: '保存', exact: true }).click();

  await page.getByRole('button', { name: '我的' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出备份（JSON）' }).click(),
  ]);
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();

  // 删掉这本书，书架变空
  await page.getByRole('button', { name: '书架' }).click();
  await page.getByText('《三国演义》').first().click();
  await page.getByRole('button', { name: '编辑作品' }).click();
  await page.getByRole('button', { name: /删除这部作品/ }).click();
  await page.getByRole('button', { name: '再点一次确认删除' }).click();
  await page.getByRole('button', { name: '书架' }).click();
  await expect(page.getByText('《三国演义》')).toHaveCount(0);

  // 导入备份恢复
  await page.getByRole('button', { name: '我的' }).click();
  await page.locator('input[type="file"]').setInputFiles(backupPath!);
  await page.getByRole('button', { name: '确认恢复' }).click();
  await expect(page.getByText(/恢复完成/)).toBeVisible();
  await page.getByRole('button', { name: '书架' }).click();
  await expect(page.getByText('《三国演义》').first()).toBeVisible();
});
