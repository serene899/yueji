import { TYPE_ICON, statusText, type Entry, type Work } from '../lib/types';
import { bookProgress, currentEpisode, currentPage, overview, recentWatching, tvProgress } from '../lib/stats';
import { fmtDate, fmtMinutes } from '../lib/time';
import { Card, Cover, Empty, ProgressBar, SectionTitle } from '../components/ui';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 11) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

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
  const recentView = recentWatching(works, entries, 5);
  const recent = [...entries].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1)).slice(0, 5);
  const byId = new Map(works.map((w) => [w.id, w]));
  const now = new Date();

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
      <div className="px-1 pb-1 pt-1">
        <p className="text-[13px] text-ink/50">
          {now.getMonth() + 1} 月 {now.getDate()} 日 · 星期{WEEKDAYS[now.getDay()]}
        </p>
        <p className="mt-1 font-serif text-[19px] font-semibold">{greeting()}，今天想记点什么？</p>
      </div>

      <SectionTitle>概览</SectionTitle>
      <Card className="grid grid-cols-4 px-1 py-4 text-center">
        {[
          [ov.totalWorks, '部收藏作品'],
          [ov.finished, '部已完成'],
          [ov.readingEntries, '条阅读记录'],
          [ov.watchingEntries, '条观看记录'],
        ].map(([n, label]) => (
          <div key={label as string}>
            <div className="text-[20px] font-bold tabular-nums">{n}</div>
            <div className="mt-0.5 text-[11.5px] text-ink/50">{label}</div>
          </div>
        ))}
      </Card>

      <SectionTitle>正在进行</SectionTitle>
      {reading.length === 0 && watching.length === 0 ? (
        <Card>
          <Empty text="暂时没有在读、在看的作品" hint="在书架里开始一本书或一部剧，它会出现在这里" />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {reading.map((w) => {
            const p = bookProgress(w, entries);
            const page = currentPage(w, entries);
            return (
              <button key={w.id} onClick={() => onOpenWork(w.id)} className="card pressable block w-full px-3.5 py-3 text-left">
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
          {watching.map((w) => {
            const p = tvProgress(w, entries);
            const ep = currentEpisode(w, entries);
            return (
              <button key={w.id} onClick={() => onOpenWork(w.id)} className="card pressable block w-full px-3.5 py-3 text-left">
                <div className="flex gap-3">
                  <Cover work={w} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-serif text-[16px] font-semibold">《{w.title}》</span>
                      {p !== null && <span className="text-[13px] font-medium text-iris-600">{Math.round(p * 100)}%</span>}
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
      )}

      <SectionTitle>最近观看</SectionTitle>
      {recentView.length === 0 ? (
        <Card>
          <Empty text="还没有看过电影或电视剧" hint="看完一部、或记一次观影，它会出现在这里" />
        </Card>
      ) : (
        <Card className="divide-y divide-ink/[0.05]">
          {recentView.map(({ work: w, date, entry: e }) => (
            <button key={w.id} onClick={() => onOpenWork(w.id)} className="pressable block w-full px-4 py-3 text-left">
              <div className="flex gap-3">
                <Cover work={w} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-serif text-[15px] font-semibold">
                      {TYPE_ICON[w.type]} 《{w.title}》
                      {e?.episode ? <span className="font-sans text-[12.5px] font-normal text-ink/50"> 第 {e.episode} 集</span> : null}
                    </span>
                    <span className="shrink-0 text-[12px] text-ink/45">{fmtDate(date)}</span>
                  </div>
                  {e?.feeling ? (
                    <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-ink/65">{e.feeling}</p>
                  ) : (
                    <p className="mt-1 text-[13px] text-ink/45">
                      {w.status === 'done' ? `${statusText(w.type, w.status)} · 还没有记下感受` : '还没有记下感受'}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </Card>
      )}

      <SectionTitle>最近记录</SectionTitle>
      <Card className="divide-y divide-ink/[0.05]">
        {recent.length === 0 && <Empty text="还没有任何记录" hint="打开一部作品，记下第一次阅读或观影" />}
        {recent.map((e) => {
          const w = byId.get(e.workId);
          if (!w) return null;
          return (
            <button key={e.id} onClick={() => onOpenWork(w.id)} className="pressable block w-full px-4 py-3 text-left">
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
