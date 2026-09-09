declare const process: any;

const DEFAULT_GIST_ID = 'ecac7eb9e8c3ddce804fd21ec284bd21';
const FILE_NAME = 'family_todos.json';
const MEMBERS_FILE_NAME = 'family_members.json';
const DEFAULT_PUSHPLUS_TOKEN = '033a9f6a4ccf4c47ba595de163d37c14';

// 9款手帐预设颜色备用
const DEFAULT_MEMBER_COLORS: Record<string, { bg: string; text: string }> = {
  佳: { bg: '#f1f5f9', text: '#334155' },
  我: { bg: '#f1f5f9', text: '#334155' },
  娟: { bg: '#fdf2f8', text: '#9d174d' },
  配偶: { bg: '#fdf2f8', text: '#9d174d' },
  线: { bg: '#fff7ed', text: '#9a3412' },
  小宝: { bg: '#fff7ed', text: '#9a3412' },
  笑: { bg: '#f0fdf4', text: '#166534' },
  大宝: { bg: '#f0fdf4', text: '#166534' },
  爷: { bg: '#eef2ff', text: '#3730a3' },
  爷爷: { bg: '#eef2ff', text: '#3730a3' },
  奶: { bg: '#fefce8', text: '#854d0e' },
  奶奶: { bg: '#fefce8', text: '#854d0e' },
};

