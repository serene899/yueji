import { useMemo, useState } from 'react';
import { STATUS_LABEL, statusText, TYPE_ICON, type Entry, type Work, type WorkStatus, type WorkType } from '../lib/types';
import { bookProgress, currentEpisode, tvProgress } from '../lib/stats';
import { Card, Cover, Empty, ProgressBar } from '../components/ui';

type Filter = 'all' | WorkType;
type StatusFilter = 'all' | WorkStatus;
type ViewMode = 'list' | 'grid';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'book', label: '📖 书籍' },
  { value: 'tv', label: '📺 电视剧' },
  { value: 'movie', label: '🎬 电影' },
  { value: 'other', label: '✦ 其他' },
];

function statusChipCls(status: WorkStatus): string {
  switch (status) {
    case 'done':
      return 'bg-cinnabar-500/10 text-cinnabar-600';
    case 'doing':
      return 'bg-pine-500/10 text-pine-600';
    case 'paused':
      return 'bg-amber-500/15 text-amber-700';
    case 'dropped':
      return 'bg-ink/[0.05] text-ink/40';
    default:
      return 'bg-ink/[0.06] text-ink/55';
  }
}

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
  const [sub, setSub] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('yueji-shelf-view') === 'grid' ? 'grid' : 'list'));

  const subOptions = useMemo(() => {
    if (filter !== 'other') return [];
    const set = new Set<string>();
    for (const w of works) if (w.type === 'other') set.add(w.subcategory || w.category || '其他');
    return [...set];
  }, [works, filter]);

  const list = useMemo(() => {
    return works
      .filter((w) => filter === 'all' || w.type === filter)
      .filter((w) => status === 'all' || w.status === status)
      .filter((w) => filter !== 'other' || sub === 'all' || (w.subcategory || w.category || '其他') === sub)
      .filter((w) => !query.trim() || w.title.includes(query.trim()) || w.creator.includes(query.trim()))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [works, filter, status, sub, query]);

  function switchView(v: ViewMode) {
    setView(v);
    localStorage.setItem('yueji-shelf-view', v);
  }

  return (
    <div className="px-4">
      <div className="mb-3 mt-1 flex gap-1.5 overflow-x-auto pb-0.5" role="radiogroup" aria-label="作品筛选">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            role="radio"
            aria-checked={filter === f.value}
            onClick={() => {
              setFilter(f.value);
              setSub('all');
            }}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[14px] transition ${
              filter === f.value ? 'bg-cinnabar-600 font-semibold text-white' : 'bg-ink/[0.06] text-ink/65'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {filter === 'other' && subOptions.length > 1 && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-0.5" role="radiogroup" aria-label="细分类筛选">
          {['all', ...subOptions].map((s) => (
            <button
              key={s}
              role="radio"
              aria-checked={sub === s}
              onClick={() => setSub(s)}
              className={`shrink-0 rounded-full px-3 py-1 text-[13px] transition ${
                sub === s ? 'bg-ink/70 font-medium text-white' : 'bg-ink/[0.05] text-ink/60'
              }`}
            >
              {s === 'all' ? '全部细分' : s}
            </button>
          ))}
        </div>
      )}
      <div className="mb-3 flex gap-2">
        <input
          aria-label="搜索作品"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索作品或作者"
          className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-card px-3.5 py-2 text-[15px] outline-none"
        />
        <select
          aria-label="状态筛选"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="rounded-xl border border-ink/10 bg-card px-2 py-2 text-[14px]"
        >
          <option value="all">全部状态</option>
          {(Object.keys(STATUS_LABEL) as WorkStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <div className="flex shrink-0 rounded-xl bg-ink/[0.06] p-1" role="radiogroup" aria-label="展示方式">
          {(
            [
              ['list', '列表'],
              ['grid', '网格'],
            ] as [ViewMode, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              role="radio"
              aria-checked={view === v}
              onClick={() => switchView(v)}
              className={`rounded-[9px] px-2.5 py-1 text-[13px] transition ${view === v ? 'bg-card font-semibold shadow-sm' : 'text-ink/55'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <Card>
          <Empty text="这里还没有作品" hint="点右下角的 + 添加一本书、一部剧或一部电影" />
        </Card>
      ) : view === 'list' ? (
        <div className="space-y-2.5">
          {list.map((w) => {
            const p = w.type === 'book' ? bookProgress(w, entries) : w.type === 'tv' ? tvProgress(w, entries) : null;
            return (
              <button key={w.id} onClick={() => onOpenWork(w.id)} className="card pressable block w-full px-3.5 py-3 text-left">
                <div className="flex gap-3">
                  <Cover work={w} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 font-serif text-[16px] font-semibold leading-snug">
                        {TYPE_ICON[w.type]} 《{w.title}》
                        {w.highlight && <span className="ml-1.5 rounded bg-cinnabar-500/10 px-1.5 py-0.5 align-middle font-sans text-[11px] font-medium text-cinnabar-600">印象深刻</span>}
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] ${statusChipCls(w.status)}`}>
                        {statusText(w.type, w.status)}
                      </span>
                    </div>
                    <div className="mt-1 text-[13px] text-ink/50">
                      {[w.creator, w.type === 'other' ? w.subcategory || w.category : w.category, w.year].filter(Boolean).join(' · ')}
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
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {list.map((w) => {
            const p = w.type === 'book' ? bookProgress(w, entries) : w.type === 'tv' ? tvProgress(w, entries) : null;
            return (
              <button key={w.id} onClick={() => onOpenWork(w.id)} className="pressable text-left">
                <div className="relative">
                  <Cover work={w} variant="grid" />
                  <span
                    className={`absolute left-1.5 top-1.5 rounded-full bg-card/90 px-1.5 py-px text-[10.5px] font-semibold backdrop-blur-sm ${
                      w.status === 'done'
                        ? 'text-cinnabar-600'
                        : w.status === 'doing'
                          ? 'text-pine-600'
                          : w.status === 'paused'
                            ? 'text-amber-700'
                            : 'text-ink/55'
                    }`}
                  >
                    {statusText(w.type, w.status)}
                  </span>
                </div>
                <div className="mt-1.5 line-clamp-2 font-serif text-[13.5px] font-semibold leading-snug">《{w.title}》</div>
                <div className="mt-0.5 truncate text-[11.5px] text-ink/50">{w.creator}</div>
                {p !== null && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="flex-1">
                      <ProgressBar value={p} tone={w.type === 'tv' ? 'tv' : 'book'} />
                    </div>
                    <span className="text-[10.5px] text-ink/50">{Math.round(p * 100)}%</span>
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
