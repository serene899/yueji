import { useMemo, useState } from 'react';
import { statusText, TYPE_ICON, type Entry, type Work, type WorkStatus, type WorkType } from '../lib/types';
import { bookProgress, currentEpisode, tvProgress } from '../lib/stats';
import { Card, Cover, Empty, ProgressBar } from '../components/ui';

type Filter = 'all' | WorkType;
type StatusFilter = 'all' | WorkStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'book', label: '📖 书籍' },
  { value: 'tv', label: '📺 电视剧' },
  { value: 'movie', label: '🎬 电影' },
  { value: 'other', label: '✦ 其他' },
];

export function Shelf({
  works,
  entries,
  onOpenWork,
  onAddWork,
}: {
  works: Work[];
  entries: Entry[];
  onOpenWork: (id: string) => void;
  onAddWork: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    return works
      .filter((w) => filter === 'all' || w.type === filter)
      .filter((w) => status === 'all' || w.status === status)
      .filter((w) => !query.trim() || w.title.includes(query.trim()) || w.creator.includes(query.trim()))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [works, filter, status, query]);

  return (
    <div className="px-4">
      <div className="mb-3 mt-1 flex gap-1.5 overflow-x-auto pb-0.5" role="radiogroup" aria-label="作品筛选">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            role="radio"
            aria-checked={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[14px] ${
              filter === f.value ? 'bg-cinnabar-600 font-semibold text-white' : 'bg-ink/[0.06] text-ink/65'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="mb-3 flex gap-2">
        <input
          aria-label="搜索作品"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索书名、剧名、片名或作者"
          className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-card px-3.5 py-2 text-[15px] outline-none"
        />
        <select
          aria-label="状态筛选"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="rounded-xl border border-ink/10 bg-card px-2 py-2 text-[14px]"
        >
          <option value="all">全部状态</option>
          <option value="planned">计划中</option>
          <option value="doing">进行中</option>
          <option value="done">已完成</option>
        </select>
      </div>

      {list.length === 0 ? (
        <Card>
          <Empty text="这里还没有作品" hint="点右下角的 + 添加一本书、一部剧或一部电影" />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {list.map((w) => {
            const p = w.type === 'book' ? bookProgress(w, entries) : w.type === 'tv' ? tvProgress(w, entries) : null;
            return (
              <button key={w.id} onClick={() => onOpenWork(w.id)} className="card block w-full px-3.5 py-3 text-left">
                <div className="flex gap-3">
                  <Cover work={w} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 font-serif text-[16px] font-semibold leading-snug">
                        {TYPE_ICON[w.type]} 《{w.title}》
                        {w.highlight && <span className="ml-1.5 rounded bg-cinnabar-500/10 px-1.5 py-0.5 align-middle font-sans text-[11px] font-medium text-cinnabar-600">印象深刻</span>}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] ${
                          w.status === 'done'
                            ? 'bg-cinnabar-500/10 text-cinnabar-600'
                            : w.status === 'doing'
                              ? 'bg-pine-500/10 text-pine-600'
                              : 'bg-ink/[0.06] text-ink/55'
                        }`}
                      >
                        {statusText(w.type, w.status)}
                      </span>
                    </div>
                    <div className="mt-1 text-[13px] text-ink/50">
                      {[w.creator, w.category, w.year].filter(Boolean).join(' · ')}
                      {w.type === 'tv' && w.totalEpisodes ? ` · 共 ${w.totalEpisodes} 集` : ''}
                    </div>
                    {p !== null && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1">
                          <ProgressBar value={p} tone={w.type === 'tv' ? 'tv' : 'book'} />
                        </div>
                        <span className="text-[12px] text-ink/50">
                          {w.type === 'tv' ? `看到 ${currentEpisode(w, entries)} 集 · ` : ''}
                          {Math.round(p * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={onAddWork}
        aria-label="添加作品"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+96px)] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-cinnabar-600 text-[26px] font-light text-white shadow-lg shadow-cinnabar-600/30 active:bg-cinnabar-700"
      >
        +
      </button>
    </div>
  );
}
