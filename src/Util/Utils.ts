import { ExperienceData } from "src/Game/Combat/UnitData";

export class LevelUtils {
  // 傳進來經驗表，例如 [0, 100, 300, 600, 1000, ...]
  static expTable: ExperienceData[] = [];

  static load(expTable: ExperienceData[]) {
    this.expTable = expTable;
  }

  static getLevelByExp(exp: number): number {
    let lv = 1;
    for (let i = 0; i < this.expTable.length; i++) {
      if (exp >= this.expTable[i].TotalExp)
        lv = i + 1;
    }
    return lv;
  }


}
type Task = {
  key: string;
  interval: number;
  lastExec: number;
  action: () => void;
};

export class TimeScheduler {
  private tasks: Task[] = [];

  addTask(key: string, interval: number, action: () => void) {
    this.tasks.push({ key, interval, lastExec: 0, action });
  }

  update(now: number) {
    for (const task of this.tasks) {
      if (now - task.lastExec >= task.interval) {
        task.lastExec = now;
        task.action();
      }
    }
  }
}

export function delay(seconds: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, seconds * 1000);
  });
}