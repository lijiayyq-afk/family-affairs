// 成员专属颜色配置（手帐温润质感）
export interface MemberColor {
  bg: string;
  text: string;
  dot: string;
}

// 动态人员数据模型
export interface MemberItem {
  id: string;     // 唯一标识，如 'm_jia', 'm_1725849201'
  badge: string;  // 1-2个字的标志，如 '佳', '娟', '线', '笑', '爷', '奶', '姨'
  role: string;   // 称呼关系，如 '我', '配偶', '小宝', '大宝', '爷爷', '奶奶', '阿姨'
  color: MemberColor;
}

// 9 款精选手帐清新高颜值调色板
export const PRESET_COLORS: { name: string; color: MemberColor }[] = [
  { name: '石墨墨灰', color: { bg: '#f1f5f9', text: '#334155', dot: '#475569' } },
  { name: '甜桃樱粉', color: { bg: '#fdf2f8', text: '#9d174d', dot: '#db2777' } },
  { name: '暖阳橙麦', color: { bg: '#fff7ed', text: '#9a3412', dot: '#ea580c' } },
  { name: '森木翠绿', color: { bg: '#f0fdf4', text: '#166534', dot: '#16a34a' } },
  { name: '静海靛蓝', color: { bg: '#eef2ff', text: '#3730a3', dot: '#4f46e5' } },
  { name: '浅杏鹅黄', color: { bg: '#fefce8', text: '#854d0e', dot: '#ca8a04' } },
  { name: '紫藤罗兰', color: { bg: '#faf5ff', text: '#6b21a8', dot: '#9333ea' } },
  { name: '薄荷清泉', color: { bg: '#f0fdfa', text: '#115e59', dot: '#0d9488' } },
  { name: '活力珊瑚', color: { bg: '#fff1f2', text: '#9f1239', dot: '#e11d48' } },
];

// 默认初始 6 位核心家庭成员（我=佳、配偶=娟、小宝=线、大宝=笑、爷爷=爷、奶奶=奶）
export const DEFAULT_MEMBERS: MemberItem[] = [
  { id: 'm_jia', badge: '佳', role: '我', color: PRESET_COLORS[0].color },
  { id: 'm_juan', badge: '娟', role: '配偶', color: PRESET_COLORS[1].color },
  { id: 'm_xian', badge: '线', role: '小宝', color: PRESET_COLORS[2].color },
  { id: 'm_xiao', badge: '笑', role: '大宝', color: PRESET_COLORS[3].color },
  { id: 'm_ye', badge: '爷', role: '爷爷', color: PRESET_COLORS[4].color },
  { id: 'm_nai', badge: '奶', role: '奶奶', color: PRESET_COLORS[5].color },
];

// 历史向下兼容常量
export const MEMBERS = ['佳', '娟', '线', '笑', '爷', '奶'] as const;
export type FamilyMember = string;

export const MEMBER_CONFIG: Record<string, { badge: string; label: string; desc: string }> = {
  佳: { badge: '佳', label: '佳 (我)', desc: '我' },
  我: { badge: '佳', label: '佳 (我)', desc: '我' },
  娟: { badge: '娟', label: '娟 (配偶)', desc: '配偶' },
  配偶: { badge: '娟', label: '娟 (配偶)', desc: '配偶' },
  线: { badge: '线', label: '线 (小宝)', desc: '小宝' },
  小宝: { badge: '线', label: '线 (小宝)', desc: '小宝' },
  笑: { badge: '笑', label: '笑 (大宝)', desc: '大宝' },
  大宝: { badge: '笑', label: '笑 (大宝)', desc: '大宝' },
  爷: { badge: '爷', label: '爷 (爷爷)', desc: '爷爷' },
  爷爷: { badge: '爷', label: '爷 (爷爷)', desc: '爷爷' },
  奶: { badge: '奶', label: '奶 (奶奶)', desc: '奶奶' },
  奶奶: { badge: '奶', label: '奶 (奶奶)', desc: '奶奶' },
};

// 辅助函数：根据成员列表或静态配置解析 badge
export function getMemberBadge(m: string, members?: MemberItem[]): string {
  if (!m) return '佳';
  if (members && members.length > 0) {
    const found = members.find((item) => item.badge === m || item.role === m || item.id === m);
    if (found) return found.badge;
  }
  return MEMBER_CONFIG[m]?.badge || m;
}

export function getMemberLabel(m: string, members?: MemberItem[]): string {
  if (!m) return '佳 (我)';
  if (members && members.length > 0) {
    const found = members.find((item) => item.badge === m || item.role === m || item.id === m);
    if (found) return `${found.badge} (${found.role})`;
  }
  return MEMBER_CONFIG[m]?.label || m;
}

export function getMemberColor(m: string, members?: MemberItem[]): MemberColor {
  if (members && members.length > 0) {
    const found = members.find((item) => item.badge === m || item.role === m || item.id === m);
    if (found && found.color && found.color.bg) return found.color;
  }
  const badge = getMemberBadge(m, members);
  const defaultFound = DEFAULT_MEMBERS.find((item) => item.badge === badge);
  return defaultFound && defaultFound.color && defaultFound.color.bg ? defaultFound.color : PRESET_COLORS[0].color;
}

// 核心待办事项（支持关联多个人、单日或跨多天时间段）
export interface TodoItem {
  id: string;
  title: string;
  members: FamilyMember[]; // 支持关联多个人（多选）
  date: string;            // 开始日期：YYYY-MM-DD
  endDate?: string;        // 连续多天时的结束日期：YYYY-MM-DD (可选)
  done: boolean;
  remindWechat?: boolean;
  createdAt: string;
}

// 防误删：回收站事项模型（携带删除时间戳）
export interface DeletedTodoItem extends TodoItem {
  deletedAt: string; // ISO 8601 删除时间
}

// 主视图：待办列表 | 日历视图
export type ActiveTab = 'todos' | 'calendar';
