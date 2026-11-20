import { useMemo } from 'react';
import { TYPE_ICON, type Entry, type Work } from '../lib/types';
import { fmtMinutes } from '../lib/time';
import { Card, Empty } from '../components/ui';

/** 记录页：全部记录按月倒序——「我这段时间读了什么、看了什么」一眼看清。 */
export function Records({
  works,
  entries,
  onOpenWork,
}: {
  works: Work[];
  entries: Entry[];
  onOpenWork: (id: string) => void;
}) {
  const byId = useMemo(() => new Map(works.map((w) => [w.id, w])), [works]);
  const groups = useMemo(() => {
    const sorted = [...entries].sort((a, b) =>
      a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1,
    );
    const map = new Map<string, Entry[]>();
    for (const e of sorted) {
      const key = e.date.slice(0, 7);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="px-4">
        <Card>
          <Empty text="还没有任何记录" hint="打开一部作品，记下第一次阅读或观影，这里会按月攒起你的轨迹" />
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4">
      {groups.map(([month, list]) => (
        <div key={month}>
          <div className="mb-2 mt-6 flex items-end justify-between px-1 first:mt-0">
            <h2 className="font-serif text-[17px] font-semibold tracking-wide">
              {Number(month.slice(0, 4))} 年 {Number(month.slice(5, 7))} 月
            </h2>
            <span className="text-[12px] text-ink/45">{list.length} 条</span>
          </div>
          <Card className="divide-y divide-ink/[0.05]">
            {list.map((e) => {
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
                    <span className="shrink-0 text-[12px] text-ink/45">{Number(e.date.slice(8, 10))} 日</span>
                  </div>
                  {e.feeling && <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-ink/65">{e.feeling}</p>}
                  {e.quote && (
                    <p className="mt-1 border-l-2 border-cinnabar-500/50 pl-2 font-serif text-[13.5px] italic leading-relaxed text-ink/60">
                      「{e.quote}」
                    </p>
                  )}
                </button>
              );
            })}
          </Card>
        </div>
      ))}
    </div>
  );
}
