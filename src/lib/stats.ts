import type { Entry, Work } from './types';
import { monthOf, yearOf } from './time';

/**
 * 进度口径（v0.4.0）：永远按真实记录计算——书看最大页码、剧看最大集数。
 * 完成状态不再篡改进度：标了读完但记录只到 80%，就显示 80%。
 * 返回 0–1；没有总页数/总集数或没有任何进度数据时返回 null。
 */
export function bookProgress(work: Work, entries: Entry[]): number | null {
  if (work.type !== 'book' || !work.totalPages) return null;
  const max = currentPage(work, entries);
  if (max <= 0) return null;
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

/** 电视剧进度：看到集数 / 总集数。返回 0–1，无总集数或无进度数据时返回 null。 */
export function tvProgress(work: Work, entries: Entry[]): number | null {
  if (work.type !== 'tv' || !work.totalEpisodes) return null;
  const ep = currentEpisode(work, entries);
  if (ep <= 0) return null;
  return Math.min(1, ep / work.totalEpisodes);
}

export function entriesOf(workId: string, entries: Entry[]): Entry[] {
  return entries
    .filter((e) => e.workId === workId)
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
}

/**
 * 一条记录的有效时长：填了分钟用分钟；电影没填时按片长兜底
 * （看完一部电影就是花了片长那么久，避免电影时长被系统性低估）。
 */
export function entryMinutes(work: Work | undefined, e: Entry): number {
  if (e.minutes) return e.minutes;
  if (work?.type === 'movie' && work.durationMin) return work.durationMin;
  return 0;
}

export interface YearActivity {
  count: number;
  minutes: number;
}

export interface YearReview {
  year: number;
  /** 按记录日期统计的活动量 */
  reading: YearActivity;
  watching: YearActivity;
  other: YearActivity & { bySubcategory: { name: string; count: number }[] };
  /** 按完成日期统计，且当前状态确实是已完成（同一作品只会有一个完成日期，不重复计） */
  finishedBooks: Work[];
  finishedMovies: Work[];
  finishedTvs: Work[];
  entriesCount: number;
  activeDays: number;
  totalMinutes: number;
  quotesCount: number;
  highlights: Work[];
  /** 12 个月每月的记录条数 */
  monthlyEntries: number[];
}

/**
 * 年度回顾口径（v0.4.0 统一）：分两个维度，不再混算——
 * - 文化活动：按记录（Entry）的实际日期统计，跨年作品可以在多年各算活动；
 * - 完成作品：按完成日期统计，且状态须为已完成，一部作品一生只计一次完成。
 */
export function yearReview(year: number, works: Work[], entries: Entry[]): YearReview {
  const byId = new Map(works.map((w) => [w.id, w]));
  const yearEntries = entries.filter((e) => yearOf(e.date) === year);

  const reading: YearActivity = { count: 0, minutes: 0 };
  const watching: YearActivity = { count: 0, minutes: 0 };
  const subMap = new Map<string, number>();
  const other: YearReview['other'] = { count: 0, minutes: 0, bySubcategory: [] };

  const monthlyEntries = Array.from({ length: 12 }, () => 0);
  const days = new Set<string>();
  let totalMinutes = 0;
  let quotesCount = 0;

  for (const e of yearEntries) {
    const w = byId.get(e.workId);
    const mins = entryMinutes(w, e);
    monthlyEntries[monthOf(e.date) - 1] += 1;
    days.add(e.date);
    totalMinutes += mins;
    if (e.quote.trim()) quotesCount += 1;
    if (!w) continue;
    if (w.type === 'book') {
      reading.count += 1;
      reading.minutes += mins;
    } else if (w.type === 'movie' || w.type === 'tv') {
      watching.count += 1;
      watching.minutes += mins;
    } else {
      other.count += 1;
      other.minutes += mins;
      const sub = w.subcategory || w.category || '其他';
      subMap.set(sub, (subMap.get(sub) ?? 0) + 1);
    }
  }
  other.bySubcategory = [...subMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const finishedInYear = (t: Work['type']) =>
    works.filter((w) => w.type === t && w.status === 'done' && w.finishDate && yearOf(w.finishDate) === year);

  // 印象深刻：标了星、且这一年与它发生过关系（有记录 / 开始 / 完成）的作品
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
    reading,
    watching,
    other,
    finishedBooks: finishedInYear('book'),
    finishedMovies: finishedInYear('movie'),
    finishedTvs: finishedInYear('tv'),
    entriesCount: yearEntries.length,
    activeDays: days.size,
    totalMinutes,
    quotesCount,
    highlights,
    monthlyEntries,
  };
}

/** 首页概览：区分「作品数」与「活动记录数」两类口径 */
export function overview(works: Work[], entries: Entry[]) {
  const byId = new Map(works.map((w) => [w.id, w]));
  let readingEntries = 0;
  let watchingEntries = 0;
  for (const e of entries) {
    const t = byId.get(e.workId)?.type;
    if (t === 'book') readingEntries += 1;
    else if (t === 'movie' || t === 'tv') watchingEntries += 1;
  }
  return {
    books: works.filter((w) => w.type === 'book').length,
    tvs: works.filter((w) => w.type === 'tv').length,
    movies: works.filter((w) => w.type === 'movie').length,
    others: works.filter((w) => w.type === 'other').length,
    totalWorks: works.length,
    finished: works.filter((w) => w.status === 'done').length,
    entries: entries.length,
    readingEntries,
    watchingEntries,
    quotes: entries.filter((e) => e.quote.trim()).length,
  };
}

export interface RecentWatch {
  work: Work;
  date: string;
  entry?: Entry;
}

/**
 * 首页「最近观看」（v0.4.0 修复）：电影与电视剧的最近观看动态。
 * 来源有二：①有观影/追剧记录的，按最新一条记录；②没有记录、但直接标了看完的
 * （例如刚看完一部剧只补了作品没补记录），按完成日期进列表——旧版只认记录，
 * 这类作品在首页永远不出现，就是用户反馈的那个问题。
 */
export function recentWatching(works: Work[], entries: Entry[], limit = 5): RecentWatch[] {
  const byId = new Map(works.map((w) => [w.id, w]));
  const latestEntry = new Map<string, Entry>();
  for (const e of entries) {
    const w = byId.get(e.workId);
    if (!w || (w.type !== 'movie' && w.type !== 'tv')) continue;
    const cur = latestEntry.get(w.id);
    if (!cur || e.date > cur.date || (e.date === cur.date && e.createdAt > cur.createdAt)) {
      latestEntry.set(w.id, e);
    }
  }
  const out: RecentWatch[] = [];
  for (const w of works) {
    if (w.type !== 'movie' && w.type !== 'tv') continue;
    const e = latestEntry.get(w.id);
    if (e) out.push({ work: w, date: e.date, entry: e });
    else if (w.finishDate) out.push({ work: w, date: w.finishDate });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);
}