function getBeijingToday(): { dateStr: string; weekdayStr: string; formattedStr: string; dateObj: Date } {
  const now = new Date();
  // 转换为北京时间 UTC+8
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const beijing = new Date(utc + 8 * 3600000);

  const y = beijing.getFullYear();
  const m = String(beijing.getMonth() + 1).padStart(2, '0');
  const d = String(beijing.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const weekdayStr = weekdays[beijing.getDay()];
  const formattedStr = `${y}年${Number(m)}月${Number(d)}日`;

  return { dateStr, weekdayStr, formattedStr, dateObj: beijing };
}

function addDaysStr(baseDateStr: string, days: number): string {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  const ry = date.getFullYear();
  const rm = String(date.getMonth() + 1).padStart(2, '0');
  const rd = String(date.getDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
}

function getDaysDiff(targetStr: string, baseStr: string): number {
  const [y1, m1, d1] = targetStr.split('-').map(Number);
  const [y2, m2, d2] = baseStr.split('-').map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);
  const diffTime = date1.getTime() - date2.getTime();
  return Math.round(diffTime / (1000 * 3600 * 24));
}

export default async function handler(req: any, res: any) {
  // 允许跨域与预检
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const gistId = process.env.SYNC_GIST_ID || DEFAULT_GIST_ID;
  const ghToken = process.env.GH_SYNC_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const pushToken = process.env.PUSHPLUS_TOKEN || process.env.VITE_PUSHPLUS_TOKEN || DEFAULT_PUSHPLUS_TOKEN;

  if (!gistId) {
    res.status(500).json({ code: 500, msg: '未指定云端 Gist ID' });
    return;
  }

  try {
    // 1. 从 Gist 读取待办数据与成员数据（公开 Gist 支持无 Token 安全读取）
    const gistHeaders: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'FamilyAffairsApp-CronDigest',
    };
    if (ghToken) {
      gistHeaders.Authorization = `token ${ghToken}`;
    }

    const gistRes = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'GET',
      headers: gistHeaders,
    });

    if (!gistRes.ok) {
      res.status(gistRes.status).json({ code: gistRes.status, msg: '云端 Gist 读取失败' });
      return;
    }

    const gistData = await gistRes.json();
    const todosFile = gistData.files && gistData.files[FILE_NAME];
    const membersFile = gistData.files && gistData.files[MEMBERS_FILE_NAME];

    let todos: any[] = [];
    if (todosFile && todosFile.content) {
      try {
        todos = JSON.parse(todosFile.content);
      } catch {}
    }

    // 过滤掉任何历史残留的示例 mock
    const MOCK_TITLES = new Set([
      '陪爷爷去医院配慢病药',
      '交家里水电气费',
      '买家里的米面油和抽纸',
    ]);
    const MOCK_IDS = new Set(['1', '2', '3']);
    todos = (Array.isArray(todos) ? todos : []).filter((t: any) => {
      if (!t) return false;
      const title = (t.title || '').trim();
      const id = String(t.id || '');
      return !(MOCK_IDS.has(id) && MOCK_TITLES.has(title)) && !MOCK_TITLES.has(title);
    });

    let members: any[] = [];
    if (membersFile && membersFile.content) {
      try {
        members = JSON.parse(membersFile.content);
      } catch {}
    }

    // 建立成员查找映射
    const memberColorMap: Record<string, { bg: string; text: string; badge: string }> = {};
    if (Array.isArray(members)) {
      members.forEach((m) => {
        if (m && m.badge) {
          memberColorMap[m.badge] = {
            bg: m.color?.bg || '#f1f5f9',
            text: m.color?.text || '#334155',
            badge: m.badge,
          };
          if (m.role) {
            memberColorMap[m.role] = memberColorMap[m.badge];
          }
        }
      });
    }

    const getMemberBadgeAndColor = (raw: string) => {
      if (memberColorMap[raw]) return memberColorMap[raw];
      const fallbackColor = DEFAULT_MEMBER_COLORS[raw] || { bg: '#f1f5f9', text: '#334155' };
      return {
        bg: fallbackColor.bg,
        text: fallbackColor.text,
        badge: raw.slice(0, 2),
      };
    };

    const renderBadges = (mems: string[]) => {
      const list = Array.isArray(mems) && mems.length > 0 ? mems : ['佳'];
      return list
        .map((m) => {
          const info = getMemberBadgeAndColor(m);
          return `<span style="display:inline-block;padding:2px 7px;margin-right:5px;font-size:11px;font-weight:bold;line-height:1.4;border-radius:6px;background-color:${info.bg};color:${info.text};">${info.badge}</span>`;
        })
        .join('');
    };

    // 2. 筛选接下来两周（14天）的任务
    const { dateStr: todayStr, weekdayStr, formattedStr } = getBeijingToday();
    const twoWeeksLaterStr = addDaysStr(todayStr, 14);

    const activeTodos = todos.filter((t: any) => !t.done);

    // 逾期未完成
    const overdueTodos = activeTodos
      .filter((t: any) => (t.endDate || t.date) < todayStr)
      .sort((a: any, b: any) => a.date.localeCompare(b.date));

    // 今日待办与进行中
    const todayTodos = activeTodos.filter((t: any) => {
      if (t.endDate && t.endDate > t.date) {
        return t.date <= todayStr && todayStr <= t.endDate;
      }
      return t.date === todayStr;
    });

    // 未来两周（明天到两周后）
    const upcomingTodos = activeTodos
      .filter((t: any) => t.date > todayStr && t.date <= twoWeeksLaterStr)
      .sort((a: any, b: any) => a.date.localeCompare(b.date));

    // 按日期聚合
    const groupedUpcoming: Record<string, any[]> = {};
    upcomingTodos.forEach((item: any) => {
      if (!groupedUpcoming[item.date]) {
        groupedUpcoming[item.date] = [];
      }
      groupedUpcoming[item.date].push(item);
    });
    const sortedUpcomingDates = Object.keys(groupedUpcoming).sort();

    // 3. 构造极美排版 HTML
    const appUrl = 'https://family-affairs-one.vercel.app';
    const weekdaysName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    let html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:12px;background-color:#f7f6f2;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;color:#27272a;-webkit-font-smoothing:antialiased;">

