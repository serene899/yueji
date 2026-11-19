import { useRef, useState } from 'react';
import { exportBackup, importBackup } from '../lib/backup';
import { exportExchange } from '../lib/lifeos';
import { Card, SectionTitle } from '../components/ui';

export function Me({ worksCount, entriesCount }: { worksCount: number; entriesCount: number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function doExport() {
    const name = await exportBackup();
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
        <p className="text-[13px] leading-relaxed text-ink/45">
          换手机、清浏览器之前，先导出一份备份存好；到了新环境打开阅迹，在这里选「从备份文件恢复」就能把档案搬过去。
          Safari 有时会清理长期不用的网站数据，建议每个月导出一次。
        </p>
      </Card>

      <SectionTitle>关于阅迹</SectionTitle>
      <Card className="px-4 py-4">
        <p className="font-serif text-[15px] leading-relaxed text-ink/75">
          阅迹是 LIFEOS 的一角：一座只属于你自己的精神档案。
          它不社交、没有点赞和排行，只是安安静静地记下你读过什么、看过什么，
          以及在不同时间里，它们给过你什么样的感受。
        </p>
        <p className="mt-3 text-[13px] text-ink/45">阅迹 v0.2.0 · LIFEOS 项目 05</p>
      </Card>
    </div>
  );
}
