import { describe, expect, it } from 'vitest';
import { bookProgress, currentEpisode, currentPage, entryDurationText, entryMinutes, overview, recentWatching, tvProgress, yearReview } from '../../src/lib/stats';
import type { Entry, Work } from '../../src/lib/types';

const book: Work = {
  id: 'b1', type: 'book', title: '活着', creator: '余华', category: '文学', year: 1993,
  totalPages: 200, status: 'doing', startDate: '2026-11-01', highlight: true, createdAt: 1, updatedAt: 1,
};
const movie: Work = {
  id: 'm1', type: 'movie', title: '重庆森林', creator: '王家卫', category: '剧情', year: 1994,
  durationMin: 102, status: 'done', finishDate: '2026-10-03', highlight: false, createdAt: 1, updatedAt: 1,
};
const entries: Entry[] = [
  { id: 'e1', workId: 'b1', date: '2026-11-02', page: 50, minutes: 30, feeling: '开头很稳', quote: '', createdAt: 1, updatedAt: 1 },
  { id: 'e2', workId: 'b1', date: '2026-11-10', page: 120, minutes: 45, feeling: '', quote: '人是为了活着本身而活着', createdAt: 2, updatedAt: 2 },
  { id: 'e3', workId: 'm1', date: '2026-10-03', minutes: 102, feeling: '梦一样', quote: '我们最接近的时候距离只有0.01公分', createdAt: 3, updatedAt: 3 },
  { id: 'e4', workId: 'b1', date: '2025-12-31', page: 10, feeling: '去年试读', quote: '', createdAt: 0, updatedAt: 0 },
];

describe('bookProgress / currentPage', () => {
  it('进度取最大页码 / 总页数', () => {
    expect(currentPage(book, entries)).toBe(120);
    expect(bookProgress(book, entries)).toBeCloseTo(0.6);
  });
  it('v0.4.0：完成状态不再篡改进度——标了读完也按真实页码显示', () => {
    expect(bookProgress({ ...book, status: 'done' }, entries)).toBeCloseTo(0.6);
  });
  it('没有任何页码记录时进度为 null（不硬算）', () => {
    expect(bookProgress(book, [])).toBeNull();
    expect(bookProgress(book, [{ ...entries[0], page: undefined }])).toBeNull();
  });
  it('没有总页数时进度为 null（不硬算）', () => {
    expect(bookProgress({ ...book, totalPages: undefined }, entries)).toBeNull();
  });
  it('电影没有阅读进度', () => {
    expect(bookProgress(movie, entries)).toBeNull();
  });
});

describe('entryMinutes', () => {
  it('填了分钟用分钟；电影没填按片长兜底；书没填算 0', () => {
    expect(entryMinutes(movie, entries[2])).toBe(102);
    expect(entryMinutes(movie, { ...entries[2], minutes: undefined })).toBe(102);
    expect(entryMinutes(book, { ...entries[0], minutes: undefined })).toBe(0);
  });
  it('v0.4.3：秒数折算进时长（记录优先，片长兜底也含秒）', () => {
    expect(entryMinutes(book, { ...entries[0], minutes: 10, seconds: 30 })).toBeCloseTo(10.5);
    expect(entryMinutes(book, { ...entries[0], minutes: undefined, seconds: 45 })).toBeCloseTo(0.75);
    const m2: Work = { ...movie, durationMin: 143, durationSec: 16 };
    expect(entryMinutes(m2, { ...entries[2], minutes: undefined })).toBeCloseTo(143 + 16 / 60);
  });
});

describe('entryDurationText（v0.4.3）', () => {
  it('记了秒精确到秒；没记秒沿用小时/分钟口径；都没有则空', () => {
    expect(entryDurationText(movie, { ...entries[2], minutes: 143, seconds: 16 })).toBe('143 分 16 秒');
    expect(entryDurationText(book, { ...entries[0], minutes: undefined, seconds: 45 })).toBe('45 秒');
    expect(entryDurationText(book, entries[0])).toBe('30 分钟');
    expect(entryDurationText(movie, { ...entries[2], minutes: undefined })).toBe('1 小时 42 分');
    const m2: Work = { ...movie, durationMin: 143, durationSec: 16 };
    expect(entryDurationText(m2, { ...entries[2], minutes: undefined })).toBe('143 分 16 秒');
    expect(entryDurationText(book, { ...entries[0], minutes: undefined })).toBe('');
  });
});

