import { describe, expect, it } from 'vitest';
import { buildExchange } from '../../src/lib/lifeos';
import type { Entry, Work } from '../../src/lib/types';

const work = (over: Partial<Work>): Work => ({
  id: 'w1', type: 'book', title: '书', creator: '作者', category: '文学',
  status: 'doing', highlight: false, createdAt: 1, updatedAt: 1, ...over,
});
const entry = (over: Partial<Entry>): Entry => ({
  id: 'e1', workId: 'w1', date: '2026-11-18', feeling: '', quote: '', createdAt: 1, updatedAt: 1, ...over,
});

describe('阅迹 LIFEOS 交换导出', () => {
  it('只送事实：阅读分钟按日汇总、文化活动带标志、感受原文不进文件', async () => {
    const works = [work({}), work({ id: 'w2', type: 'movie', title: '片', finishDate: '2026-11-18' })];
    const entries = [
      entry({ minutes: 30, feeling: '很触动的一段话', quote: '收藏的句子' }),
      entry({ id: 'e2', minutes: 15 }),
      entry({ id: 'e3', workId: 'w2', date: '2026-11-18' }),
    ];
    const f = await buildExchange(works, entries, new Date('2026-11-19T00:00:00Z'));
    expect(f.manifest.format).toBe('lifeos-exchange');
    expect(f.manifest.sourceApp).toBe('lifeos.yueji');
    expect(f.manifest.scoringPolicy).toBe('facts-never-produce-scores');
    const reading = f.records.find((r) => r.data.metricKey === 'x-reading-minutes');
    expect(reading?.data.value).toBe(45);
    const culture = f.records.find((r) => r.data.metricKey === 'x-culture-activity');
    expect(culture?.data.attributes).toMatchObject({ hasFeeling: true, hasQuote: true, finished: true });
    const raw = JSON.stringify(f);
    expect(raw).not.toContain('很触动的一段话');
    expect(raw).not.toContain('收藏的句子');
    expect(f.manifest.checksum.value).toMatch(/^[0-9a-f]{64}$/);
    for (const r of f.records) expect(r.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('v0.4.3：阅读秒数折算后按日四舍五入为整数分钟', async () => {
    const f = await buildExchange([work({})], [entry({ minutes: 40, seconds: 30 })]);
    const reading = f.records.find((r) => r.data.metricKey === 'x-reading-minutes');
    expect(reading?.data.value).toBe(41);
  });

  it('电影时长不算阅读分钟；无记录时文件为空但合法', async () => {
    const f = await buildExchange([work({ id: 'w2', type: 'movie' })], [entry({ workId: 'w2', minutes: 120 })]);
    expect(f.records.find((r) => r.data.metricKey === 'x-reading-minutes')).toBeUndefined();
    const empty = await buildExchange([], []);
    expect(empty.records).toHaveLength(0);
    expect(empty.manifest.counts.records).toBe(0);
  });
});
