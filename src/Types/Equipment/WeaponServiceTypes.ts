/**
 * 武器服務相關類型定義
 * 用於 WeaponDataService 的類型安全
 */

/**
 * 最終武器屬性（計算後的完整屬性）
 * 包含基礎屬性和從詞綴計算出的所有屬性
 */
export interface FinalWeaponStats {
    // === 核心屬性 ===
    weaponDamage: number;          // 武器傷害
    attackRange: number;           // 攻擊範圍
    attackSpeed: number;           // 攻擊速度

    // === 戰鬥特效屬性 ===
    critRate: number;              // 暴擊率
    critDamage: number;            // 暴擊傷害
    lifeSteal: number;             // 生命偷取

    // === 顯示資訊 ===
    displayName: string;           // 顯示名稱
    rarity: string;                // 稀有度

    // === 動態屬性 ===
    // 從 WeaponStatConfigs 表動態添加的屬性
    // 例如：pierceCount, chainCount, sweepAngle 等
    [key: string]: string | number;
}

/**
 * 屬性計算乘數
 * 用於 POE 風格的屬性計算
 */
export interface AttributeMultipliers {
    damage: number;                // 傷害乘數
    range: number;                 // 範圍加成
    speed: number;                 // 速度乘數
    stats: number;                 // 通用屬性乘數
}