<div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid #eae7df;">

  <!-- 1. 顶部晨光 Header 卡片 -->
  <div style="background:linear-gradient(135deg, #ea580c 0%, #f97316 45%, #f59e0b 100%);padding:24px 20px 20px 20px;color:#ffffff;text-align:left;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:12px;font-weight:600;letter-spacing:1px;background:rgba(255,255,255,0.22);padding:3px 10px;border-radius:20px;">🏡 亲邻记事 · 家庭事务晨报</span>
      <span style="font-size:11px;opacity:0.9;">两周日程早报</span>
    </div>

    <h1 style="margin:10px 0 6px 0;font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">
      ☀️ ${formattedStr} ${weekdayStr}
    </h1>
    <p style="margin:0 0 16px 0;font-size:13px;opacity:0.92;line-height:1.5;">
      早安！今日事，今日毕，祝今天也是从容温馨的一天。
    </p>

    <!-- 概览数据三联胶囊 -->
    <div style="display:flex;gap:8px;background:rgba(0,0,0,0.12);padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.18);">
      <div style="flex:1;text-align:center;">
        <div style="font-size:11px;opacity:0.85;">今日待办</div>
        <div style="font-size:18px;font-weight:800;margin-top:2px;">${todayTodos.length}</div>
      </div>
      <div style="width:1px;background:rgba(255,255,255,0.25);margin:2px 0;"></div>
      <div style="flex:1;text-align:center;">
        <div style="font-size:11px;opacity:0.85;">两周日程</div>
        <div style="font-size:18px;font-weight:800;margin-top:2px;">${upcomingTodos.length}</div>
      </div>
      <div style="width:1px;background:rgba(255,255,255,0.25);margin:2px 0;"></div>
      <div style="flex:1;text-align:center;">
        <div style="font-size:11px;opacity:0.85;">逾期未办</div>
        <div style="font-size:18px;font-weight:800;margin-top:2px;color:${overdueTodos.length > 0 ? '#ffedd5' : '#ffffff'};">${overdueTodos.length}</div>
      </div>
    </div>
  </div>

  <div style="padding:20px 18px;background:#fdfcf9;">
