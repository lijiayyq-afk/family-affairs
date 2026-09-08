import { TodoItem } from '../types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export class SyncService {
  private static debounceTimer: any = null;

  /**
   * 从云端拉取待办事项列表
   */
  static async fetchCloudTodos(): Promise<{ success: boolean; data?: TodoItem[]; error?: string }> {
    try {
      const res = await fetch('/api/todos', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        return { success: false, error: `云端同步服务异常 (${res.status})` };
      }

      const json = await res.json();
      if (json.code === 200 && Array.isArray(json.data)) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json.msg || '数据解析异常' };
    } catch (e: any) {
      return { success: false, error: e.message || '网络连接超时' };
    }
  }

  /**
   * 将待办事项保存同步到云端 (带防抖)
   */
  static triggerCloudSync(todos: TodoItem[], onStatusChange?: (status: SyncStatus) => void): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (onStatusChange) onStatusChange('syncing');

    this.debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch('/api/todos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(todos),
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
   * 智能合并本地与云端数据：
   * 1. 优先以 ID 唯一识别
   * 2. 两端都有的新增项全部保留
   * 3. 冲突项以创建时间或存在为准
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
}
