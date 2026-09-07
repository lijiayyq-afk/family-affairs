import { AffairItem, Member, PushPlusConfig } from '../types';
import { INITIAL_MEMBERS, getInitialAffairs, INITIAL_PUSHPLUS } from '../constants/initialData';

const KEYS = {
  AFFAIRS: 'family_affairs_items_v2',
  MEMBERS: 'family_affairs_members_v2',
  PUSHPLUS: 'family_affairs_pushplus_v2',
};

export class StorageService {
  static getAffairs(): AffairItem[] {
    try {
      const data = localStorage.getItem(KEYS.AFFAIRS);
      return data ? JSON.parse(data) : getInitialAffairs();
    } catch {
      return getInitialAffairs();
    }
  }

  static saveAffairs(items: AffairItem[]): void {
    try {
      localStorage.setItem(KEYS.AFFAIRS, JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
  }

  static getMembers(): Member[] {
    try {
      const data = localStorage.getItem(KEYS.MEMBERS);
      return data ? JSON.parse(data) : INITIAL_MEMBERS;
    } catch {
      return INITIAL_MEMBERS;
    }
  }

  static saveMembers(members: Member[]): void {
    try {
      localStorage.setItem(KEYS.MEMBERS, JSON.stringify(members));
    } catch (e) {
      console.error(e);
    }
  }

  static getPushPlusConfig(): PushPlusConfig {
    try {
      const data = localStorage.getItem(KEYS.PUSHPLUS);
      return data ? JSON.parse(data) : INITIAL_PUSHPLUS;
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

  static exportBackup(): void {
    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      affairs: this.getAffairs(),
      members: this.getMembers(),
      pushPlus: this.getPushPlusConfig(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `家庭事务备份_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  static importBackup(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.affairs) && Array.isArray(data.members)) {
        this.saveAffairs(data.affairs);
        this.saveMembers(data.members);
        if (data.pushPlus) this.savePushPlusConfig(data.pushPlus);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  static resetToDefault(): void {
    localStorage.removeItem(KEYS.AFFAIRS);
    localStorage.removeItem(KEYS.MEMBERS);
    localStorage.removeItem(KEYS.PUSHPLUS);
  }
}
