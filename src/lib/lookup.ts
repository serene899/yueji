// 联网找封面与资料补全（v0.5.0，所有者明确要求加入；v0.4.0 任务书「不擅自联网搜封面」的约束就此解除）。
//
// 痛点：手动封面要先上网找图、存相册、再回 App 上传，太绕。现在：
// - 书 → Open Library：封面 + 作者 + 首版年份（免密钥、CORS 开放）。
// - 电影/电视剧/动画等 → Bangumi：封面 + 年份（中文社区数据库，华语剧集/动画命中好）。
// - 导演/主演/年份补全 → Wikidata：知名影片有导演（P57）与主演（P161）结构化数据。
// 选中的海报会下载到本机、走与手动上传相同的压缩管线存成本地 Blob——之后断网照常显示，
// 不热链任何图床。所有请求都是「点了按钮才发」，不后台偷跑；失败只提示，不挡保存。
// TMDB 的海报与演职员最全，但需要所有者本人注册的密钥，本版先不接（留作后续升级位）。

import type { WorkType } from './types';

export interface CoverCandidate {
  source: 'bangumi' | 'openlibrary' | 'tmdb';
  sourceLabel: string;
  title: string;
  year?: number;
  /** 书的作者（Open Library 给出），选中时可顺带补进「作者」 */
  creatorLabel?: string;
  thumbUrl: string;
  fullUrl: string;
  /** TMDB 条目信息（v0.5.1）：选中后按 id 拉演职员，genre 是已映射的中文类型名 */
  tmdb?: { id: number; kind: 'movie' | 'tv'; genre?: string };
}

export interface WikiCredits {
  director?: string;
  cast: string[];
  year?: number;
}

const TIMEOUT_MS = 12_000;

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(t);
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function yearOf(dateStr: unknown): number | undefined {
  if (typeof dateStr !== 'string') return undefined;
  const y = Number(dateStr.slice(0, 4));
  return Number.isFinite(y) && y > 1800 && y < 2100 ? y : undefined;
}

/* ---------------- Open Library（书） ---------------- */

export function mapOlDocs(json: unknown): CoverCandidate[] {
  if (!isRecord(json) || !Array.isArray(json.docs)) return [];
  const out: CoverCandidate[] = [];
  for (const d of json.docs) {
    if (!isRecord(d) || typeof d.cover_i !== 'number' || typeof d.title !== 'string') continue;
    const authors = Array.isArray(d.author_name) ? d.author_name.filter((a): a is string => typeof a === 'string') : [];
    out.push({
      source: 'openlibrary',
      sourceLabel: 'Open Library',
      title: d.title,
      year: typeof d.first_publish_year === 'number' ? d.first_publish_year : undefined,
      creatorLabel: authors.length ? authors.join('、') : undefined,
      thumbUrl: `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`,
      fullUrl: `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`,
    });
  }
  return out;
}

/* ---------------- Bangumi（影视/音乐） ---------------- */

/** Bangumi 条目类型：1 书 2 动画 3 音乐 4 游戏 6 三次元（真人影视）。返回 null = 该类型不联网找。 */
export function bgmTypesFor(type: WorkType, subcategory?: string): number[] | null {
  if (type === 'movie' || type === 'tv') return [6, 2];
  if (type === 'other') {
    if (subcategory === '音乐') return [3];
    if (subcategory === '纪录片' || subcategory === '综艺') return [6];
    return null;
  }
  return null;
}

export function mapBgmSubjects(json: unknown): CoverCandidate[] {
  if (!isRecord(json) || !Array.isArray(json.data)) return [];
  const out: CoverCandidate[] = [];
  for (const s of json.data) {
    if (!isRecord(s) || s.nsfw === true || !isRecord(s.images)) continue;
    const large = typeof s.images.large === 'string' ? s.images.large : undefined;
    const medium = typeof s.images.medium === 'string' ? s.images.medium : undefined;
    const common = typeof s.images.common === 'string' ? s.images.common : undefined;
    const full = large ?? medium ?? common;
    if (!full) continue;
    const nameCn = typeof s.name_cn === 'string' && s.name_cn ? s.name_cn : undefined;
    const name = typeof s.name === 'string' ? s.name : '';
    out.push({
      source: 'bangumi',
      sourceLabel: 'Bangumi',
      title: nameCn ?? name,
      year: yearOf(s.date),
      thumbUrl: common ?? medium ?? full,
      fullUrl: full,
    });
  }
  return out;
}

