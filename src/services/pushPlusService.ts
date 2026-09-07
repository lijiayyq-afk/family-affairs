import { TodoItem } from '../types';
import { formatHumanDate } from '../utils/dateUtils';

export class PushPlusService {
  private static DIRECT_URL = 'https://www.pushplus.plus/send';

  static getEffectiveToken(manualToken?: string): string {
    const envToken = (import.meta as any).env?.VITE_PUSHPLUS_TOKEN;
    if (envToken && envToken.trim()) return envToken.trim();
    return manualToken?.trim() || '';
  }

  static async send(token: string, title: string, content: string): Promise<{ ok: boolean; msg: string }> {
    const effectiveToken = this.getEffectiveToken(token);

    // 优先尝试 Vercel /api/push
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
      // 忽略降级
    }

    if (!effectiveToken) {
      return { ok: false, msg: '未配置 Token，可在设置中填入' };
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

  static async sendItem(item: TodoItem, token?: string) {
    const dateLabel = formatHumanDate(item.date).label;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px; background: #fff;">
        <div style="font-size: 13px; color: #888; margin-bottom: 8px;">🏡 家庭事务提醒</div>
        <h2 style="font-size: 18px; color: #111; margin: 0 0 14px 0;">${item.title}</h2>
        <div style="background: #fafafa; padding: 12px 16px; border-radius: 8px; font-size: 14px; line-height: 1.8; color: #444;">
          <div>👤 <b>关联家人：</b>${item.member}</div>
          <div>📅 <b>执行日期：</b>${dateLabel} (${item.date})</div>
        </div>
      </div>
    `;

    return this.send(token || '', `【家庭提醒】${item.member}：${item.title}`, html);
  }

  static async sendTodayDigest(todos: TodoItem[], token?: string) {
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
        html += `<li><b>[${t.member}]</b> ${t.title} (${t.date})</li>`;
      });
      html += `</ul>`;
    }

    html += `<div style="color: #333; font-weight: bold; margin-bottom: 6px;">📌 今日待办 (${todayTodos.length}件)：</div>`;
    if (todayTodos.length === 0) {
      html += `<p style="color: #888; font-size: 14px;">今天暂无待办，好好放松一下！</p>`;
    } else {
      html += `<ul style="padding-left: 20px; color: #222;">`;
      todayTodos.forEach((t) => {
        html += `<li><b>[${t.member}]</b> ${t.title}</li>`;
      });
      html += `</ul>`;
    }

    html += `</div>`;

    return this.send(token || '', `【家庭清单】今日需办 ${todayTodos.length} 件`, html);
  }
}
