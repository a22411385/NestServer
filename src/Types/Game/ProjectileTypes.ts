/**
 * 投射物配置系統類型定義
 * 用於管理豐富的美術資源和遊戲邏輯
 */

/**
 * 🆕 彈藥覆蓋配置
 * 用於武器覆蓋彈藥的默認配置（強化系統、品質系統）
 */
export interface AmmoOverrideConfig {
    pierceCount?: number;       // 穿透次數
    areaOfEffect?: number;      // 範圍效果半徑
    bounceCount?: number;       // 彈跳次數
    collisionRadius?: number;   // 碰撞半徑
}
