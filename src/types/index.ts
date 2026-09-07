// 家庭成员
export interface Member {
  id: string;
  name: string;
  relation: string;     // 关系/称谓
  color: string;        // 标志色
  avatarType: 'emoji' | 'image';
  avatarValue: string;  // emoji 字符或照片 Base64
}

// 核心事务（精确到天，极其精炼，无冗余时间维度）
export interface AffairItem {
  id: string;
  title: string;
  note?: string;         // 备注细节
  memberId: string;      // 责任人
  category: string;      // 分类：就医、缴费、采购、教育、杂事
  date: string;          // 执行日期：YYYY-MM-DD
  priority?: 'urgent' | 'normal'; // 仅保留常规与紧急
  recurring?: 'none' | 'weekly' | 'monthly' | 'yearly';
  remindWechat?: boolean; // 是否发送微信提醒
  done: boolean;
  completedAt?: string;
  createdAt: string;
}

// PushPlus 微信配置
export interface PushPlusConfig {
  token: string;
  topic?: string;
}

// 视图模式：待办、日历、家庭
export type ViewTab = 'todos' | 'calendar' | 'family';
