export class LevelUtils {
  // 傳進來經驗表，例如 [0, 100, 300, 600, 1000, ...]
  static expTable: number[] = [];

  static load(expTable: number[]) {
    this.expTable = expTable;
  }

  static getLevelByExp(exp: number): number {
    for (let i = this.expTable.length - 1; i >= 0; i--) {
      if (exp >= this.expTable[i]) return i + 1; // 等級從 1 開始
    }
    return 1;
  }
}
