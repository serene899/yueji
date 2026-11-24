// 阅迹数据模型（v0.1.0；v0.2.0 增加电视剧/其他类型与封面）
// 作品 Work：书、电视剧、电影或其他文化作品本身；记录 Entry：某一次阅读/观影留下的进度、时长、感受与摘抄。
// 同一作品可以有多次记录——不同时间读同一本书，感受会变，这正是阅迹要保存的东西。

export type WorkType = 'book' | 'tv' | 'movie' | 'other';

/** planned 想读/想看 · doing 进行中 · done 读完/看完 · paused 暂停 · dropped 弃读/弃剧/搁置（v0.4.0 补齐） */
export type WorkStatus = 'planned' | 'doing' | 'done' | 'paused' | 'dropped';

export const ALL_STATUSES: WorkStatus[] = ['planned', 'doing', 'done', 'paused', 'dropped'];

export interface Work {
  id: string;
  type: WorkType;
  title: string;
  /** 书：作者；电影：导演 */
  creator: string;
  /** 主演（v0.5.0，可选）：电影/电视剧的主要演员，「、」分隔；可手填，也可联网补全（Wikidata） */
  cast?: string;
  /** 书：分类（如 文学/历史/科幻）；电影：类型（如 剧情/纪录片） */
  category: string;
  /** 出版/上映年份，可空 */
  year?: number;
  /** 书：总页数 */
  totalPages?: number;
  /** 电影：片长（分钟） */
  durationMin?: number;
  /** 片长秒数（v0.4.3，可选）：电影片长常是「143 分 16 秒」，只存分钟会丢掉秒 */
  durationSec?: number;
  /** 电视剧：总集数 */
  totalEpisodes?: number;
  /** 「其他」类型的细分类（v0.4.0）：音乐/播客/纪录片/综艺/游戏/演出/展览/其他，可空 */
  subcategory?: string;
  /** 状态手动锁定（v0.4.0）：用户在编辑作品时手动改过状态即锁定，记记录只更新进度、不再自动改状态 */
  statusLocked?: boolean;
  /** 封面图（v0.2.0）：压缩后的 JPEG Blob，只存本机；备份时转 base64 随文件走 */
  cover?: Blob;
  status: WorkStatus;
  /** 开始阅读/（预留）日期 YYYY-MM-DD */
  startDate?: string;
  /** 读完/看完日期 YYYY-MM-DD */
  finishDate?: string;
  /** 印象深刻：年度回顾里会单独列出 */
  highlight: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Entry {
  id: string;
  workId: string;
  /** 记录日期 YYYY-MM-DD */
  date: string;
  /** 书：这次读到第几页 */
  page?: number;
  /** 电视剧：这次看到第几集 */
  episode?: number;
  /** 这次阅读/观影时长（分钟），可空 */
  minutes?: number;
  /** 时长秒数（v0.4.3，可选，0–59）：与 minutes 共同表示一次时长，如 143 分 16 秒 */
  seconds?: number;
  /** 当时的想法和感受 */
  feeling: string;
  /** 收藏的句子：书里的句子 / 电影的台词或片段描述 */
  quote: string;
  createdAt: number;
  updatedAt: number;
}

export const STATUS_LABEL: Record<WorkStatus, string> = {
  planned: '计划中',
  doing: '进行中',
  done: '已完成',
  paused: '暂停',
  dropped: '已搁置',
};

/** 「其他」类型的细分类（v0.4.0） */
export const SUBCATEGORIES = ['音乐', '播客', '纪录片', '综艺', '游戏', '演出', '展览', '其他'];

export const BOOK_CATEGORIES = ['文学', '小说', '历史', '哲学', '科学', '社会', '心理', '传记', '诗歌', '其他'];
export const MOVIE_CATEGORIES = ['剧情', '喜剧', '科幻', '纪录片', '动画', '悬疑', '爱情', '动作', '其他'];
export const TV_CATEGORIES = ['剧情', '都市', '古装', '悬疑', '喜剧', '科幻', '历史', '纪录片', '其他'];
export const OTHER_CATEGORIES = ['音乐', '播客', '演出', '展览', '游戏', '其他'];

export const TYPE_ICON: Record<WorkType, string> = { book: '📖', tv: '📺', movie: '🎬', other: '✦' };

/** 按作品类型给出状态文案：书 想读/在读/读完/暂停/弃读；剧 想看/在看/看完/暂停/弃剧；电影 想看/观看中/看完；其他用中性说法 */
export function statusText(type: WorkType, status: WorkStatus): string {
  if (status === 'paused') return '暂停';
  if (status === 'dropped') return type === 'book' ? '弃读' : type === 'tv' ? '弃剧' : '搁置';
  if (type === 'book') return status === 'done' ? '读完' : status === 'doing' ? '在读' : '想读';
  if (type === 'other') return status === 'done' ? '已完成' : status === 'doing' ? '进行中' : '计划中';
  if (type === 'movie') return status === 'done' ? '看完' : status === 'doing' ? '观看中' : '想看';
  return status === 'done' ? '看完' : status === 'doing' ? '在看' : '想看';
}

/** 各类型可选的状态：电影只有想看/观看中/看完三档，其余五档齐全 */
export function statusOptionsFor(type: WorkType): WorkStatus[] {
  if (type === 'movie') return ['planned', 'doing', 'done'];
  return ALL_STATUSES;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
