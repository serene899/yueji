import { useMemo, useState } from 'react';
import type { Entry, Work, WorkStatus } from '../lib/types';
import { bookProgress } from '../lib/stats';
import { Card, Empty, ProgressBar, Segmented } from '../components/ui';

type Filter = 'all' | 'book' | 'movie';
type StatusFilter = 'all' | WorkStatus;

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
      <div className="mb-3 mt-1">
        <Segmented
          ariaLabel="作品筛选"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: '全部' },
            { value: 'book', label: '📖 书籍' },
            { value: 'movie', label: '🎬 电影' },
          ]}
        />
      </div>
      <div className="mb-3 flex gap-2">
        <input
          aria-label="搜索作品"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索书名、片名或作者"
          className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-card px-3.5 py-2 text-[15px] outline-none"
        />
        <select
          aria-label="状态筛选"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="rounded-xl border border-ink/10 bg-card px-2 py-2 text-[14px]"
        >
          <option value="all">全部状态</option>
          <option value="planned">想读想看</option>
          <option value="doing">进行中</option>
          <option value="done">已完成</option>
        </select>
      </div>

      {list.length === 0 ? (
        <Card>
          <Empty text="这里还没有作品" hint="点右下角的 + 添加一本书或一部电影" />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {list.map((w) => {
            const p = w.type === 'book' ? bookProgress(w, entries) : null;
            return (
              <button key={w.id} onClick={() => onOpenWork(w.id)} className="card block w-full px-4 py-3.5 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-serif text-[16px] font-semibold leading-snug">
                      {w.type === 'book' ? '📖' : '🎬'} 《{w.title}》
                      {w.highlight && <span className="ml-1.5 rounded bg-cinnabar-500/10 px-1.5 py-0.5 align-middle text-[11px] font-sans font-medium text-cinnabar-600">印象深刻</span>}
                    </div>
                    <div className="mt-1 text-[13px] text-ink/50">
                      {[w.creator, w.category, w.year].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] ${
                      w.status === 'done'
                        ? 'bg-cinnabar-500/10 text-cinnabar-600'
                        : w.status === 'doing'
                          ? 'bg-indigo2-500/10 text-indigo2-600'
                          : 'bg-ink/[0.06] text-ink/55'
                    }`}
                  >
                    {w.status === 'done' ? (w.type === 'book' ? '读完' : '看完') : w.status === 'doing' ? (w.type === 'book' ? '在读' : '在看') : w.type === 'book' ? '想读' : '想看'}
                  </span>
                </div>
                {p !== null && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex-1">
                      <ProgressBar value={p} />
                    </div>
                    <span className="text-[12px] text-ink/50">{Math.round(p * 100)}%</span>
                  </div>
                )}
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
