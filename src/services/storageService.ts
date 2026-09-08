import { TodoItem, MemberItem, DEFAULT_MEMBERS } from '../types';
import { getInitialTodos } from '../constants/initialData';

// 永久固定的主键，永远不再更改
const PRIMARY_KEY = 'family_affairs_todos_master';
const MEMBERS_PRIMARY_KEY = 'family_affairs_members_master';
const HAS_INITIALIZED_KEY = 'family_affairs_has_initialized';

// 历史曾经使用过的键名，按新到旧排列，用于升级时自动抢救迁移数据
const LEGACY_KEYS = [
  'family_todos_v4',
  'family_todos_v3',
  'family_todos_v2',
  'family_todos_v1',
  'family_affairs_todos',
];

// 数据格式归一化清洗
function normalizeTodos(items: any[]): TodoItem[] {
  return items.map((item: any) => {
    return {
      id: item.id || `todo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: item.title || '未命名事项',
      members: Array.isArray(item.members) && item.members.length > 0 
        ? item.members 
        : item.member ? [item.member] : ['我'],
      date: item.date || new Date().toISOString().slice(0, 10),
      endDate: item.endDate && item.endDate > (item.date || '') ? item.endDate : undefined,
      done: Boolean(item.done),
      remindWechat: Boolean(item.remindWechat),
      createdAt: item.createdAt || new Date().toISOString(),
    };
  });
}


export class StorageService {
  /**
   * 读取待办事项：
   * 1. 优先读取永久主键 PRIMARY_KEY
   * 2. 若为空，自动扫描所有历史键（v4/v3/v2/v1等）进行数据无缝抢救与自动迁移
   * 3. 若用户曾经使用过（HAS_INITIALIZED_KEY为true），即使事项为空也绝不塞mock数据
   * 4. 仅在有史以来第一次访问的全新浏览器中，才载入初始指引并标记初始化
   */
  static getTodos(): TodoItem[] {
    try {
      // 1. 检查永久主键
      const masterRaw = localStorage.getItem(PRIMARY_KEY);
      if (masterRaw) {
        const parsed = JSON.parse(masterRaw);
        if (Array.isArray(parsed)) {
          return normalizeTodos(parsed);
        }
      }

      // 2. 检查是否有历史版本残留的数据，执行无缝抢救迁移
      for (const legacyKey of LEGACY_KEYS) {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) {
          try {
            const parsed = JSON.parse(legacyRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const rescued = normalizeTodos(parsed);
              // 立即迁移保存到永久主键中
              this.saveTodos(rescued);
              localStorage.setItem(HAS_INITIALIZED_KEY, 'true');
              console.log(`[StorageService] 成功从 ${legacyKey} 抢救并迁移 ${rescued.length} 条数据！`);
              return rescued;
            }
          } catch {
            // 继续尝试其他历史键
          }
        }
      }

      // 3. 检查是否已经初始化过（用户曾用过，但把事项都删完或办完了）
      const hasInitialized = localStorage.getItem(HAS_INITIALIZED_KEY);
      if (hasInitialized === 'true') {
        // 用户已经使用过，保持空列表，绝对不塞入 mock 数据
        return [];
      }

      // 4. 全新用户第一次打开：塞入少量初始示例，并立即标记已初始化
      const initial = getInitialTodos();
      this.saveTodos(initial);
      localStorage.setItem(HAS_INITIALIZED_KEY, 'true');
      return initial;
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
   * 1. 优先从 MEMBERS_PRIMARY_KEY 获取
   * 2. 若无则初始化为 DEFAULT_MEMBERS 并写入本地
   */
  static getMembers(): MemberItem[] {
    try {
      const raw = localStorage.getItem(MEMBERS_PRIMARY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
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
      localStorage.setItem(MEMBERS_PRIMARY_KEY, JSON.stringify(members));
    } catch (e) {
      console.error('[StorageService] 保存成员失败:', e);
    }
  }

  /**
   * 导出 JSON 数据备份文件（包含事项与人员配置）
   */
  static exportBackup(todos: TodoItem[], members?: MemberItem[]): void {
    try {
      const currentMembers = members || this.getMembers();
      const backupData = {
        app: 'family-affairs',
        version: '1.2',
        exportedAt: new Date().toISOString(),
        count: todos.length,
        data: todos,
        members: currentMembers,
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
  static importBackup(jsonStr: string): { success: boolean; count?: number; membersCount?: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      let itemsToImport: any[] = [];
      let membersToImport: MemberItem[] | undefined;

      if (Array.isArray(parsed)) {
        itemsToImport = parsed;
      } else if (parsed && Array.isArray(parsed.data)) {
        itemsToImport = parsed.data;
        if (Array.isArray(parsed.members)) {
          membersToImport = parsed.members;
        }
      } else {
        return { success: false, error: '无效的备份文件格式' };
      }

      const normalized = normalizeTodos(itemsToImport);
      this.saveTodos(normalized);

      if (membersToImport && membersToImport.length > 0) {
        this.saveMembers(membersToImport);
      }

      return { 
        success: true, 
        count: normalized.length, 
        membersCount: membersToImport ? membersToImport.length : undefined 
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'JSON 解析失败' };
    }
  }

  static clearAll(): void {
    localStorage.removeItem(PRIMARY_KEY);
    localStorage.setItem(HAS_INITIALIZED_KEY, 'true');
  }
}

