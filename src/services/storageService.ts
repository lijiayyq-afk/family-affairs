import { TodoItem, PushPlusConfig } from '../types';
import { getInitialTodos, INITIAL_PUSHPLUS } from '../constants/initialData';

const KEYS = {
  TODOS: 'family_todos_v3',
  PUSHPLUS: 'family_pushplus_v3',
};

export class StorageService {
  static getTodos(): TodoItem[] {
    try {
      const raw = localStorage.getItem(KEYS.TODOS);
      return raw ? JSON.parse(raw) : getInitialTodos();
    } catch {
      return getInitialTodos();
    }
  }

  static saveTodos(todos: TodoItem[]): void {
    try {
      localStorage.setItem(KEYS.TODOS, JSON.stringify(todos));
    } catch (e) {
      console.error(e);
    }
  }

  static getPushPlusConfig(): PushPlusConfig {
    try {
      const raw = localStorage.getItem(KEYS.PUSHPLUS);
      return raw ? JSON.parse(raw) : INITIAL_PUSHPLUS;
    } catch {
      return INITIAL_PUSHPLUS;
    }
  }

  static savePushPlusConfig(config: PushPlusConfig): void {
    try {
      localStorage.setItem(KEYS.PUSHPLUS, JSON.stringify(config));
    } catch (e) {
      console.error(e);
    }
  }

  static clearAll(): void {
    localStorage.removeItem(KEYS.TODOS);
    localStorage.removeItem(KEYS.PUSHPLUS);
  }
}