`;

    // 2. 逾期提醒
    if (overdueTodos.length > 0) {
      html += `
    <div style="margin-bottom:20px;background:#fff1f2;border:1px solid #fecdd3;border-radius:14px;padding:14px 16px;">
      <div style="font-size:13px;font-weight:700;color:#e11d48;margin-bottom:10px;">
        ⚠️ 逾期未办提醒 (${overdueTodos.length} 项)
      </div>
      `;

      overdueTodos.forEach((t: any) => {
        const diffDays = Math.abs(getDaysDiff(t.endDate || t.date, todayStr));
        const rangeText = t.endDate && t.endDate > t.date ? ` (${t.date} ~ ${t.endDate})` : ` (${t.date})`;
        html += `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #fecdd3;">
          <div style="flex:1;margin-right:8px;">
            <div style="margin-bottom:3px;">
              ${renderBadges(t.members)}
              <span style="font-size:13px;font-weight:600;color:#9f1239;">${t.title}</span>
            </div>
            <div style="font-size:11px;color:#f43f5e;">原定日期: ${rangeText}</div>
          </div>
          <span style="font-size:11px;font-weight:700;color:#be123c;background:#ffe4e6;padding:2px 6px;border-radius:6px;white-space:nowrap;">
            逾期 ${diffDays} 天
          </span>
        </div>
        `;
      });

      html += `</div>`;
    }

    // 3. 今日待办
    html += `
    <div style="margin-bottom:22px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #f3f0e6;">
        <span style="font-size:15px;font-weight:800;color:#18181b;">📌 今日重点待办</span>
        <span style="font-size:11px;font-weight:600;color:#f97316;background:#fff7ed;padding:2px 8px;border-radius:10px;">${todayTodos.length} 项</span>
      </div>
    `;

    if (todayTodos.length === 0) {
      html += `
      <div style="padding:16px;background:#f8f7f2;border-radius:12px;text-align:center;color:#71717a;font-size:13px;">
        ✨ 今天暂时没有待办事项，喝杯清茶，轻松享受美好的一天吧！
      </div>
      `;
    } else {
      todayTodos.forEach((t: any) => {
        const isMultiDay = Boolean(t.endDate && t.endDate > t.date);
        html += `
        <div style="background:#ffffff;border:1px solid #eeeae1;border-radius:12px;padding:12px 14px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;">
            <div style="flex:1;">
              <div style="margin-bottom:4px;">
                ${renderBadges(t.members)}
                <span style="font-size:14px;font-weight:700;color:#18181b;">${t.title}</span>
              </div>
              ${
                isMultiDay
                  ? `<div style="font-size:11px;color:#f97316;margin-top:4px;">🗓️ 连续时间段：${t.date.slice(5)} 至 ${t.endDate.slice(5)} (今天在办理期内)</div>`
                  : `<div style="font-size:11px;color:#71717a;margin-top:2px;">今日需办理</div>`
              }
            </div>
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ea580c;margin-top:6px;"></span>
          </div>
        </div>
        `;
      });
    }

    html += `</div>`;

    // 4. 未来两周日程时间线
    html += `
    <div style="margin-bottom:20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #f3f0e6;">
        <span style="font-size:15px;font-weight:800;color:#18181b;">🗓️ 接下来两周日程</span>
        <span style="font-size:11px;color:#71717a;">${todayStr.slice(5)} ~ ${twoWeeksLaterStr.slice(5)}</span>
      </div>
    `;

    if (upcomingTodos.length === 0) {
      html += `
      <div style="padding:16px;background:#f8f7f2;border-radius:12px;text-align:center;color:#71717a;font-size:13px;">
        🌿 未来两周暂无日程安排，生活从容不迫。
      </div>
      `;
    } else {
      sortedUpcomingDates.forEach((dateKey) => {
        const diff = getDaysDiff(dateKey, todayStr);
        const [y, m, d] = dateKey.split('-').map(Number);
        const dObj = new Date(y, m - 1, d);
        const wStr = weekdaysName[dObj.getDay()];

        let dayTitle = '';
        if (diff === 1) dayTitle = '明天';
        else if (diff === 2) dayTitle = '后天';
        else if (diff <= 7) dayTitle = `本周 ${wStr}`;
        else dayTitle = `下周 ${wStr}`;

        const dateBadge = `${m}月${d}日 · ${dayTitle}`;
        const itemsOnDate = groupedUpcoming[dateKey];

        html += `
        <div style="margin-bottom:12px;background:#ffffff;border:1px solid #eae6dc;border-radius:12px;overflow:hidden;">
          <div style="background:#f9f8f4;padding:6px 12px;font-size:12px;font-weight:700;color:#52525b;border-bottom:1px solid #f0ede6;display:flex;align-items:center;justify-content:space-between;">
            <span>📅 ${dateBadge}</span>
            <span style="font-size:10px;font-weight:normal;color:#a1a1aa;">距今 ${diff} 天</span>
          </div>
          <div style="padding:8px 12px;">
        `;

        itemsOnDate.forEach((t: any) => {
          const isMultiDay = Boolean(t.endDate && t.endDate > t.date);
          html += `
            <div style="padding:6px 0;display:flex;align-items:center;justify-content:space-between;border-bottom:1px dashed #f4f2eb;">
              <div style="flex:1;">
                ${renderBadges(t.members)}
                <span style="font-size:13px;font-weight:600;color:#27272a;">${t.title}</span>
                ${
                  isMultiDay
                    ? `<span style="font-size:10px;color:#d97706;background:#fef3c7;padding:1px 5px;border-radius:4px;margin-left:4px;">跨至 ${t.endDate.slice(5)}</span>`
                    : ''
                }
              </div>
            </div>
          `;
        });

        html += `
          </div>
        </div>
        `;
      });
    }

    html += `
    </div>

    <!-- 5. 底部快捷按钮与落款 -->
    <div style="text-align:center;padding:16px 0 6px 0;">
      <a href="${appUrl}" target="_blank" style="display:inline-block;padding:10px 24px;background:#18181b;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;border-radius:24px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        👉 打开家庭事务看板
      </a>
      <div style="margin-top:14px;font-size:11px;color:#a1a1aa;line-height:1.6;">
        亲邻记事 · 家庭事务中心 · 每日晨间 8:00 准时送达<br>
        愿您和家人的每一天都井井有条、温馨自在
      </div>
    </div>

  </div>
</div>

</body>
</html>
    `.trim();

    const pushTitle = `【家庭早报】今日需办 ${todayTodos.length} 件，两周待办 ${upcomingTodos.length} 件`;

    // 4. 调用 PushPlus 推送
    const pushRes = await fetch('https://www.pushplus.plus/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: pushToken,
        title: pushTitle,
        content: html,
        template: 'html',
      }),
    });

    const pushResult = await pushRes.json();

    res.status(200).json({
      code: 200,
      msg: '两周微信早报已推送',
      stats: {
        today: todayTodos.length,
        upcoming: upcomingTodos.length,
        overdue: overdueTodos.length,
      },
      pushResult,
    });
  } catch (err: any) {
    console.error('Cron digest error:', err);
    res.status(500).json({ code: 500, msg: err.message || '定时早报执行失败' });
  }
}
