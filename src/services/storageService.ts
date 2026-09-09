import { TodoItem, MemberItem, DeletedTodoItem, DEFAULT_MEMBERS, PRESET_COLORS, MEMBER_CONFIG } from '../types';
import { getInitialTodos } from '../constants/initialData';

// 永久固定的主键，永远不再更改
const PRIMARY_KEY = 'family_affairs_todos_master';
const MEMBERS_PRIMARY_KEY = 'family_affairs_members_master';
const RECYCLE_BIN_KEY = 'family_affairs_recycle_bin';
const HAS_INITIALIZED_KEY = 'family_affairs_has_initialized';

// 历史曾经使用过的键名，按新到旧排列，用于升级时自动抢救迁移数据
const LEGACY_KEYS = [
  'family_todos_v4',
  'family_todos_v3',
  'family_todos_v2',
  'family_todos_v1',
  'family_affairs_todos',
];

// 成员数据格式归一化清洗与安全防护（彻底杜绝undefined属性引发白屏）
export function normalizeMembers(items: any[]): MemberItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    return DEFAULT_MEMBERS;
  }

  return items.map((item: any, idx: number) => {
    // 兼容历史纯字符串格式，如 ['佳', '娟', '小宝']
    if (typeof item === 'string') {
      const defaultMatched = DEFAULT_MEMBERS.find((d) => d.badge === item || d.role === item);
      if (defaultMatched) return { ...defaultMatched };
      const fallbackColor = PRESET_COLORS[idx % PRESET_COLORS.length].color;
      return {
        id: `m_${idx}_${Date.now()}`,
        badge: item.slice(0, 2),
        role: MEMBER_CONFIG[item]?.desc || item,
        color: fallbackColor,
      };
    }

    // 对象格式清洗与兜底
    const badge = (item.badge || item.name || '佳').toString().trim().slice(0, 2) || '佳';
    const role = (item.role || MEMBER_CONFIG[badge]?.desc || '家人').toString().trim();
    const id = item.id || `m_${idx}_${Date.now()}`;

    // 严密检查 color 属性完整性
    let color = item.color;
    if (!color || typeof color !== 'object' || !color.bg || !color.text) {
      const defaultMatched = DEFAULT_MEMBERS.find((d) => d.badge === badge);
      if (defaultMatched && defaultMatched.color && defaultMatched.color.bg) {
        color = defaultMatched.color;
      } else {
        color = PRESET_COLORS[idx % PRESET_COLORS.length].color;
      }
    }

    return {
      id,
      badge,
      role,
      color: {
        bg: color.bg || '#f1f5f9',
        text: color.text || '#334155',
        dot: color.dot || '#475569',
      },
    };
  });
}

// 历史三条默认示例的特征特征库（彻底过滤，绝不再次塞入或复活）
export const MOCK_TITLES = new Set([
  '陪爷爷去医院配慢病药',
  '交家里水电气费',
  '买家里的米面油和抽纸',
]);
export const MOCK_IDS = new Set(['1', '2', '3']);

export function isMockTodo(item: any): boolean {
  if (!item) return false;
  const title = (item.title || '').trim();
  const id = String(item.id || '');
  if (MOCK_IDS.has(id) && MOCK_TITLES.has(title)) return true;
  if (MOCK_TITLES.has(title)) return true;
  return false;
}

