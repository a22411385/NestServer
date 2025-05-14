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
