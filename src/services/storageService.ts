import { TodoItem } from '../types';
import { getInitialTodos } from '../constants/initialData';

const STORAGE_KEY = 'family_todos_v4';

export class StorageService {
  static getTodos(): TodoItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getInitialTodos();

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return getInitialTodos();

      // 兼容旧数据中单成员 member 字段转为 members 数组
      return parsed.map((item: any) => {
        if (!item.members) {
          return {
            ...item,
            members: item.member ? [item.member] : ['我'],
          };
        }
        return item;
      });
    } catch {
      return getInitialTodos();
    }
  }

  static saveTodos(todos: TodoItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (e) {
      console.error(e);
    }
  }

  static clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
