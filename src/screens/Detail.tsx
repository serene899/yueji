import { useState } from 'react';
import type { Entry, Work } from '../lib/types';
import { bookProgress, currentPage, entriesOf } from '../lib/stats';
import { fmtDate, fmtMinutes } from '../lib/time';
import { Card, Empty, ProgressBar, SectionTitle } from '../components/ui';
import { EntryForm, WorkForm } from '../components/forms';

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
  const page = currentPage(work, entries);
  const quotes = list.filter((e) => e.quote.trim());
  const totalMinutes = list.reduce((s, e) => s + (e.minutes ?? 0), 0);

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

      <div className="text-center">
        <div className="text-[34px]">{work.type === 'book' ? '📖' : '🎬'}</div>
        <h1 className="mt-1 font-serif text-[22px] font-bold leading-snug">《{work.title}》</h1>
        <p className="mt-1 text-[14px] text-ink/55">
          {[work.creator, work.category, work.year && `${work.year} 年`, work.type === 'movie' && work.durationMin && `${work.durationMin} 分钟`]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[12.5px]">
          <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-ink/65">
            {work.status === 'done' ? (work.type === 'book' ? '读完' : '看完') : work.status === 'doing' ? (work.type === 'book' ? '在读' : '在看') : work.type === 'book' ? '想读' : '想看'}
          </span>
          {work.startDate && <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-ink/65">{fmtDate(work.startDate)} 开始</span>}
          {work.finishDate && <span className="rounded-full bg-cinnabar-500/10 px-2.5 py-1 text-cinnabar-600">{fmtDate(work.finishDate)} 完成</span>}
          {work.highlight && <span className="rounded-full bg-cinnabar-500/10 px-2.5 py-1 text-cinnabar-600">印象深刻</span>}
          {totalMinutes > 0 && <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-ink/65">累计 {fmtMinutes(totalMinutes)}</span>}
        </div>
      </div>

      {work.type === 'book' && p !== null && (
        <Card className="mt-4 px-4 py-3.5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[14px] text-ink/60">阅读进度</span>
            <span className="font-serif text-[17px] font-bold text-cinnabar-600">
              {Math.round(p * 100)}%<span className="ml-2 text-[13px] font-normal text-ink/50">读到 {page} / {work.totalPages} 页</span>
            </span>
          </div>
          <ProgressBar value={p} />
        </Card>
      )}

      <button
        onClick={() => setEntryForm({ entry: null })}
        className="mt-4 w-full rounded-2xl bg-cinnabar-600 py-3 text-[16px] font-semibold text-white active:bg-cinnabar-700"
      >
        {work.type === 'book' ? '＋ 记一次阅读' : '＋ 记一次观影'}
      </button>

      {quotes.length > 0 && (
        <>
          <SectionTitle>{work.type === 'book' ? '收藏的句子' : '喜欢的台词 / 片段'}</SectionTitle>
          <Card className="space-y-3 px-4 py-4">
            {quotes.map((e) => (
              <blockquote key={e.id} className="border-l-2 border-cinnabar-500/60 pl-3">
                <p className="font-serif text-[15px] italic leading-relaxed">「{e.quote}」</p>
                <p className="mt-0.5 text-[12px] text-ink/45">{fmtDate(e.date)}{e.page ? ` · 第 ${e.page} 页` : ''}</p>
              </blockquote>
            ))}
          </Card>
        </>
      )}

      <SectionTitle>{work.type === 'book' ? '阅读历史' : '观影历史'}</SectionTitle>
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
                </span>
                {e.minutes ? <span className="shrink-0 text-[12.5px] text-ink/45">{fmtMinutes(e.minutes)}</span> : null}
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
