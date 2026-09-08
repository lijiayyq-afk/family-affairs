import { TodoItem } from '../types';
import { formatHumanDate } from '../utils/dateUtils';
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
    const dateLabel = formatHumanDate(item.date).label;
    const membersText = item.members && item.members.length > 0 ? item.members.join('、') : '全家';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px; background: #fff;">
        <div style="font-size: 13px; color: #888; margin-bottom: 8px;">🏡 家庭事务提醒</div>
        <h2 style="font-size: 18px; color: #111; margin: 0 0 14px 0;">${item.title}</h2>
        <div style="background: #fafafa; padding: 12px 16px; border-radius: 8px; font-size: 14px; line-height: 1.8; color: #444;">
          <div>👥 <b>关联家人：</b>${membersText}</div>
          <div>📅 <b>办理日期：</b>${dateLabel} (${item.date})</div>
        </div>
      </div>
    `;

    return this.send(`【家庭提醒】${membersText}：${item.title}`, html);
  }

  static async sendTodayDigest(todos: TodoItem[]) {
    const today = new Date().toISOString().slice(0, 10);
    const todayTodos = todos.filter((t) => !t.done && t.date === today);
    const overdueTodos = todos.filter((t) => !t.done && t.date < today);

    let html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px; background: #fff;">
        <h3 style="margin-top: 0; color: #111; font-size: 18px;">☀️ 今日家庭事务清单</h3>
    `;

    if (overdueTodos.length > 0) {
      html += `<div style="color: #e11d48; font-weight: bold; margin-bottom: 6px;">⚠️ 逾期未完成 (${overdueTodos.length}件)：</div><ul style="padding-left: 20px; margin-bottom: 14px; color: #9f1239;">`;
      overdueTodos.forEach((t) => {
        const mems = t.members.join('、');
        html += `<li><b>[${mems}]</b> ${t.title} (${t.date})</li>`;
      });
      html += `</ul>`;
    }

    html += `<div style="color: #333; font-weight: bold; margin-bottom: 6px;">📌 今日待办 (${todayTodos.length}件)：</div>`;
    if (todayTodos.length === 0) {
      html += `<p style="color: #888; font-size: 14px;">今天暂无待办，好好放松一下！</p>`;
    } else {
      html += `<ul style="padding-left: 20px; color: #222;">`;
      todayTodos.forEach((t) => {
        const mems = t.members.join('、');
        html += `<li><b>[${mems}]</b> ${t.title}</li>`;
      });
      html += `</ul>`;
    }

    html += `</div>`;

    return this.send(`【家庭清单】今日需办 ${todayTodos.length} 件`, html);
  }
}
