import { useState } from 'react';
import { statusText, type Entry, type Work } from '../lib/types';
import { bookProgress, currentEpisode, currentPage, entriesOf, entryDurationText, entryMinutes, tvProgress } from '../lib/stats';
import { fmtDate, fmtDuration, fmtMinutes } from '../lib/time';
import { Card, Cover, Empty, ProgressBar, SectionTitle } from '../components/ui';
import { EntryForm, WorkForm } from '../components/forms';

const VERB: Record<Work['type'], string> = { book: '阅读', tv: '追剧', movie: '观影', other: '记录' };

export function Detail({
  work,
  entries,
  onBack,
}: {
  work: Work;
  entries: Entry[];
  onBack: () => void;
}) {
  const [entryForm, setEntryForm] = useState<{ entry: Entry | null } | null>(null);
  const [editWork, setEditWork] = useState(false);
  const list = entriesOf(work.id, entries);
  const p = bookProgress(work, entries);
  const tp = tvProgress(work, entries);
  const page = currentPage(work, entries);
  const ep = currentEpisode(work, entries);
  const quotes = list.filter((e) => e.quote.trim());
  const totalMinutes = list.reduce((s, e) => s + entryMinutes(work, e), 0);

  return (
    <div className="px-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onBack} className="py-1 pr-3 text-[15px] text-cinnabar-600" aria-label="返回">
          ‹ 返回
        </button>
        <button onClick={() => setEditWork(true)} className="py-1 text-[15px] text-ink/60">
          编辑作品
        </button>
      </div>

      <div className="flex flex-col items-center text-center">
        <Cover work={work} variant="detail" />
        <h1 className="mt-3 font-serif text-[22px] font-bold leading-snug">《{work.title}》</h1>
        <p className="mt-1 text-[14px] text-ink/55">
          {[
            work.creator,
            work.category,
            work.year && `${work.year} 年`,
            work.type === 'movie' && (work.durationMin || work.durationSec) && fmtDuration(work.durationMin, work.durationSec),
            work.type === 'tv' && work.totalEpisodes && `共 ${work.totalEpisodes} 集`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {work.cast && <p className="mt-1 max-w-full text-[13px] leading-relaxed text-ink/50">主演 {work.cast}</p>}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[12.5px]">
          <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-ink/65">{statusText(work.type, work.status)}</span>
          {work.startDate && <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-ink/65">{fmtDate(work.startDate)} 开始</span>}
          {work.finishDate && <span className="rounded-full bg-cinnabar-500/10 px-2.5 py-1 text-cinnabar-600">{fmtDate(work.finishDate)} 完成</span>}
          {work.highlight && <span className="rounded-full bg-cinnabar-500/10 px-2.5 py-1 text-cinnabar-600">印象深刻</span>}
          {list.length > 0 && <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-ink/65">{list.length} 次记录</span>}
          {totalMinutes > 0 && <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-ink/65">累计 {fmtMinutes(totalMinutes)}</span>}
          {work.statusLocked && <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-ink/45">状态手动管理中</span>}
        </div>
      </div>

      {work.type === 'book' && work.totalPages && (
        <Card className="mt-4 px-4 py-3.5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[14px] text-ink/60">阅读进度</span>
            <span className="text-[17px] font-bold tabular-nums text-cinnabar-600">
              {p !== null ? `${Math.round(p * 100)}%` : '—'}
              <span className="ml-2 text-[13px] font-normal text-ink/50">读到 {page} / {work.totalPages} 页</span>
            </span>
          </div>
          <ProgressBar value={p ?? 0} />
          {work.status === 'done' && p !== null && p < 1 && (
            <p className="mt-2 text-[12.5px] text-ink/45">已标记读完；进度按记录里的页码计算，不会被完成状态改掉。</p>
          )}
          {p === null && <p className="mt-2 text-[12.5px] text-ink/45">还没有记下页码，记一次阅读后这里会动起来。</p>}
        </Card>
      )}

      {work.type === 'tv' && work.totalEpisodes && (
        <Card className="mt-4 px-4 py-3.5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[14px] text-ink/60">追剧进度</span>
            <span className="text-[17px] font-bold tabular-nums text-iris-600">
              {tp !== null ? `${Math.round(tp * 100)}%` : '—'}
              <span className="ml-2 text-[13px] font-normal text-ink/50">看到 {ep} / {work.totalEpisodes} 集</span>
            </span>
          </div>
          <ProgressBar value={tp ?? 0} tone="tv" />
          {work.status === 'done' && tp !== null && tp < 1 && (
            <p className="mt-2 text-[12.5px] text-ink/45">已标记看完；进度按记录里的集数计算，不会被完成状态改掉。</p>
          )}
          {tp === null && <p className="mt-2 text-[12.5px] text-ink/45">还没有记下集数，记一次追剧后这里会动起来。</p>}
        </Card>
      )}

      <button
        onClick={() => setEntryForm({ entry: null })}
        className="mt-4 w-full rounded-2xl bg-cinnabar-600 py-3 text-[16px] font-semibold text-white active:bg-cinnabar-700"
      >
        ＋ 记一次{VERB[work.type]}
      </button>

      {quotes.length > 0 && (
        <>
          <SectionTitle>{work.type === 'book' ? '收藏的句子' : '喜欢的台词 / 片段'}</SectionTitle>
          <Card className="space-y-3 px-4 py-4">
            {quotes.map((e) => (
              <blockquote key={e.id} className="border-l-2 border-cinnabar-500/60 pl-3">
                <p className="font-serif text-[15px] italic leading-relaxed">「{e.quote}」</p>
                <p className="mt-0.5 text-[12px] text-ink/45">
                  {fmtDate(e.date)}
                  {e.page ? ` · 第 ${e.page} 页` : ''}
                  {e.episode ? ` · 第 ${e.episode} 集` : ''}
                </p>
              </blockquote>
            ))}
          </Card>
        </>
      )}

      <SectionTitle>{VERB[work.type]}历史</SectionTitle>
      {list.length === 0 ? (
        <Card>
          <Empty text="还没有记录" hint="每一次读、每一次看，都值得留下一笔" />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {list.map((e) => (
            <button key={e.id} onClick={() => setEntryForm({ entry: e })} className="card block w-full px-4 py-3.5 text-left">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[14px] font-medium">
                  {fmtDate(e.date)}
                  {e.page ? <span className="text-ink/50"> · 读到第 {e.page} 页</span> : null}
                  {e.episode ? <span className="text-ink/50"> · 看到第 {e.episode} 集</span> : null}
                </span>
                {entryDurationText(work, e) ? <span className="shrink-0 text-[12.5px] text-ink/45">{entryDurationText(work, e)}</span> : null}
              </div>
              {e.feeling && <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink/75">{e.feeling}</p>}
              {e.quote && <p className="mt-1.5 border-l-2 border-cinnabar-500/50 pl-2 font-serif text-[13.5px] italic leading-relaxed text-ink/60">「{e.quote}」</p>}
              <p className="mt-1.5 text-[12px] text-ink/35">点按可编辑</p>
            </button>
          ))}
        </div>
      )}

      {entryForm && (
        <EntryForm
          key={entryForm.entry?.id ?? 'new'}
          open
          onClose={() => setEntryForm(null)}
          work={work}
          initial={entryForm.entry}
        />
      )}
      {editWork && <WorkForm key={work.id} open onClose={() => setEditWork(false)} initial={work} />}
    </div>
  );
}