/** 按类型联网搜封面候选。搜不到返回空数组；网络失败抛错（界面提示，不挡手动流程）。 */
export async function searchCovers(type: WorkType, subcategory: string | undefined, title: string, creator: string): Promise<CoverCandidate[]> {
  const q = title.trim();
  if (!q) return [];
  if (type === 'book') {
    const params = new URLSearchParams({ title: q, limit: '8', fields: 'title,author_name,first_publish_year,cover_i' });
    if (creator.trim()) params.set('author', creator.trim());
    const json = await fetchJson(`https://openlibrary.org/search.json?${params.toString()}`);
    let list = mapOlDocs(json);
    if (!list.length && creator.trim()) {
      // 带作者搜不到时放宽为只按书名再搜一次
      const retry = new URLSearchParams({ title: q, limit: '8', fields: 'title,author_name,first_publish_year,cover_i' });
      list = mapOlDocs(await fetchJson(`https://openlibrary.org/search.json?${retry.toString()}`));
    }
    return list;
  }
  const types = bgmTypesFor(type, subcategory);
  if (!types) return [];
  const json = await fetchJson('https://api.bgm.tv/v0/search/subjects?limit=10&offset=0', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword: q, sort: 'match', filter: { type: types } }),
  });
  return mapBgmSubjects(json);
}

/** 下载一张海报为 Blob（后续走 processCoverBlob 压缩存本地）。 */
export async function fetchImageBlob(url: string): Promise<Blob> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15_000);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) throw new Error('下回来的不是图片');
    return blob;
  } finally {
    clearTimeout(t);
  }
}

/* ---------------- Wikidata（导演 / 主演 / 年份） ---------------- */

interface WikiPick {
  entityId: string;
  directorIds: string[];
  castIds: string[];
  year?: number;
}

function claimIds(claims: Record<string, unknown>, prop: string): string[] {
  const arr = claims[prop];
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  for (const st of arr) {
    if (!isRecord(st) || !isRecord(st.mainsnak) || !isRecord(st.mainsnak.datavalue) || !isRecord(st.mainsnak.datavalue.value)) continue;
    const id = st.mainsnak.datavalue.value.id;
    if (typeof id === 'string') out.push(id);
  }
  return out;
}

function claimYear(claims: Record<string, unknown>): number | undefined {
  const arr = claims.P577;
  if (!Array.isArray(arr)) return undefined;
  let best: number | undefined;
  for (const st of arr) {
    if (!isRecord(st) || !isRecord(st.mainsnak) || !isRecord(st.mainsnak.datavalue) || !isRecord(st.mainsnak.datavalue.value)) continue;
    const time = st.mainsnak.datavalue.value.time;
    if (typeof time !== 'string') continue;
    const y = Number(time.slice(1, 5));
    if (Number.isFinite(y) && (best === undefined || y < best)) best = y;
  }
  return best;
}

/**
 * 从 wbgetentities(claims) 的返回里挑出「像影视作品」的那条：
 * 必须有导演或主演；给了期望年份时优先年份对得上（±1）的那条。
 */
export function pickWikiEntity(json: unknown, wantYear?: number): WikiPick | null {
  if (!isRecord(json) || !isRecord(json.entities)) return null;
  let fallback: WikiPick | null = null;
  for (const ent of Object.values(json.entities)) {
    if (!isRecord(ent) || typeof ent.id !== 'string' || !isRecord(ent.claims)) continue;
    const directorIds = claimIds(ent.claims, 'P57');
    const castIds = claimIds(ent.claims, 'P161');
    if (!directorIds.length && !castIds.length) continue;
    const pick: WikiPick = { entityId: ent.id, directorIds, castIds, year: claimYear(ent.claims) };
    if (wantYear !== undefined && pick.year !== undefined && Math.abs(pick.year - wantYear) <= 1) return pick;
    fallback ??= pick;
  }
  return fallback;
}

function pickLabel(labels: unknown): string | undefined {
  if (!isRecord(labels)) return undefined;
  for (const lang of ['zh-hans', 'zh-cn', 'zh', 'zh-tw', 'en']) {
    const l = labels[lang];
    if (isRecord(l) && typeof l.value === 'string' && l.value) return l.value;
  }
  return undefined;
}

/* ---------------- TMDB（v0.5.1，需所有者本人的免费密钥） ----------------
 * 海报与演职员覆盖最全的源。密钥由所有者在 themoviedb.org 免费注册后填进「我的」页，
 * 只存本机 localStorage——不进数据库、不进备份、不进交换文件。填了密钥后影视搜索优先走 TMDB，
 * 没填或搜不到时自动回落 Bangumi + Wikidata（v0.5.0 的组合）。 */

const TMDB_KEY_STORAGE = 'yueji.tmdb.key';

