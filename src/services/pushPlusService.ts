import { AffairItem, Member } from '../types';
import { formatHumanDate } from '../utils/dateUtils';

export class PushPlusService {
  private static DIRECT_URL = 'https://www.pushplus.plus/send';

  /**
   * 获取生效的 Token（优先环境变量，其次手动设置）
   */
  static getEffectiveToken(manualToken?: string): string {
    const envToken = (import.meta as any).env?.VITE_PUSHPLUS_TOKEN;
    if (envToken && envToken.trim()) return envToken.trim();
    return manualToken?.trim() || '';
  }

  /**
   * 发送通知：优先走 Vercel 自身部署的 /api/push 路由，服务端环境变量自动托管；若失败则直连 PushPlus
   */
  static async send(token: string, title: string, content: string): Promise<{ ok: boolean; msg: string }> {
    const effectiveToken = this.getEffectiveToken(token);

    // 1. 优先尝试请求 Vercel Serverless /api/push 路由
    try {
      const serverRes = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: effectiveToken || undefined,
          title: title.slice(0, 40),
          content,
        }),
      });

      if (serverRes.ok) {
        const data = await serverRes.json();
        if (data.code === 200) {
          return { ok: true, msg: '微信推送成功' };
        }
      }
    } catch {
      // 忽略服务路由失败，继续降级到直连
    }

    // 2. 降级：客户端直连 PushPlus 官方 API
    if (!effectiveToken) {
      return { ok: false, msg: '未配置 Token，可在 Vercel 环境变量或设置中添加 PUSHPLUS_TOKEN' };
    }

    try {
      const res = await fetch(this.DIRECT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: effectiveToken,
          title: title.slice(0, 40),
          content,
          template: 'html',
        }),
      });

      const data = await res.json();
      if (data.code === 200) {
        return { ok: true, msg: '微信推送成功' };
      }
      return { ok: false, msg: data.msg || '推送失败' };
    } catch (e: any) {
      return { ok: false, msg: e.message || '网络异常' };
    }
  }

  /**
   * 发送单项事务微信提醒
   */
  static async sendItemReminder(item: AffairItem, member?: Member, token?: string) {
    const humanDate = formatHumanDate(item.date).label;
    const memberName = member?.name || '全家';

    const html = `
      <div style="font-family: -apple-system, sans-serif; padding: 18px; border: 1px solid #e5e5e5; border-radius: 12px; background: #fff;">
        <div style="font-size: 13px; color: #888; margin-bottom: 6px;">🏡 家庭事务提醒 · ${item.category}</div>
        <h3 style="font-size: 17px; color: #1a1a1a; margin: 0 0 12px 0;">${item.title}</h3>
        <div style="background: #f8f8f7; padding: 12px; border-radius: 8px; font-size: 14px; line-height: 1.8; color: #444;">
          <div>👤 <b>成员：</b>${memberName}</div>
          <div>📅 <b>日期：</b>${humanDate} (${item.date})</div>
          ${item.priority === 'urgent' ? '<div style="color: #e11d48;">🚨 <b>级别：</b>紧急办理</div>' : ''}
          ${item.note ? `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #ddd;">📝 <b>备注：</b>${item.note}</div>` : ''}
        </div>
      </div>
    `;

    return this.send(token || '', `【待办提醒】${memberName}：${item.title}`, html);
  }

  /**
   * 生成并发送今日早报
   */
  static async sendDailyDigest(items: AffairItem[], members: Member[], token?: string) {
    const memberMap = new Map(members.map((m) => [m.id, m]));
    const today = new Date().toISOString().slice(0, 10);

    const todayItems = items.filter((i) => !i.done && i.date === today);
    const overdueItems = items.filter((i) => !i.done && i.date < today);

    let listHtml = '';

    if (overdueItems.length > 0) {
      listHtml += `<div style="color: #e11d48; font-weight: bold; margin-bottom: 8px;">⚠️ 逾期未办 (${overdueItems.length}件)：</div>`;
      overdueItems.forEach((i) => {
        const m = memberMap.get(i.memberId);
        listHtml += `<div style="margin-bottom: 6px; font-size: 13px; color: #9f1239;">• <b>[${m?.name || '全家'}]</b> ${i.title} (${i.date})</div>`;
      });
      listHtml += '<hr style="border: none; border-top: 1px solid #eee; margin: 12px 0;" />';
    }

    listHtml += `<div style="font-weight: bold; color: #1a1a1a; margin-bottom: 8px;">📌 今日事务 (${todayItems.length}件)：</div>`;
    if (todayItems.length === 0) {
      listHtml += '<div style="color: #666; font-size: 13px;">今天暂无安排，轻松愉快！</div>';
    } else {
      todayItems.forEach((i) => {
        const m = memberMap.get(i.memberId);
        listHtml += `<div style="margin-bottom: 8px; font-size: 14px; color: #222;">• <b>[${m?.name || '全家'}]</b> ${i.title} <span style="color: #888; font-size: 12px;">(${i.category})</span></div>`;
      });
    }

    const content = `
      <div style="font-family: -apple-system, sans-serif; padding: 18px; border: 1px solid #e5e5e5; border-radius: 12px; background: #fff;">
        <h3 style="margin-top: 0; color: #1a1a1a;">☀️ 今日家庭事务早报</h3>
        <div style="background: #fafaf9; padding: 14px; border-radius: 8px;">
          ${listHtml}
        </div>
      </div>
    `;

    return this.send(token || '', `【家庭早报】今日待办 ${todayItems.length} 件`, content);
  }
}
