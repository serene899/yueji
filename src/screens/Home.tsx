import { TYPE_ICON, type Entry, type Work } from '../lib/types';
import { bookProgress, currentEpisode, currentPage, overview, tvProgress } from '../lib/stats';
import { fmtDate, fmtMinutes } from '../lib/time';
import { Card, Cover, Empty, ProgressBar, SectionTitle } from '../components/ui';

export function Home({
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
  const ov = overview(works, entries);
  const reading = works.filter((w) => w.type === 'book' && w.status === 'doing');
  const watching = works.filter((w) => w.type === 'tv' && w.status === 'doing');
  const recentViewing = entries
    .filter((e) => {
      const t = works.find((w) => w.id === e.workId)?.type;
      return t === 'movie' || t === 'tv';
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3);
  const recent = [...entries].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1)).slice(0, 5);
  const byId = new Map(works.map((w) => [w.id, w]));

  if (works.length === 0) {
    return (
      <div className="px-5 pt-10">
        <h1 className="font-serif text-[26px] font-bold">阅迹</h1>
        <p className="mt-2 leading-relaxed text-ink/60">
          读过什么、看过什么，以及它们带给你的感受，
          <br />
          都记在这里，慢慢攒成你自己的精神档案。
        </p>
        <button onClick={onAddWork} className="mt-6 w-full rounded-2xl bg-cinnabar-600 py-3.5 text-[16px] font-semibold text-white">
          添加第一部作品
        </button>
      </div>
    );
  }

  return (
    <div className="px-4">
      <SectionTitle>概览</SectionTitle>
      <Card className="grid grid-cols-5 px-1 py-4 text-center">
        {[
          [ov.books, '本书'],
          [ov.tvs, '部剧'],
          [ov.movies, '部电影'],
          [ov.entries, '条记录'],
          [ov.quotes, '句收藏'],
        ].map(([n, label]) => (
          <div key={label}>
            <div className="font-serif text-[20px] font-bold">{n}</div>
            <div className="mt-0.5 text-[11.5px] text-ink/50">{label}</div>
          </div>
        ))}
      </Card>

      <SectionTitle>正在阅读</SectionTitle>
      {reading.length === 0 ? (
        <Card>
          <Empty text="还没有在读的书" hint="在书架里把一本书标为「在读」，它会出现在这里" />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {reading.map((w) => {
            const p = bookProgress(w, entries);
            const page = currentPage(w, entries);
            return (
              <button key={w.id} onClick={() => onOpenWork(w.id)} className="card block w-full px-3.5 py-3 text-left">
                <div className="flex gap-3">
                  <Cover work={w} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-serif text-[16px] font-semibold">《{w.title}》</span>
                      {p !== null && <span className="text-[13px] font-medium text-cinnabar-600">{Math.round(p * 100)}%</span>}
                    </div>
                    <div className="mt-0.5 text-[13px] text-ink/50">
                      {w.creator}
                      {page > 0 && ` · 读到 ${page} 页`}
                      {w.totalPages ? ` / ${w.totalPages} 页` : ''}
                    </div>
                    {p !== null && (
                      <div className="mt-2.5">
                        <ProgressBar value={p} />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {watching.length > 0 && (
        <>
          <SectionTitle>正在追剧</SectionTitle>
          <div className="space-y-2.5">
            {watching.map((w) => {
              const p = tvProgress(w, entries);
              const ep = currentEpisode(w, entries);
              return (
                <button key={w.id} onClick={() => onOpenWork(w.id)} className="card block w-full px-3.5 py-3 text-left">
                  <div className="flex gap-3">
                    <Cover work={w} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-serif text-[16px] font-semibold">《{w.title}》</span>
                        {p !== null && <span className="text-[13px] font-medium text-pine-600">{Math.round(p * 100)}%</span>}
                      </div>
                      <div className="mt-0.5 text-[13px] text-ink/50">
                        {w.creator}
                        {ep > 0 && ` · 看到第 ${ep} 集`}
                        {w.totalEpisodes ? ` / ${w.totalEpisodes} 集` : ''}
                      </div>
                      {p !== null && (
                        <div className="mt-2.5">
                          <ProgressBar value={p} tone="tv" />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      <SectionTitle>最近观影</SectionTitle>
      {recentViewing.length === 0 ? (
        <Card>
          <Empty text="还没有观影记录" />
        </Card>
      ) : (
        <Card className="divide-y divide-ink/[0.05]">
          {recentViewing.map((e) => {
            const w = byId.get(e.workId);
            if (!w) return null;
            return (
              <button key={e.id} onClick={() => onOpenWork(w.id)} className="block w-full px-4 py-3 text-left">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-[15px] font-semibold">
                    {TYPE_ICON[w.type]} 《{w.title}》
                    {e.episode ? <span className="font-sans text-[12.5px] font-normal text-ink/50"> 第 {e.episode} 集</span> : null}
                  </span>
                  <span className="shrink-0 text-[12px] text-ink/45">{fmtDate(e.date)}</span>
                </div>
                {e.feeling && <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-ink/65">{e.feeling}</p>}
              </button>
            );
          })}
        </Card>
      )}

      <SectionTitle>最近记录</SectionTitle>
      <Card className="divide-y divide-ink/[0.05]">
        {recent.length === 0 && <Empty text="还没有任何记录" hint="打开一部作品，记下第一次阅读或观影" />}
        {recent.map((e) => {
          const w = byId.get(e.workId);
          if (!w) return null;
          return (
            <button key={e.id} onClick={() => onOpenWork(w.id)} className="block w-full px-4 py-3 text-left">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[14px] font-medium">
                  {TYPE_ICON[w.type]} 《{w.title}》
                  {e.page ? <span className="text-ink/50"> · 第 {e.page} 页</span> : null}
                  {e.episode ? <span className="text-ink/50"> · 第 {e.episode} 集</span> : null}
                  {e.minutes ? <span className="text-ink/50"> · {fmtMinutes(e.minutes)}</span> : null}
                </span>
                <span className="shrink-0 text-[12px] text-ink/45">{fmtDate(e.date)}</span>
              </div>
              {e.feeling && <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-ink/65">{e.feeling}</p>}
              {e.quote && <p className="mt-1 border-l-2 border-cinnabar-500/50 pl-2 font-serif text-[13.5px] italic leading-relaxed text-ink/60">「{e.quote}」</p>}
            </button>
          );
        })}
      </Card>
    </div>
  );
}
