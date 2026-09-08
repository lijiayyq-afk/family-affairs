import { TodoItem, MemberItem } from '../types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface CloudDataPayload {
  todos: TodoItem[];
  members?: MemberItem[];
}

export class SyncService {
  private static debounceTimer: any = null;

  /**
   * 从云端拉取待办事项与人员配置
   */
  static async fetchCloudData(): Promise<{ success: boolean; data?: CloudDataPayload; error?: string }> {
    try {
      const res = await fetch('/api/todos', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        return { success: false, error: `云端同步服务异常 (${res.status})` };
      }

      const json = await res.json();
      if (json.code === 200 && json.data) {
        if (Array.isArray(json.data)) {
          return { success: true, data: { todos: json.data } };
        }
        return { 
          success: true, 
          data: { 
            todos: Array.isArray(json.data.todos) ? json.data.todos : [],
            members: Array.isArray(json.data.members) ? json.data.members : undefined
          } 
        };
      }
      return { success: false, error: json.msg || '数据解析异常' };
    } catch (e: any) {
      return { success: false, error: e.message || '网络连接超时' };
    }
  }

  /**
   * 兼容旧版调用的别名
   */
  static async fetchCloudTodos(): Promise<{ success: boolean; data?: TodoItem[]; members?: MemberItem[]; error?: string }> {
    const res = await this.fetchCloudData();
    if (res.success && res.data) {
      return { success: true, data: res.data.todos, members: res.data.members };
    }
    return { success: false, error: res.error };
  }

  /**
   * 将待办事项与成员配置同步到云端 (带防抖)
   */
  static triggerCloudSync(
    todos: TodoItem[], 
    members?: MemberItem[], 
    onStatusChange?: (status: SyncStatus) => void
  ): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (onStatusChange) onStatusChange('syncing');

    this.debounceTimer = setTimeout(async () => {
      try {
        const payload: any = { todos };
        if (members && members.length > 0) {
          payload.members = members;
        }

        const res = await fetch('/api/todos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          if (onStatusChange) onStatusChange('synced');
        } else {
          if (onStatusChange) onStatusChange('error');
        }
      } catch {
        if (onStatusChange) onStatusChange('error');
      }
    }, 600);
  }

  /**
   * 智能合并本地与云端待办事项
   */
  static mergeTodos(local: TodoItem[], cloud: TodoItem[]): TodoItem[] {
    const map = new Map<string, TodoItem>();

    // 先放云端数据
    cloud.forEach((item) => {
      if (item && item.id) {
        map.set(item.id, item);
      }
    });

    // 再用本地数据补充（如果是本地刚操作过的，覆盖或补入）
    local.forEach((item) => {
      if (item && item.id) {
        map.set(item.id, item);
      }
    });

    return Array.from(map.values());
  }

  /**
   * 智能合并本地与云端家庭成员列表
   */
  static mergeMembers(local: MemberItem[], cloud?: MemberItem[]): MemberItem[] {
    if (!cloud || cloud.length === 0) return local;
    const map = new Map<string, MemberItem>();

    // 先放云端
    cloud.forEach((m) => {
      if (m && m.id) {
        map.set(m.id, m);
      }
    });

    // 本地优先覆盖（以便离线修改即时保留）
    local.forEach((m) => {
      if (m && m.id) {
        map.set(m.id, m);
      }
    });

    return Array.from(map.values());
  }
}
