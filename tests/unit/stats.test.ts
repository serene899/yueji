import { describe, expect, it } from 'vitest';
import { bookProgress, currentEpisode, currentPage, overview, tvProgress, yearReview } from '../../src/lib/stats';
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
  it('读完的书进度恒为 1', () => {
    expect(bookProgress({ ...book, status: 'done' }, entries)).toBe(1);
  });
  it('没有总页数时进度为 null（不硬算）', () => {
    expect(bookProgress({ ...book, totalPages: undefined }, entries)).toBeNull();
  });
  it('电影没有阅读进度', () => {
    expect(bookProgress(movie, entries)).toBeNull();
  });
});

describe('yearReview', () => {
  it('2026：电影靠记录计入，书未读完不计读完数', () => {
    const r = yearReview(2026, [book, movie], entries);
    expect(r.booksFinished).toHaveLength(0);
    expect(r.moviesWatched.map((w) => w.id)).toEqual(['m1']);
    expect(r.entriesCount).toBe(3);
    expect(r.activeDays).toBe(3);
    expect(r.totalMinutes).toBe(177);
    expect(r.quotesCount).toBe(2);
    expect(r.monthlyEntries[10]).toBe(2); // 11 月两条
    expect(r.monthlyEntries[9]).toBe(1); // 10 月一条
    // 在读但标了印象深刻、且今年有记录 → 也进印象深刻
    expect(r.highlights.map((w) => w.id)).toEqual(['b1']);
  });
  it('读完日期落在该年的书才计入', () => {
    const done = { ...book, status: 'done' as const, finishDate: '2026-11-15' };
    const r = yearReview(2026, [done, movie], entries);
    expect(r.booksFinished.map((w) => w.id)).toEqual(['b1']);
    expect(r.highlights.map((w) => w.id)).toEqual(['b1']);
    expect(yearReview(2025, [done, movie], entries).booksFinished).toHaveLength(0);
  });
});

describe('overview', () => {
  it('累计计数', () => {
    const o = overview([book, movie], entries);
    expect(o).toEqual({ books: 1, tvs: 0, movies: 1, others: 0, finished: 1, entries: 4, quotes: 2 });
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
  it('看完的剧进度恒为 1；无总集数不硬算', () => {
    expect(tvProgress({ ...tv, status: 'done' }, tvEntries)).toBe(1);
    expect(tvProgress({ ...tv, totalEpisodes: undefined }, tvEntries)).toBeNull();
  });
  it('年度回顾：有记录的剧计入追过的剧', () => {
    const r = yearReview(2026, [tv], tvEntries);
    expect(r.tvWatched.map((w) => w.id)).toEqual(['t1']);
    expect(yearReview(2025, [tv], tvEntries).tvWatched).toHaveLength(0);
  });
});
