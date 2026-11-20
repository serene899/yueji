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
  await page.getByLabel('时长分钟').fill('40');
  await page.getByRole('button', { name: '＋ 写点感受 / 收藏一句话' }).click();
  await page.getByLabel('想法和感受').fill('福贵把苦日子过成了平常日子。');
  await page.getByLabel('收藏的句子').fill('人是为了活着本身而活着的');
  await page.getByRole('button', { name: '保存记录' }).click();

  // 进度 = 80/200 = 40%
  await expect(page.getByText('40%')).toBeVisible();
  await expect(page.getByText('福贵把苦日子过成了平常日子。').first()).toBeVisible();
  await expect(page.getByText('「人是为了活着本身而活着的」').first()).toBeVisible();

  // ---- 刷新后数据仍在 ----
  await page.reload();
  await page.getByRole('button', { name: '书架' }).click();
  await page.getByText('《活着》').first().click();
  await expect(page.getByText('40%')).toBeVisible();
  await expect(page.getByText('福贵把苦日子过成了平常日子。').first()).toBeVisible();

  // ---- 再记一次，读到最后一页 → 自动读完 ----
  await page.getByRole('button', { name: '＋ 记一次阅读' }).click();
  await page.getByLabel('读到第几页').fill('200');
  await page.getByRole('button', { name: '＋ 写点感受 / 收藏一句话' }).click();
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
  await page.getByRole('button', { name: '＋ 写点感受 / 收藏一句话' }).click();
  await page.getByLabel('想法和感受').fill('像一场潮湿的梦。');
  await page.getByLabel('收藏的句子').fill('我们最接近的时候，距离只有0.01公分');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('像一场潮湿的梦。').first()).toBeVisible();

  // ---- 编辑电影：改成印象深刻 ----
  await page.getByRole('button', { name: '编辑作品' }).click();
  await page.getByLabel('印象深刻').check();
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByText('印象深刻').first()).toBeVisible();

  // ---- 年度回顾：2026 年 1 本读完 + 1 部看过 ----
  await page.getByRole('button', { name: '返回' }).click();
  await page.getByRole('button', { name: '回顾' }).click();
  await expect(page.getByText('本读完的书')).toBeVisible();
  await expect(page.getByText('部看完的电影')).toBeVisible();
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

// v0.3.0：电视剧（集数进度、看到最后一集自动看完）+ 封面上传并持久化。
test('电视剧与封面', async ({ page }) => {
  // 一张标准 1x1 PNG 作为海报（测试用小图，产品会压缩成 JPEG 存储）
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  await page.goto('./');
  await page.getByRole('button', { name: '添加第一部作品' }).click();
  await page.getByRole('dialog').getByRole('radio', { name: '📺 剧' }).click();
  await page.getByLabel('作品名').fill('漫长的季节');
  await page.getByLabel('创作者').fill('辛爽');
  await page.getByRole('button', { name: '悬疑', exact: true }).click();
  await page.getByLabel('总集数').fill('12');
  await page.getByRole('radio', { name: '在看' }).click();
  await page.getByRole('dialog').locator('input[type="file"]').setInputFiles({ name: 'poster.png', mimeType: 'image/png', buffer: png });
  // 表单里立刻能预览封面
  await expect(page.getByRole('dialog').getByAltText('《漫长的季节》封面')).toBeVisible();
  await page.getByRole('button', { name: '保存', exact: true }).click();

  await page.getByRole('button', { name: '书架' }).click();
  await page.getByText('《漫长的季节》').first().click();
  // 详情页有封面大图
  await expect(page.getByAltText('《漫长的季节》封面')).toBeVisible();

  // 记一次追剧：看到第 7 集
  await page.getByRole('button', { name: '＋ 记一次追剧' }).click();
  await page.getByLabel('看到第几集').fill('7');
  await page.getByRole('button', { name: '＋ 写点感受 / 收藏一句话' }).click();
  await page.getByLabel('想法和感受').fill('王响的执念看得人心酸。');
  await page.getByLabel('收藏的句子').fill('往前看，别回头');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('58%')).toBeVisible();
  await expect(page.getByText('看到 7 / 12 集')).toBeVisible();

  // 看到最后一集 → 自动看完
  await page.getByRole('button', { name: '＋ 记一次追剧' }).click();
  await page.getByLabel('看到第几集').fill('12');
  await page.getByRole('button', { name: '＋ 写点感受 / 收藏一句话' }).click();
  await page.getByLabel('想法和感受').fill('看完了，秋天真短。');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('100%')).toBeVisible();
  await expect(page.getByText('看完', { exact: true }).first()).toBeVisible();

  // 刷新后封面与进度都还在
  await page.reload();
  await page.getByRole('button', { name: '书架' }).click();
  await page.getByText('《漫长的季节》').first().click();
  await expect(page.getByAltText('《漫长的季节》封面')).toBeVisible();
  await expect(page.getByText('100%')).toBeVisible();

  // 年度回顾里有这部剧
  await page.getByRole('button', { name: '返回' }).click();
  await page.getByRole('button', { name: '回顾' }).click();
  await expect(page.getByText('部看完的剧')).toBeVisible();
  await expect(page.getByText('《漫长的季节》').first()).toBeVisible();
});

// v0.4.0 P0 回归：只加作品、直接标看完（一部剧一部记录都没记）→ 首页「最近观看」也必须出现。
test('最近观看包含无记录的已看完作品', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '添加第一部作品' }).click();
  await page.getByRole('dialog').getByRole('radio', { name: '📺 剧' }).click();
  await page.getByLabel('作品名').fill('太阳的后裔');
  await page.getByLabel('创作者').fill('李应福');
  await page.getByLabel('总集数').fill('16');
  await page.getByRole('radio', { name: '看完' }).click();
  await page.getByRole('button', { name: '保存', exact: true }).click();

  // 回到首页：最近观看里能看到这部剧
  await page.getByRole('button', { name: '首页' }).click();
  await expect(page.getByText('最近观看')).toBeVisible();
  await expect(page.getByText('《太阳的后裔》').first()).toBeVisible();
});

// v0.4.0 状态重算：读满自动读完；删掉达标记录后状态与进度一起退回。
test('删除达标记录后状态退回', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '添加第一部作品' }).click();
  await page.getByLabel('作品名').fill('短书');
  await page.getByLabel('创作者').fill('某作者');
  await page.getByLabel('总页数').fill('100');
  await page.getByRole('button', { name: '保存', exact: true }).click();

  await page.getByRole('button', { name: '书架' }).click();
  await page.getByText('《短书》').first().click();
  await page.getByRole('button', { name: '＋ 记一次阅读' }).click();
  await page.getByLabel('读到第几页').fill('50');
  await page.getByRole('button', { name: '＋ 写点感受 / 收藏一句话' }).click();
  await page.getByLabel('想法和感受').fill('读了一半。');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.getByText('50%')).toBeVisible();

  await page.getByRole('button', { name: '＋ 记一次阅读' }).click();
  await page.getByLabel('读到第几页').fill('100');
  await page.getByRole('button', { name: '＋ 写点感受 / 收藏一句话' }).click();
  await page.getByLabel('想法和感受').fill('读完了。');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.getByText('100%')).toBeVisible();
  await expect(page.getByText('读完', { exact: true }).first()).toBeVisible();

  // 删掉「读完了」那条 → 回到在读、进度 50%
  await page.getByText('读完了。').click();
  await page.getByRole('button', { name: '删除这条记录' }).click();
  await page.getByRole('button', { name: '再点一次确认删除' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('50%')).toBeVisible();
  await expect(page.getByText('在读', { exact: true }).first()).toBeVisible();
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
