import { TodoItem, MemberItem, getMemberLabel, getMemberBadge } from '../types';
import { formatTodoDateRange } from '../utils/dateUtils';
import { renderTwoWeeksDigestHtml } from '../utils/digestRenderer';
import { APP_CONFIG } from '../config';

export class PushPlusService {
  private static DIRECT_URL = 'https://www.pushplus.plus/send';

  static getEffectiveToken(): string {
    if (APP_CONFIG.PUSHPLUS_TOKEN && APP_CONFIG.PUSHPLUS_TOKEN.trim()) {
      return APP_CONFIG.PUSHPLUS_TOKEN.trim();
    }
    const envToken = (import.meta as any).env?.VITE_PUSHPLUS_TOKEN;
    if (envToken && envToken.trim()) return envToken.trim();
    return '';
  }

  static async send(title: string, content: string): Promise<{ ok: boolean; msg: string }> {
    const token = this.getEffectiveToken();

    // 1. 优先尝试 Vercel /api/push（由服务端环境变量注入）
    try {
      const serverRes = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token || undefined,
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
      // 降级
    }

    if (!token) {
      return { ok: false, msg: '未配置 Token，请在 src/config.ts 或 Vercel 环境变量中填入 PUSHPLUS_TOKEN' };
    }

    try {
      const res = await fetch(this.DIRECT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
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

  static async sendItem(item: TodoItem) {
    const dateRangeInfo = formatTodoDateRange(item.date, item.endDate);
    const dateDesc = item.endDate && item.endDate > item.date 
      ? `${item.date} ~ ${item.endDate} (${dateRangeInfo.label})`
      : `${item.date} (${dateRangeInfo.label})`;
    const membersText = item.members && item.members.length > 0 
      ? item.members.map((m) => getMemberLabel(m)).join('、') 
      : '全家';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px; background: #fff;">
        <div style="font-size: 13px; color: #888; margin-bottom: 8px;">🏡 家庭事务提醒</div>
        <h2 style="font-size: 18px; color: #111; margin: 0 0 14px 0;">${item.title}</h2>
        <div style="background: #fafafa; padding: 12px 16px; border-radius: 8px; font-size: 14px; line-height: 1.8; color: #444;">
          <div>👥 <b>关联家人：</b>${membersText}</div>
          <div>📅 <b>办理时间：</b>${dateDesc}</div>
        </div>
      </div>
    `;

    const shortMembers = item.members && item.members.length > 0
      ? item.members.map((m) => getMemberBadge(m)).join('、')
      : '全家';

    return this.send(`【家庭提醒】${shortMembers}：${item.title}`, html);
  }

  static async sendTodayDigest(todos: TodoItem[], members?: MemberItem[]) {
    const { title, html } = renderTwoWeeksDigestHtml(todos, members);
    return this.send(title, html);
  }

  static getDigestPreviewHtml(todos: TodoItem[], members?: MemberItem[]): string {
    return renderTwoWeeksDigestHtml(todos, members).html;
  }
}
