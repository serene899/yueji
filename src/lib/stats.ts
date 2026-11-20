import type { Entry, Work } from './types';
import { monthOf, yearOf } from './time';

/** 一本书的当前进度：取所有记录里最大的页码。返回 0–1，无总页数时返回 null。 */
export function bookProgress(work: Work, entries: Entry[]): number | null {
  if (work.type !== 'book' || !work.totalPages) return null;
  let max = 0;
  for (const e of entries) if (e.workId === work.id && e.page) max = Math.max(max, e.page);
  if (work.status === 'done') return 1;
  return Math.min(1, max / work.totalPages);
}

export function currentPage(work: Work, entries: Entry[]): number {
  let max = 0;
  for (const e of entries) if (e.workId === work.id && e.page) max = Math.max(max, e.page);
  return max;
}

/** 电视剧当前看到第几集：取所有记录里最大的集数 */
export function currentEpisode(work: Work, entries: Entry[]): number {
  let max = 0;
  for (const e of entries) if (e.workId === work.id && e.episode) max = Math.max(max, e.episode);
  return max;
}

/** 电视剧进度：看到集数 / 总集数。返回 0–1，无总集数时返回 null。 */
export function tvProgress(work: Work, entries: Entry[]): number | null {
  if (work.type !== 'tv' || !work.totalEpisodes) return null;
  if (work.status === 'done') return 1;
  return Math.min(1, currentEpisode(work, entries) / work.totalEpisodes);
}

export function entriesOf(workId: string, entries: Entry[]): Entry[] {
  return entries
    .filter((e) => e.workId === workId)
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
}

export interface YearReview {
  year: number;
  booksFinished: Work[];
  moviesWatched: Work[];
  tvWatched: Work[];
  entriesCount: number;
  activeDays: number;
  totalMinutes: number;
  quotesCount: number;
  highlights: Work[];
  /** 12 个月每月的记录条数 */
  monthlyEntries: number[];
}

/**
 * 年度回顾口径：
 * - 读完的书：finishDate 落在该年的书；
 * - 看过的电影：该年有观影记录、或 finishDate 落在该年的电影（去重）；
 * - 其余按记录（Entry）的日期统计。
 */
export function yearReview(year: number, works: Work[], entries: Entry[]): YearReview {
  const byId = new Map(works.map((w) => [w.id, w]));
  const yearEntries = entries.filter((e) => yearOf(e.date) === year);

  const booksFinished = works.filter(
    (w) => w.type === 'book' && w.finishDate && yearOf(w.finishDate) === year,
  );
  const movieIds = new Set<string>();
  const tvIds = new Set<string>();
  for (const e of yearEntries) {
    const w = byId.get(e.workId);
    if (w?.type === 'movie') movieIds.add(w.id);
    if (w?.type === 'tv') tvIds.add(w.id);
  }
  for (const w of works) {
    if (w.type === 'movie' && w.finishDate && yearOf(w.finishDate) === year) movieIds.add(w.id);
    if (w.type === 'tv' && w.finishDate && yearOf(w.finishDate) === year) tvIds.add(w.id);
  }
  const moviesWatched = [...movieIds].map((id) => byId.get(id)!).filter(Boolean);
  const tvWatched = [...tvIds].map((id) => byId.get(id)!).filter(Boolean);

  const monthlyEntries = Array.from({ length: 12 }, () => 0);
  const days = new Set<string>();
  let totalMinutes = 0;
  let quotesCount = 0;
  for (const e of yearEntries) {
    monthlyEntries[monthOf(e.date) - 1] += 1;
    days.add(e.date);
    totalMinutes += e.minutes ?? 0;
    if (e.quote.trim()) quotesCount += 1;
  }

  // 印象深刻：标了星、且这一年与它发生过关系（有记录 / 开始 / 读完看完）的作品
  const activeIds = new Set(yearEntries.map((e) => e.workId));
  const highlights = works.filter(
    (w) =>
      w.highlight &&
      (activeIds.has(w.id) ||
        (w.startDate && yearOf(w.startDate) === year) ||
        (w.finishDate && yearOf(w.finishDate) === year)),
  );

  return {
    year,
    booksFinished,
    moviesWatched,
    tvWatched,
    entriesCount: yearEntries.length,
    activeDays: days.size,
    totalMinutes,
    quotesCount,
    highlights,
    monthlyEntries,
  };
}

/** 首页概览：累计数字 */
export function overview(works: Work[], entries: Entry[]) {
  return {
    books: works.filter((w) => w.type === 'book').length,
    tvs: works.filter((w) => w.type === 'tv').length,
    movies: works.filter((w) => w.type === 'movie').length,
    others: works.filter((w) => w.type === 'other').length,
    finished: works.filter((w) => w.status === 'done').length,
    entries: entries.length,
    quotes: entries.filter((e) => e.quote.trim()).length,
  };
}
