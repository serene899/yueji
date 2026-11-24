import { useRef, useState } from 'react';
import { exportBackup, importBackup } from '../lib/backup';
import { exportExchange } from '../lib/lifeos';
import { getTmdbKey, setTmdbKey } from '../lib/lookup';
import { Card, SectionTitle, inputCls } from '../components/ui';

const LAST_BACKUP_KEY = 'yueji-last-backup-at';

function backupHint(): string {
  const t = Number(localStorage.getItem(LAST_BACKUP_KEY) ?? 0);
  if (!t) return '还没有导出过备份。数据只在这台手机上，建议现在就导出一份存好。';
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days >= 30) return `上次备份是 ${days} 天前，建议再导出一次。`;
  const d = new Date(t);
  return `上次备份：${d.getMonth() + 1} 月 ${d.getDate()} 日。`;
}

export function Me({ worksCount, entriesCount }: { worksCount: number; entriesCount: number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [hint, setHint] = useState(backupHint);
  const [tmdbInput, setTmdbInput] = useState(getTmdbKey);
  const [tmdbSaved, setTmdbSaved] = useState(() => !!getTmdbKey());
  const [tmdbMsg, setTmdbMsg] = useState('');

  async function doExport() {
    const name = await exportBackup();
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
    setHint(backupHint());
    setMsg(`已导出备份文件 ${name}，请把它存到你放心的地方（文件 App / iCloud）。`);
  }

  async function doExchange() {
    try {
      const r = await exportExchange();
      setMsg(
        r.records === 0
          ? '还没有可发送的记录：先记几笔阅读/观影，再来发送。'
          : `已生成发往人生K线图的文件 ${r.name}（${r.days} 天数据）。把它存到「文件」App，再打开人生K线图 →「数据」→「收数据」选进来就行。只含阅读时长与活动事实，不含你的感受原文。`,
      );
    } catch (e) {
      setMsg(`生成失败：${e instanceof Error ? e.message : '未知错误'}。`);
    }
  }

  async function doImport() {
    if (!pendingFile) return;
    try {
      const r = await importBackup(pendingFile);
      setMsg(`恢复完成：${r.works} 部作品、${r.entries} 条记录。`);
    } catch (e) {
      setMsg(`恢复失败：${e instanceof Error ? e.message : '未知错误'}。原有数据没有被改动。`);
    }
    setPendingFile(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="px-4">
      <SectionTitle>我的档案</SectionTitle>
      <Card className="px-4 py-4">
        <p className="text-[15px] leading-relaxed text-ink/75">
          现在共有 <b>{worksCount}</b> 部作品、<b>{entriesCount}</b> 条记录。
          全部数据只存在这台手机的浏览器里，没有服务器，也不上传任何地方。
        </p>
      </Card>

      <SectionTitle>发到人生K线图</SectionTitle>
      <Card className="space-y-3 px-4 py-4">
        <p className="text-[14px] leading-relaxed text-ink/70">
          把阅读时长和阅读/观影活动打包成一个小文件，交给人生K线图算「学习」和「精神生活」两维。
          只发事实，不发你写的感受和摘句原文。
        </p>
        <button onClick={doExchange} className="w-full rounded-xl bg-cinnabar-600 py-3 text-[15.5px] font-semibold text-white" data-testid="export-exchange">
          生成交换文件
        </button>
      </Card>

      <SectionTitle>备份与恢复</SectionTitle>
      <Card className="space-y-3 px-4 py-4">
        <button onClick={doExport} className="w-full rounded-xl bg-cinnabar-600 py-3 text-[15.5px] font-semibold text-white">
          导出备份（JSON）
        </button>
        <button onClick={() => fileRef.current?.click()} className="w-full rounded-xl border border-ink/12 bg-paper py-3 text-[15.5px] font-medium">
          从备份文件恢复
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="选择备份文件"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setPendingFile(f);
              setMsg('');
            }
          }}
        />
        {pendingFile && (
          <div className="rounded-xl bg-amber-500/10 px-3.5 py-3 text-[14px] leading-relaxed text-ink/80">
            已选择「{pendingFile.name}」。恢复会<b>替换</b>当前全部数据，确定继续吗？
            <div className="mt-2.5 flex gap-2">
              <button onClick={doImport} className="flex-1 rounded-lg bg-cinnabar-600 py-2 font-semibold text-white">
                确认恢复
              </button>
              <button
                onClick={() => {
                  setPendingFile(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
                className="flex-1 rounded-lg bg-ink/[0.06] py-2"
              >
                取消
              </button>
            </div>
          </div>
        )}
        {msg && <p className="text-[14px] leading-relaxed text-ink/70">{msg}</p>}
        <p className="text-[13px] font-medium leading-relaxed text-ink/60">{hint}</p>
        <p className="text-[13px] leading-relaxed text-ink/45">
          换手机、清浏览器之前，先导出一份备份存好；到了新环境打开阅迹，在这里选「从备份文件恢复」就能把档案搬过去（封面图也在备份里，会一起回来）。
          Safari 有时会清理长期不用的网站数据，建议每个月导出一次。
        </p>
      </Card>

      <SectionTitle>联网海报源（TMDB）</SectionTitle>
      <Card className="space-y-3 px-4 py-4">
        <p className="text-[14px] leading-relaxed text-ink/70">
          TMDB 是海报和演职员最全的免费资料库。把你自己注册的 TMDB 密钥填进来，
          「联网找封面」就会优先从 TMDB 找——真人电影的海报命中率会高很多，选中后导演、主演、类型一起补上。
          没填也能用（走 Bangumi + Wikidata）。
        </p>
        <input
          aria-label="TMDB 密钥"
          className={inputCls}
          value={tmdbInput}
          onChange={(e) => setTmdbInput(e.target.value)}
          placeholder="把 TMDB 的 API Key 粘贴到这里"
          autoCapitalize="off"
          autoCorrect="off"
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              setTmdbKey(tmdbInput);
              const ok = !!getTmdbKey();
              setTmdbSaved(ok);
              setTmdbMsg(ok ? '已保存。下次添加电影/电视剧时点「联网找封面」就会先走 TMDB。' : '先把密钥粘贴进来，再点保存。');
            }}
            className="flex-1 rounded-xl bg-cinnabar-600 py-2.5 text-[15px] font-semibold text-white"
          >
            保存密钥
          </button>
          {tmdbSaved && (
            <button
              onClick={() => {
                setTmdbKey('');
                setTmdbInput('');
                setTmdbSaved(false);
                setTmdbMsg('已清除，恢复用 Bangumi + Wikidata 找封面。');
              }}
              className="rounded-xl bg-ink/[0.06] px-4 py-2.5 text-[15px] text-ink/70"
            >
              清除
            </button>
          )}
        </div>
        {tmdbMsg && <p className="text-[13.5px] leading-relaxed text-ink/70">{tmdbMsg}</p>}
        <p className="text-[13px] leading-relaxed text-ink/45">
          还没有密钥？去{' '}
          <a href="https://www.themoviedb.org/signup" target="_blank" rel="noreferrer" className="font-medium text-cinnabar-600 underline">
            TMDB 官网免费注册
          </a>
          ，拿到 API Key 后粘贴到上面。密钥只存在这台手机的浏览器里，不进备份、不上传任何地方。
        </p>
      </Card>

      <SectionTitle>关于阅迹</SectionTitle>
      <Card className="px-4 py-4">
        <p className="font-serif text-[15px] leading-relaxed text-ink/75">
          阅迹是 LIFEOS 的一角：一座只属于你自己的精神档案。
          它不社交、没有点赞和排行，只是安安静静地记下你读过什么、看过什么，
          以及在不同时间里，它们给过你什么样的感受。
        </p>
        <p className="mt-3 text-[13px] text-ink/45">阅迹 v0.5.1 · LIFEOS 项目 05</p>
      </Card>
    </div>
  );
}
