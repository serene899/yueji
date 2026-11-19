import { useState } from 'react';
import {
  BOOK_CATEGORIES,
  MOVIE_CATEGORIES,
  newId,
  type Entry,
  type Work,
  type WorkStatus,
  type WorkType,
} from '../lib/types';
import { deleteEntry, deleteWork, putEntry, putWork } from '../lib/db';
import { todayStr } from '../lib/time';
import { DeleteButton, Field, Segmented, Sheet, inputCls } from './ui';

/* ---------------- 作品表单（添加/编辑 书或电影） ---------------- */

export function WorkForm({
  open,
  onClose,
  initial,
  defaultType = 'book',
}: {
  open: boolean;
  onClose: () => void;
  initial?: Work | null;
  defaultType?: WorkType;
}) {
  const [type, setType] = useState<WorkType>(initial?.type ?? defaultType);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [creator, setCreator] = useState(initial?.creator ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [year, setYear] = useState(initial?.year ? String(initial.year) : '');
  const [totalPages, setTotalPages] = useState(initial?.totalPages ? String(initial.totalPages) : '');
  const [durationMin, setDurationMin] = useState(initial?.durationMin ? String(initial.durationMin) : '');
  const [status, setStatus] = useState<WorkStatus>(initial?.status ?? 'planned');
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [finishDate, setFinishDate] = useState(initial?.finishDate ?? '');
  const [highlight, setHighlight] = useState(initial?.highlight ?? false);
  const [error, setError] = useState('');

  // 每次打开时按 initial 重置（组件以 key 方式重挂载也可，这里用 open 变化兜底）
  const cats = type === 'book' ? BOOK_CATEGORIES : MOVIE_CATEGORIES;

  async function save() {
    if (!title.trim()) {
      setError('先写下作品的名字');
      return;
    }
    const now = Date.now();
    const w: Work = {
      id: initial?.id ?? newId(),
      type,
      title: title.trim(),
      creator: creator.trim(),
      category: category.trim() || (type === 'book' ? '其他' : '其他'),
      year: year ? Number(year) : undefined,
      totalPages: type === 'book' && totalPages ? Number(totalPages) : undefined,
      durationMin: type === 'movie' && durationMin ? Number(durationMin) : undefined,
      status,
      startDate: startDate || undefined,
      finishDate: status === 'done' ? finishDate || todayStr() : finishDate || undefined,
      highlight,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    await putWork(w);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? '编辑作品' : '添加作品'}>
      <div className="mb-4">
        <Segmented
          ariaLabel="作品类型"
          value={type}
          onChange={(t) => {
            setType(t);
            setCategory('');
          }}
          options={[
            { value: 'book', label: '📖 书籍' },
            { value: 'movie', label: '🎬 电影' },
          ]}
        />
      </div>
      <Field label={type === 'book' ? '书名 *' : '片名 *'}>
        <input aria-label="作品名" className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type === 'book' ? '例如 活着' : '例如 重庆森林'} />
      </Field>
      <Field label={type === 'book' ? '作者' : '导演'}>
        <input aria-label="创作者" className={inputCls} value={creator} onChange={(e) => setCreator(e.target.value)} placeholder={type === 'book' ? '例如 余华' : '例如 王家卫'} />
      </Field>
      <Field label={type === 'book' ? '分类' : '类型'}>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1 text-[13px] ${category === c ? 'bg-cinnabar-500 text-white' : 'bg-ink/[0.06] text-ink/70'}`}
            >
              {c}
            </button>
          ))}
        </div>
        <input aria-label="分类" className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="也可以自己写一个分类" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={type === 'book' ? '出版年份' : '上映年份'}>
          <input aria-label="年份" className={inputCls} inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))} placeholder="1993" />
        </Field>
        {type === 'book' ? (
          <Field label="总页数">
            <input aria-label="总页数" className={inputCls} inputMode="numeric" value={totalPages} onChange={(e) => setTotalPages(e.target.value.replace(/\D/g, ''))} placeholder="例如 191" />
          </Field>
        ) : (
          <Field label="片长（分钟）">
            <input aria-label="片长" className={inputCls} inputMode="numeric" value={durationMin} onChange={(e) => setDurationMin(e.target.value.replace(/\D/g, ''))} placeholder="例如 102" />
          </Field>
        )}
      </div>
      <Field label="状态">
        <Segmented
          ariaLabel="状态"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'planned', label: type === 'book' ? '想读' : '想看' },
            { value: 'doing', label: type === 'book' ? '在读' : '在看' },
            { value: 'done', label: type === 'book' ? '读完' : '看完' },
          ]}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={type === 'book' ? '开始日期' : '开始日期'}>
          <input aria-label="开始日期" type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label={type === 'book' ? '读完日期' : '看完日期'}>
          <input aria-label="完成日期" type="date" className={inputCls} value={finishDate} onChange={(e) => setFinishDate(e.target.value)} />
        </Field>
      </div>
      <label className="mb-5 flex items-center justify-between rounded-xl border border-ink/10 bg-card px-3.5 py-3">
        <span className="text-[15px]">印象深刻</span>
        <input aria-label="印象深刻" type="checkbox" className="h-5 w-5 accent-[#a83e21]" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} />
      </label>
      {error && <p className="mb-3 text-[14px] text-red-600">{error}</p>}
      <button onClick={save} className="w-full rounded-xl bg-cinnabar-600 py-3 text-[16px] font-semibold text-white active:bg-cinnabar-700">
        保存
      </button>
      {initial && (
        <div className="mt-3">
          <DeleteButton
            label="删除这部作品（连同它的全部记录）"
            onDelete={async () => {
              await deleteWork(initial.id);
              onClose();
            }}
          />
        </div>
      )}
    </Sheet>
  );
}

/* ---------------- 记录表单（一次阅读 / 一次观影） ---------------- */

export function EntryForm({
  open,
  onClose,
  work,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  work: Work;
  initial?: Entry | null;
}) {
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [page, setPage] = useState(initial?.page ? String(initial.page) : '');
  const [minutes, setMinutes] = useState(initial?.minutes ? String(initial.minutes) : '');
  const [feeling, setFeeling] = useState(initial?.feeling ?? '');
  const [quote, setQuote] = useState(initial?.quote ?? '');

  async function save() {
    const now = Date.now();
    const e: Entry = {
      id: initial?.id ?? newId(),
      workId: work.id,
      date: date || todayStr(),
      page: work.type === 'book' && page ? Number(page) : undefined,
      minutes: minutes ? Number(minutes) : undefined,
      feeling: feeling.trim(),
      quote: quote.trim(),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    await putEntry(e);
    // 记了进度的小联动：书有了第一条记录且状态还是「想读」时，自动进入「在读」；记到总页数则自动「读完」
    if (work.type === 'book') {
      if (work.status === 'planned') {
        await putWork({ ...work, status: 'doing', startDate: work.startDate ?? e.date });
      } else if (work.totalPages && e.page && e.page >= work.totalPages && work.status !== 'done') {
        await putWork({ ...work, status: 'done', finishDate: e.date });
      }
    }
    if (work.type === 'movie' && work.status === 'planned') {
      await putWork({ ...work, status: 'done', finishDate: work.finishDate ?? e.date });
    }
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? '编辑记录' : work.type === 'book' ? '记一次阅读' : '记一次观影'}>
      <p className="mb-4 font-serif text-[15px] text-ink/60">《{work.title}》</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="日期">
          <input aria-label="记录日期" type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {work.type === 'book' ? (
          <Field label={`读到第几页${work.totalPages ? `（共 ${work.totalPages} 页）` : ''}`}>
            <input aria-label="读到第几页" className={inputCls} inputMode="numeric" value={page} onChange={(e) => setPage(e.target.value.replace(/\D/g, ''))} placeholder="例如 86" />
          </Field>
        ) : (
          <Field label="时长（分钟）">
            <input aria-label="时长分钟" className={inputCls} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} placeholder={work.durationMin ? String(work.durationMin) : '例如 102'} />
          </Field>
        )}
      </div>
      {work.type === 'book' && (
        <Field label="这次读了多久（分钟，可不填）">
          <input aria-label="阅读时长" className={inputCls} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} placeholder="例如 40" />
        </Field>
      )}
      <Field label="当时的想法和感受">
        <textarea aria-label="想法和感受" className={`${inputCls} min-h-[96px]`} value={feeling} onChange={(e) => setFeeling(e.target.value)} placeholder="这段文字写了什么、你想到了什么，都可以记下来" />
      </Field>
      <Field label={work.type === 'book' ? '收藏的句子' : '喜欢的台词 / 片段'}>
        <textarea aria-label="收藏的句子" className={`${inputCls} min-h-[64px]`} value={quote} onChange={(e) => setQuote(e.target.value)} placeholder={work.type === 'book' ? '抄一句打动你的话' : '一句台词，或一个片段的样子'} />
      </Field>
      <button onClick={save} className="w-full rounded-xl bg-cinnabar-600 py-3 text-[16px] font-semibold text-white active:bg-cinnabar-700">
        保存记录
      </button>
      {initial && (
        <div className="mt-3">
          <DeleteButton
            label="删除这条记录"
            onDelete={async () => {
              await deleteEntry(initial.id);
              onClose();
            }}
          />
        </div>
      )}
    </Sheet>
  );
}
