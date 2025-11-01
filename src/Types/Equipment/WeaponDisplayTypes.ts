/**
 * 🎨 武器顯示資料類型定義
 * 用於客戶端UI顯示，不包含服務器邏輯
 */

import { ModifierType } from './WeaponPropertyTypes';

/**
 * 武器完整顯示資料
 * 用於物品詳情面板、背包系統等
 */
export interface WeaponDisplayData {
    // === 基本資訊 ===
    uniqueId: string;
    weaponId: string;
    name: string;
    description: string;
    rarity: string;
    level: number;
    exp: number;
    expToNext: number;
    isEquipped: boolean;

    // === 基礎屬性 ===
    baseStats: {
        damage: number;
        attackSpeed: number;
        attackRange: number;
        critRate: number;
        critDamage: number;
    };

    // === 四維屬性 ===
    attributes: {
        strength: number;
        intelligence: number;
        agility: number;
        vitality: number;
    };

    // === 🆕 狀態效果列表（fixedProperties） ===
    statusEffects: StatusEffectDisplay[];

    // === 🆕 武器詞綴列表（modifiers） ===
    weaponModifiers: WeaponModifierDisplay[];

    // === 🆕 屬性加成列表（bonuses） ===
    attributeBonuses: AttributeBonusDisplay[];

    // === 其他資訊 ===
    tags: string[];
    weaponType: string;
    sellPrice: number;
}

/**
 * 狀態效果顯示資料
 */
export interface StatusEffectDisplay {
    id: string;
    displayName: string;
    description: string;
    icon?: string;

    // 數值資訊
    probability: number;      // 觸發機率
    duration: number;         // 持續時間
    damage?: number;          // 傷害（如果有）
    value?: number;           // 其他數值（緩速%、擊退距離等）

    // 視覺資訊
    category: string;         // ailment, movement, damage, utility
    tags: string[];
}

/**
 * 武器詞綴顯示資料
 */
export interface WeaponModifierDisplay {
    id: string;
    displayName: string;
    description: string;
    icon?: string;

    // 數值資訊
    value: number;            // 數值
    valueType: string;        // percentage, flat, count
    modifierType: ModifierType; // FLAT, INCREASED, MORE
    affectedStat: string;     // 影響的屬性

    // 格式化顯示文字
    formattedText: string;    // 例如 "穿透 +2", "暴擊率 +15%"

    // 視覺資訊
    category: string;
    tags: string[];
}

/**
 * 屬性加成顯示資料
 */
export interface AttributeBonusDisplay {
    id: string;
    displayName: string;
    description: string;
    icon?: string;

    // 數值資訊
    value: number;
    modifierType: ModifierType;
    affectedStat: string;

    // 格式化顯示文字
    formattedText: string;    // 例如 "+10 力量", "+15% 攻擊速度"

    // 視覺資訊
    category: string;
    tags: string[];
}

/**
 * 武器比較資料（用於裝備對比）
 */
export interface WeaponComparisonData {
    current: WeaponDisplayData | null;
    new: WeaponDisplayData;

    // 屬性差異
    statDifferences: {
        [key: string]: {
            current: number;
            new: number;
            difference: number;
            isIncrease: boolean;
        };
    };
}