describe('yearReview（v0.4.0 活动/完成双口径）', () => {
  it('2026：活动按记录日期，完成按完成日期且须为已完成状态', () => {
    const r = yearReview(2026, [book, movie], entries);
    expect(r.finishedBooks).toHaveLength(0); // 书还在读
    expect(r.finishedMovies.map((w) => w.id)).toEqual(['m1']);
    expect(r.reading.count).toBe(2);
    expect(r.reading.minutes).toBe(75);
    expect(r.watching.count).toBe(1);
    expect(r.watching.minutes).toBe(102);
    expect(r.other.count).toBe(0);
    expect(r.entriesCount).toBe(3);
    expect(r.activeDays).toBe(3);
    expect(r.totalMinutes).toBe(177);
    expect(r.quotesCount).toBe(2);
    expect(r.monthlyEntries[10]).toBe(2); // 11 月两条
    expect(r.monthlyEntries[9]).toBe(1); // 10 月一条
    expect(r.highlights.map((w) => w.id)).toEqual(['b1']);
  });
  it('读完日期落在该年、且状态为已完成的书才计入完成', () => {
    const done = { ...book, status: 'done' as const, finishDate: '2026-11-15' };
    const r = yearReview(2026, [done, movie], entries);
    expect(r.finishedBooks.map((w) => w.id)).toEqual(['b1']);
    expect(yearReview(2025, [done, movie], entries).finishedBooks).toHaveLength(0);
    // 有完成日期但状态被改回在读 → 不算完成（旧口径会误算）
    const backToDoing = { ...book, status: 'doing' as const, finishDate: '2026-11-15' };
    expect(yearReview(2026, [backToDoing], entries).finishedBooks).toHaveLength(0);
  });
  it('跨年追剧：活动算在记录年，完成只算在完成年', () => {
    const doneTv: Work = { ...tv, status: 'done', finishDate: '2026-11-21' };
    const r26 = yearReview(2026, [doneTv], tvEntries);
    expect(r26.watching.count).toBe(2);
    expect(r26.finishedTvs.map((w) => w.id)).toEqual(['t1']);
    const r25 = yearReview(2025, [doneTv], tvEntries);
    expect(r25.watching.count).toBe(0);
    expect(r25.finishedTvs).toHaveLength(0);
  });
  it('其他类型活动按细分类统计', () => {
    const album: Work = {
      id: 'o1', type: 'other', title: '某张专辑', creator: '某乐队', category: '音乐', subcategory: '音乐',
      status: 'doing', highlight: false, createdAt: 1, updatedAt: 1,
    };
    const oe: Entry[] = [
      { id: 'oe1', workId: 'o1', date: '2026-03-01', minutes: 45, feeling: '好听', quote: '', createdAt: 1, updatedAt: 1 },
    ];
    const r = yearReview(2026, [album], oe);
    expect(r.other.count).toBe(1);
    expect(r.other.bySubcategory).toEqual([{ name: '音乐', count: 1 }]);
  });
});

describe('overview', () => {
  it('区分作品数与活动记录数', () => {
    const o = overview([book, movie], entries);
    expect(o).toEqual({
      books: 1, tvs: 0, movies: 1, others: 0, totalWorks: 2, finished: 1,
      entries: 4, readingEntries: 3, watchingEntries: 1, quotes: 2,
    });
  });
});

const tv: Work = {
  id: 't1', type: 'tv', title: '漫长的季节', creator: '辛爽', category: '悬疑', year: 2023,
  totalEpisodes: 12, status: 'doing', startDate: '2026-11-20', highlight: false, createdAt: 1, updatedAt: 1,
};
const tvEntries: Entry[] = [
  { id: 'te1', workId: 't1', date: '2026-11-20', episode: 3, minutes: 60, feeling: '节奏慢但有味', quote: '', createdAt: 1, updatedAt: 1 },
  { id: 'te2', workId: 't1', date: '2026-11-21', episode: 7, minutes: 120, feeling: '', quote: '往前看，别回头', createdAt: 2, updatedAt: 2 },
];

describe('tvProgress / currentEpisode', () => {
  it('进度取最大集数 / 总集数', () => {
    expect(currentEpisode(tv, tvEntries)).toBe(7);
    expect(tvProgress(tv, tvEntries)).toBeCloseTo(7 / 12);
  });
  it('v0.4.0：看完状态也不篡改进度；无总集数不硬算', () => {
    expect(tvProgress({ ...tv, status: 'done' }, tvEntries)).toBeCloseTo(7 / 12);
    expect(tvProgress({ ...tv, totalEpisodes: undefined }, tvEntries)).toBeNull();
  });
});

describe('recentWatching（P0 修复）', () => {
  it('有追剧记录的剧进列表，取最新一条', () => {
    const r = recentWatching([tv], tvEntries);
    expect(r).toHaveLength(1);
    expect(r[0].work.id).toBe('t1');
    expect(r[0].date).toBe('2026-11-21');
    expect(r[0].entry?.id).toBe('te2');
  });
  it('没有记录、只标了看完的剧也进列表（按完成日期）', () => {
    const doneTv: Work = { ...tv, status: 'done', finishDate: '2026-11-21' };
    const r = recentWatching([doneTv], []);
    expect(r).toHaveLength(1);
    expect(r[0].date).toBe('2026-11-21');
    expect(r[0].entry).toBeUndefined();
  });
  it('书不进最近观看；多部作品按日期倒序', () => {
    const r = recentWatching([book, movie, tv], [...entries, ...tvEntries]);
    expect(r.map((x) => x.work.id)).toEqual(['t1', 'm1']);
  });
});