// 数据格式归一化清洗
function normalizeTodos(items: any[]): TodoItem[] {
  if (!Array.isArray(items)) return [];
  // 彻底过滤掉任何历史残留的示例 mock 数据
  const filtered = items.filter((item) => !isMockTodo(item));

  return filtered.map((item: any) => {
    return {
      id: item.id || `todo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: item.title || '未命名事项',
      members: Array.isArray(item.members) && item.members.length > 0 
        ? item.members 
        : item.member ? [item.member] : ['佳'],
      date: item.date || new Date().toISOString().slice(0, 10),
      endDate: item.endDate && item.endDate > (item.date || '') ? item.endDate : undefined,
      done: Boolean(item.done),
      remindWechat: Boolean(item.remindWechat),
      createdAt: item.createdAt || new Date().toISOString(),
    };
  });
}

// 回收站事项数据清洗
function normalizeDeletedTodos(items: any[]): DeletedTodoItem[] {
  if (!Array.isArray(items)) return [];
  const validTodos = normalizeTodos(items);
  return validTodos.map((t, idx) => {
    const raw = items[idx];
    return {
      ...t,
      deletedAt: raw?.deletedAt || new Date().toISOString(),
    };
  });
}


export class StorageService {
  /**
   * 读取待办事项：
   * 1. 优先读取永久主键 PRIMARY_KEY（自动滤除历史残留 mock）
   * 2. 若为空，扫描历史旧版本残留数据并清洗
   * 3. 彻底禁用任何自动塞入 mock 数据的行为，无待办时直接保持空列表 []
   */
  static getTodos(): TodoItem[] {
    try {
      // 1. 检查永久主键
      const masterRaw = localStorage.getItem(PRIMARY_KEY);
      if (masterRaw) {
        const parsed = JSON.parse(masterRaw);
        if (Array.isArray(parsed)) {
          const cleaned = normalizeTodos(parsed);
          // 如果清洗掉了残留的 mock 数据，写回更新
          if (cleaned.length !== parsed.length) {
            this.saveTodos(cleaned);
          }
          return cleaned;
        }
      }

      // 2. 检查是否有历史版本残留的数据，执行清洗与迁移
      for (const legacyKey of LEGACY_KEYS) {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) {
          try {
            const parsed = JSON.parse(legacyRaw);
            if (Array.isArray(parsed)) {
              const rescued = normalizeTodos(parsed);
              this.saveTodos(rescued);
              localStorage.setItem(HAS_INITIALIZED_KEY, 'true');
              // 清理历史残留键，防止再次触发
              localStorage.removeItem(legacyKey);
              return rescued;
            }
          } catch {
            // ignore
          }
        }
      }

      // 3. 无论如何，初始化后不再向用户强塞任何 mock 数据
      localStorage.setItem(HAS_INITIALIZED_KEY, 'true');
      this.saveTodos([]);
      return [];
    } catch (e) {
      console.error('[StorageService] 读取数据异常:', e);
      return [];
    }
  }

  /**
   * 保存待办数据到永久主键中
   */
  static saveTodos(todos: TodoItem[]): void {
    try {
      localStorage.setItem(PRIMARY_KEY, JSON.stringify(todos));
      localStorage.setItem(HAS_INITIALIZED_KEY, 'true');
    } catch (e) {
      console.error('[StorageService] 保存数据失败:', e);
    }
  }

  /**
   * 读取家庭成员列表：
   * 1. 优先从 MEMBERS_PRIMARY_KEY 获取并严格经过 normalizeMembers 清洗兜底
   * 2. 若无则初始化为 DEFAULT_MEMBERS 并写入本地
   */
  static getMembers(): MemberItem[] {
    try {
      const raw = localStorage.getItem(MEMBERS_PRIMARY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = normalizeMembers(parsed);
          // 如果解析出的数据有缺损并被修复，顺便写回以持久纠错
          return normalized;
        }
      }
      // 默认初始化
      this.saveMembers(DEFAULT_MEMBERS);
      return DEFAULT_MEMBERS;
    } catch (e) {
      console.error('[StorageService] 读取成员失败:', e);
      return DEFAULT_MEMBERS;
    }
  }

  /**
   * 保存家庭成员列表
   */
  static saveMembers(members: MemberItem[]): void {
    try {
      const safeMembers = normalizeMembers(members);
      localStorage.setItem(MEMBERS_PRIMARY_KEY, JSON.stringify(safeMembers));
    } catch (e) {
      console.error('[StorageService] 保存成员失败:', e);
    }
  }

  /**
   * 读取回收站事项列表
   */
  static getDeletedTodos(): DeletedTodoItem[] {
    try {
      const raw = localStorage.getItem(RECYCLE_BIN_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return normalizeDeletedTodos(parsed);
        }
      }
      return [];
    } catch (e) {
      console.error('[StorageService] 读取回收站失败:', e);
      return [];
    }
  }

  /**
   * 保存回收站事项列表
   */
  static saveDeletedTodos(items: DeletedTodoItem[]): void {
    try {
      localStorage.setItem(RECYCLE_BIN_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('[StorageService] 保存回收站失败:', e);
    }
  }

  /**
   * 防误删：将事项移入回收站
   */
  static addDeletedTodo(todo: TodoItem): void {
    try {
      const current = this.getDeletedTodos();
      const deletedItem: DeletedTodoItem = {
        ...todo,
        deletedAt: new Date().toISOString(),
      };
      // 最新删除的排在最前
      const updated = [deletedItem, ...current.filter((t) => t.id !== todo.id)];
      this.saveDeletedTodos(updated);
    } catch (e) {
      console.error('[StorageService] 移入回收站失败:', e);
    }
  }

  /**
   * 清空回收站
   */
  static clearRecycleBin(): void {
    try {
      localStorage.removeItem(RECYCLE_BIN_KEY);
    } catch (e) {
      console.error('[StorageService] 清空回收站失败:', e);
    }
  }

  /**
   * 从回收站永久删除单条
   */
  static deletePermanently(id: string): void {
    try {
      const current = this.getDeletedTodos();
      const updated = current.filter((item) => item.id !== id);
      this.saveDeletedTodos(updated);
    } catch (e) {
      console.error('[StorageService] 永久删除失败:', e);
    }
  }

  /**
   * 导出 JSON 数据备份文件（包含事项、人员配置、回收站防误删数据）
   */
  static exportBackup(todos: TodoItem[], members?: MemberItem[]): void {
    try {
      const currentMembers = members || this.getMembers();
      const currentRecycleBin = this.getDeletedTodos();
      const backupData = {
        app: 'family-affairs',
        version: '1.4',
        exportedAt: new Date().toISOString(),
        count: todos.length,
        data: todos,
        members: currentMembers,
        recycleBin: currentRecycleBin,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `家庭事务备份_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[StorageService] 导出失败:', err);
      alert('导出备份失败，请检查浏览器权限');
    }
  }

  /**
   * 导入恢复 JSON 数据
   */
  static importBackup(jsonStr: string): { 
    success: boolean; 
    count?: number; 
    membersCount?: number; 
    recycleCount?: number;
    error?: string 
  } {
    try {
      const parsed = JSON.parse(jsonStr);
      let itemsToImport: any[] = [];
      let membersToImport: MemberItem[] | undefined;
      let recycleToImport: DeletedTodoItem[] | undefined;

      if (Array.isArray(parsed)) {
        itemsToImport = parsed;
      } else if (parsed && Array.isArray(parsed.data)) {
        itemsToImport = parsed.data;
        if (Array.isArray(parsed.members)) {
          membersToImport = parsed.members;
        }
        if (Array.isArray(parsed.recycleBin)) {
          recycleToImport = parsed.recycleBin;
        }
      } else {
        return { success: false, error: '无效的备份文件格式' };
      }

      const normalized = normalizeTodos(itemsToImport);
      this.saveTodos(normalized);

      if (membersToImport && membersToImport.length > 0) {
        const safeMembers = normalizeMembers(membersToImport);
        this.saveMembers(safeMembers);
      }

      if (recycleToImport && recycleToImport.length > 0) {
        const safeRecycle = normalizeDeletedTodos(recycleToImport);
        this.saveDeletedTodos(safeRecycle);
      }

      return { 
        success: true, 
        count: normalized.length, 
        membersCount: membersToImport ? membersToImport.length : undefined,
        recycleCount: recycleToImport ? recycleToImport.length : undefined,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'JSON 解析失败' };
    }
  }

  static clearAll(): void {
    localStorage.removeItem(PRIMARY_KEY);
    localStorage.removeItem(RECYCLE_BIN_KEY);
    localStorage.setItem(HAS_INITIALIZED_KEY, 'true');
  }
}

