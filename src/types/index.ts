// 核心家庭成员单字标志：我=佳、配偶=娟、小宝=线、大宝=笑、爷爷=爷、奶奶=奶
export const MEMBERS = ['佳', '娟', '线', '笑', '爷', '奶'] as const;
export type FamilyMember = typeof MEMBERS[number] | '我' | '配偶' | '小宝' | '大宝' | '爷爷' | '奶奶';

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

export function getMemberBadge(m: string): string {
  return MEMBER_CONFIG[m]?.badge || m;
}

export function getMemberLabel(m: string): string {
  return MEMBER_CONFIG[m]?.label || m;
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

// 主视图：待办列表 | 日历视图
export type ActiveTab = 'todos' | 'calendar';
