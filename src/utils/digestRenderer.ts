import { TodoItem, MemberItem, getMemberBadge, getMemberColor, DEFAULT_MEMBERS } from '../types';
import { differenceInCalendarDays, parseISO, addDays, format } from 'date-fns';

export interface DigestStats {
  todayCount: number;
  upcomingCount: number;
  overdueCount: number;
}

/**
 * 筛选未来两周内的事项、今日事项与逾期事项
 */
export function filterTwoWeeksTodos(todos: TodoItem[], referenceDateStr?: string) {
  const todayStr = referenceDateStr || format(new Date(), 'yyyy-MM-dd');
  const twoWeeksLaterStr = format(addDays(parseISO(todayStr), 14), 'yyyy-MM-dd');

  // 未完成的事项
  const activeTodos = todos.filter((t) => !t.done);

  // 1. 逾期未完成事项：结束日期（或开始日期）在今天之前
  const overdueTodos = activeTodos
    .filter((t) => (t.endDate || t.date) < todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  // 2. 今日事项或今天正在进行中的跨期事项
  const todayTodos = activeTodos.filter((t) => {
    if (t.endDate && t.endDate > t.date) {
      return t.date <= todayStr && todayStr <= t.endDate;
    }
    return t.date === todayStr;
  });

  // 3. 未来两周（明日到第14天）开始的事项，按日期升序排列
  const upcomingTodos = activeTodos
    .filter((t) => t.date > todayStr && t.date <= twoWeeksLaterStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    todayStr,
    twoWeeksLaterStr,
    overdueTodos,
    todayTodos,
    upcomingTodos,
  };
}

/**
 * 生成超高颜值、手帐排版的微信推送 HTML
 */
export function renderTwoWeeksDigestHtml(
  todos: TodoItem[],
  members: MemberItem[] = DEFAULT_MEMBERS,
  options?: {
    todayStr?: string;
    appUrl?: string;
  }
): { title: string; html: string; stats: DigestStats } {
  const { todayStr, twoWeeksLaterStr, overdueTodos, todayTodos, upcomingTodos } = filterTwoWeeksTodos(
    todos,
    options?.todayStr
  );

  const appUrl = options?.appUrl || 'https://family-affairs-one.vercel.app';
  const todayObj = parseISO(todayStr);
  const weekdayMap = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const weekdayStr = weekdayMap[todayObj.getDay()];
  const formattedTodayDate = format(todayObj, 'yyyy年M月d日');

  const stats: DigestStats = {
    todayCount: todayTodos.length,
    upcomingCount: upcomingTodos.length,
    overdueCount: overdueTodos.length,
  };

  // 辅助渲染成员彩色徽章
  const renderMemberBadges = (rawMembers: string[]) => {
    const list = rawMembers && rawMembers.length > 0 ? rawMembers : ['佳'];
    return list
      .map((m) => {
        const badge = getMemberBadge(m, members);
        const color = getMemberColor(m, members);
        return `<span style="display:inline-block;padding:2px 7px;margin-right:5px;font-size:11px;font-weight:bold;line-height:1.4;border-radius:6px;background-color:${color.bg};color:${color.text};">${badge}</span>`;
      })
      .join('');
  };

  // 按日期聚合未来两周事项
  const groupedUpcoming: Record<string, TodoItem[]> = {};
  upcomingTodos.forEach((item) => {
    if (!groupedUpcoming[item.date]) {
      groupedUpcoming[item.date] = [];
    }
    groupedUpcoming[item.date].push(item);
  });

  const sortedUpcomingDates = Object.keys(groupedUpcoming).sort();

  // HTML 主体构建
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
  <div style="background:linear-gradient(135deg, #ea580c 0%, #f97316 45%, #f59e0b 100%);padding:24px 20px 20px 20px;color:#ffffff;text-align:left;position:relative;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:12px;font-weight:600;letter-spacing:1px;background:rgba(255,255,255,0.22);padding:3px 10px;border-radius:20px;backdrop-filter:blur(4px);">🏡 亲邻记事 · 家庭事务早报</span>
      <span style="font-size:11px;opacity:0.9;">未来两周速览</span>
    </div>

    <h1 style="margin:10px 0 6px 0;font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">
      ☀️ ${formattedTodayDate} ${weekdayStr}
    </h1>
    <p style="margin:0 0 16px 0;font-size:13px;opacity:0.92;line-height:1.5;">
      早安！今日事，今日毕，祝今天也是从容温馨的一天。
    </p>

    <!-- 概览数据三联胶囊 -->
    <div style="display:flex;gap:8px;background:rgba(0,0,0,0.12);padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.18);">
      <div style="flex:1;text-align:center;">
        <div style="font-size:11px;opacity:0.85;">今日待办</div>
        <div style="font-size:18px;font-weight:800;margin-top:2px;">${stats.todayCount}</div>
      </div>
      <div style="width:1px;background:rgba(255,255,255,0.25);margin:2px 0;"></div>
      <div style="flex:1;text-align:center;">
        <div style="font-size:11px;opacity:0.85;">两周日程</div>
        <div style="font-size:18px;font-weight:800;margin-top:2px;">${stats.upcomingCount}</div>
      </div>
      <div style="width:1px;background:rgba(255,255,255,0.25);margin:2px 0;"></div>
      <div style="flex:1;text-align:center;">
        <div style="font-size:11px;opacity:0.85;">逾期未办</div>
        <div style="font-size:18px;font-weight:800;margin-top:2px;color:${stats.overdueCount > 0 ? '#ffedd5' : '#ffffff'};">${stats.overdueCount}</div>
      </div>
    </div>
  </div>

  <div style="padding:20px 18px;background:#fdfcf9;">
`;

  // 2. 逾期提醒（仅在有逾期事项时出现）
  if (overdueTodos.length > 0) {
    html += `
    <!-- 逾期卡片 -->
    <div style="margin-bottom:20px;background:#fff1f2;border:1px solid #fecdd3;border-radius:14px;padding:14px 16px;">
      <div style="font-size:13px;font-weight:700;color:#e11d48;margin-bottom:10px;display:flex;align-items:center;">
        <span>⚠️ 逾期未办提醒 (${overdueTodos.length} 项)</span>
      </div>
      <div style="space-y:8px;">
    `;

    overdueTodos.forEach((t) => {
      const diffDays = Math.abs(differenceInCalendarDays(parseISO(t.endDate || t.date), todayObj));
      const rangeText = t.endDate && t.endDate > t.date ? ` (${t.date} ~ ${t.endDate})` : ` (${t.date})`;
      html += `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #fecdd3;">
          <div style="flex:1;margin-right:8px;">
            <div style="margin-bottom:3px;">
              ${renderMemberBadges(t.members)}
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

    html += `
      </div>
    </div>
    `;
  }

  // 3. 今日需办 / 进行中
  html += `
    <!-- 今日待办 -->
    <div style="margin-bottom:22px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #f3f0e6;">
        <span style="font-size:15px;font-weight:800;color:#18181b;">📌 今日重点待办</span>
        <span style="font-size:11px;font-weight:600;color:#f97316;background:#fff7ed;padding:2px 8px;border-radius:10px;">${stats.todayCount} 项</span>
      </div>
  `;

  if (todayTodos.length === 0) {
    html += `
      <div style="padding:16px;background:#f8f7f2;border-radius:12px;text-align:center;color:#71717a;font-size:13px;">
        ✨ 今天暂时没有待办事项，喝杯清茶，轻松享受美好的一天吧！
      </div>
    `;
  } else {
    todayTodos.forEach((t) => {
      const isMultiDay = Boolean(t.endDate && t.endDate > t.date);
      html += `
        <div style="background:#ffffff;border:1px solid #eeeae1;border-radius:12px;padding:12px 14px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;">
            <div style="flex:1;">
              <div style="margin-bottom:4px;">
                ${renderMemberBadges(t.members)}
                <span style="font-size:14px;font-weight:700;color:#18181b;">${t.title}</span>
              </div>
              ${
                isMultiDay
                  ? `<div style="font-size:11px;color:#f97316;margin-top:4px;">🗓️ 连续时间段：${t.date.slice(5)} 至 ${t.endDate!.slice(5)} (今天在办理期内)</div>`
                  : `<div style="font-size:11px;color:#71717a;margin-top:2px;">今日需办理</div>`
              }
            </div>
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ea580c;margin-top:6px;"></span>
          </div>
        </div>
      `;
    });
  }

  html += `
    </div>
  `;

  // 4. 未来两周日程时间线
  html += `
    <!-- 未来两周日程 -->
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
      const targetDate = parseISO(dateKey);
      const diff = differenceInCalendarDays(targetDate, todayObj);
      let dayTitle = '';
      if (diff === 1) dayTitle = '明天';
      else if (diff === 2) dayTitle = '后天';
      else if (diff <= 7) dayTitle = `本周 ${weekdayMap[targetDate.getDay()]}`;
      else dayTitle = `下周 ${weekdayMap[targetDate.getDay()]}`;

      const dateBadge = `${format(targetDate, 'M月d日')} · ${dayTitle}`;
      const itemsOnDate = groupedUpcoming[dateKey];

      html += `
        <div style="margin-bottom:12px;background:#ffffff;border:1px solid #eae6dc;border-radius:12px;overflow:hidden;">
          <div style="background:#f9f8f4;padding:6px 12px;font-size:12px;font-weight:700;color:#52525b;border-bottom:1px solid #f0ede6;display:flex;align-items:center;justify-content:space-between;">
            <span>📅 ${dateBadge}</span>
            <span style="font-size:10px;font-weight:normal;color:#a1a1aa;">距今 ${diff} 天</span>
          </div>
          <div style="padding:8px 12px;">
      `;

      itemsOnDate.forEach((t) => {
        const isMultiDay = Boolean(t.endDate && t.endDate > t.date);
        html += `
          <div style="padding:6px 0;display:flex;align-items:center;justify-content:space-between;border-bottom:1px dashed #f4f2eb;">
            <div style="flex:1;">
              ${renderMemberBadges(t.members)}
              <span style="font-size:13px;font-weight:600;color:#27272a;">${t.title}</span>
              ${
                isMultiDay
                  ? `<span style="font-size:10px;color:#d97706;background:#fef3c7;padding:1px 5px;border-radius:4px;margin-left:4px;">跨至 ${t.endDate!.slice(5)}</span>`
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
        亲邻记事 · 家庭事务中心 · 每日晨间准时送达<br>
        愿您和家人的每一天都井井有条、温馨自在
      </div>
    </div>

  </div>
</div>

</body>
</html>
  `.trim();

  const title = `【家庭早报】今日需办 ${stats.todayCount} 件，两周待办 ${stats.upcomingCount} 件`;

  return {
    title,
    html,
    stats,
  };
}