export function getTmdbKey(): string {
  try {
    return localStorage.getItem(TMDB_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function setTmdbKey(key: string): void {
  try {
    if (key.trim()) localStorage.setItem(TMDB_KEY_STORAGE, key.trim());
    else localStorage.removeItem(TMDB_KEY_STORAGE);
  } catch {
    /* 隐私模式等场景存不下就算了，不报错 */
  }
}

const TMDB_GENRES: Record<number, string> = {
  28: '动作', 12: '冒险', 16: '动画', 35: '喜剧', 80: '犯罪', 99: '纪录片', 18: '剧情',
  10751: '家庭', 14: '奇幻', 36: '历史', 27: '恐怖', 10402: '音乐', 9648: '悬疑',
  10749: '爱情', 878: '科幻', 10770: '电视电影', 53: '惊悚', 10752: '战争', 37: '西部',
  10759: '动作冒险', 10762: '儿童', 10764: '真人秀', 10765: '科幻奇幻', 10768: '战争政治',
};

export function mapTmdbResults(json: unknown, kind: 'movie' | 'tv'): CoverCandidate[] {
  if (!isRecord(json) || !Array.isArray(json.results)) return [];
  const out: CoverCandidate[] = [];
  for (const r of json.results) {
    if (!isRecord(r) || typeof r.id !== 'number' || typeof r.poster_path !== 'string' || !r.poster_path) continue;
    const title = (typeof r.title === 'string' && r.title) || (typeof r.name === 'string' && r.name) || '';
    if (!title) continue;
    const genreIds = Array.isArray(r.genre_ids) ? r.genre_ids : [];
    const genre = genreIds.map((g) => (typeof g === 'number' ? TMDB_GENRES[g] : undefined)).find(Boolean);
    out.push({
      source: 'tmdb',
      sourceLabel: 'TMDB',
      title,
      year: yearOf(r.release_date) ?? yearOf(r.first_air_date),
      thumbUrl: `https://image.tmdb.org/t/p/w185${r.poster_path}`,
      fullUrl: `https://image.tmdb.org/t/p/w500${r.poster_path}`,
      tmdb: { id: r.id, kind, genre },
    });
  }
  return out;
}

export async function searchTmdbCovers(kind: 'movie' | 'tv', title: string, key: string): Promise<CoverCandidate[]> {
  const params = new URLSearchParams({
    api_key: key,
    query: title.trim(),
    language: 'zh-CN',
    include_adult: 'false',
  });
  const json = await fetchJson(`https://api.themoviedb.org/3/search/${kind}?${params.toString()}`);
  return mapTmdbResults(json, kind);
}

export function mapTmdbCredits(json: unknown): WikiCredits | null {
  if (!isRecord(json)) return null;
  const castArr = Array.isArray(json.cast) ? json.cast : [];
  const crewArr = Array.isArray(json.crew) ? json.crew : [];
  const name = (v: unknown): string => (isRecord(v) && typeof v.name === 'string' ? v.name : '');
  const directors = crewArr
    .filter((c) => isRecord(c) && c.job === 'Director')
    .map(name)
    .filter(Boolean)
    .slice(0, 2);
  const cast = [...castArr]
    .sort((a, b) => {
      const oa = isRecord(a) && typeof a.order === 'number' ? a.order : 99;
      const ob = isRecord(b) && typeof b.order === 'number' ? b.order : 99;
      return oa - ob;
    })
    .map(name)
    .filter(Boolean)
    .slice(0, 6);
  if (!directors.length && !cast.length) return null;
  return { director: directors.length ? directors.join('、') : undefined, cast };
}

export async function fetchTmdbCredits(kind: 'movie' | 'tv', id: number, key: string): Promise<WikiCredits | null> {
  try {
    const params = new URLSearchParams({ api_key: key, language: 'zh-CN' });
    const json = await fetchJson(`https://api.themoviedb.org/3/${kind}/${id}/credits?${params.toString()}`);
    return mapTmdbCredits(json);
  } catch {
    return null;
  }
}

/** 按片名（+年份）查 Wikidata 的导演与主演。查不到返回 null，全程尽力而为、失败不抛错。 */
export async function fetchWikiCredits(title: string, year?: number): Promise<WikiCredits | null> {
  try {
    const search = await fetchJson(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(title)}&language=zh&uselang=zh&limit=5&format=json&origin=*`,
    );
    if (!isRecord(search) || !Array.isArray(search.search)) return null;
    const ids = search.search
      .map((r) => (isRecord(r) && typeof r.id === 'string' ? r.id : ''))
      .filter(Boolean)
      .slice(0, 5);
    if (!ids.length) return null;
    const withClaims = await fetchJson(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join('|')}&props=claims&format=json&origin=*`,
    );
    const pick = pickWikiEntity(withClaims, year);
    if (!pick) return null;
    const peopleIds = [...pick.directorIds.slice(0, 2), ...pick.castIds.slice(0, 6)];
    const labelsJson = await fetchJson(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${peopleIds.join('|')}&props=labels&languages=zh-hans|zh-cn|zh|en&format=json&origin=*`,
    );
    const nameOf = (id: string): string | undefined => {
      if (!isRecord(labelsJson) || !isRecord(labelsJson.entities)) return undefined;
      const ent = labelsJson.entities[id];
      return isRecord(ent) ? pickLabel(ent.labels) : undefined;
    };
    const directors = pick.directorIds.slice(0, 2).map(nameOf).filter((n): n is string => !!n);
    const cast = pick.castIds.slice(0, 6).map(nameOf).filter((n): n is string => !!n);
    if (!directors.length && !cast.length) return null;
    return { director: directors.length ? directors.join('、') : undefined, cast, year: pick.year };
  } catch {
    return null;
  }
}
