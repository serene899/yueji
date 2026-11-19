// 阅迹数据模型（v0.1.0）
// 作品 Work：书或电影本身；记录 Entry：某一次阅读/观影留下的进度、时长、感受与摘抄。
// 同一作品可以有多次记录——不同时间读同一本书，感受会变，这正是阅迹要保存的东西。

export type WorkType = 'book' | 'movie';

/** planned 想读/想看 · doing 在读 · done 读完/看完 */
export type WorkStatus = 'planned' | 'doing' | 'done';

export interface Work {
  id: string;
  type: WorkType;
  title: string;
  /** 书：作者；电影：导演 */
  creator: string;
  /** 书：分类（如 文学/历史/科幻）；电影：类型（如 剧情/纪录片） */
  category: string;
  /** 出版/上映年份，可空 */
  year?: number;
  /** 书：总页数 */
  totalPages?: number;
  /** 电影：片长（分钟） */
  durationMin?: number;
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
  /** 这次阅读/观影时长（分钟），可空 */
  minutes?: number;
  /** 当时的想法和感受 */
  feeling: string;
  /** 收藏的句子：书里的句子 / 电影的台词或片段描述 */
  quote: string;
  createdAt: number;
  updatedAt: number;
}

export const STATUS_LABEL: Record<WorkStatus, string> = {
  planned: '想读想看',
  doing: '进行中',
  done: '已完成',
};

export const BOOK_CATEGORIES = ['文学', '小说', '历史', '哲学', '科学', '社会', '心理', '传记', '诗歌', '其他'];
export const MOVIE_CATEGORIES = ['剧情', '喜剧', '科幻', '纪录片', '动画', '悬疑', '爱情', '动作', '其他'];

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
