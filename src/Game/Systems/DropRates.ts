/**
 * 物品掉落機率配置
 */

export interface DropRateConfig {
    itemId: string;
    baseDropRate: number;    // 基礎掉落機率 (0-1)
    quantityMin: number;     // 最小掉落數量
    quantityMax: number;     // 最大掉落數量
    levelRequirement?: number; // 等級需求
    areaMultiplier?: number;   // 區域倍率
}

export interface DropTableConfig {
    mobType: string;
    level: number;
    dropRates: DropRateConfig[];
}

/**
 * 基於物品稀有度的基礎掉落機率表
 */
export const RARITY_DROP_RATES = {
    common: 0.3,      // 30% 基礎機率
    uncommon: 0.15,   // 15% 基礎機率
    rare: 0.05,       // 5% 基礎機率
    epic: 0.01,       // 1% 基礎機率
    legendary: 0.001  // 0.1% 基礎機率
} as const;

/**
 * 基於物品類型的掉落機率調整
 */
export const TYPE_DROP_MULTIPLIERS = {
    CURRENCY: 0,    // 貨幣類較容易掉落
    MATERIAL: 0,    // 材料類正常掉落
    CONSUMABLE: 0,  // 消耗品稍微困難
    MISC: 0         // 雜項物品較困難
} as const;

/**
 * 分類特殊倍率
 */
export const CATEGORY_MULTIPLIERS: Record<string, number> = {
    // 基礎材料：較高掉落率
    'ore': 1.2,
    'crafting': 1.5,
    'herb': 1.3,

    // 中等稀有度
    'potion': 0.8,
    'food': 1.0,
    'currency': 1.5,

    // 稀有物品：較低掉落率
    'magic': 0.5,
    'rare_drop': 0.2,
    'buff': 0.6,
    'gem': 0.3,
    'artifact': 0.1,

    // 功能性物品
    'scroll': 0.7,
    'key': 0.4,
    'quest': 0.5
};

/**
 * 基於稀有度的等級需求
 */
export const RARITY_LEVEL_REQUIREMENTS = {
    common: 1,
    uncommon: 5,
    rare: 15,
    epic: 25,
    legendary: 40
} as const;

/**
 * 武器掉落配置
 */
export const WEAPON_DROP_CONFIG = {
    baseDropRate: 0.6,      // 基礎5%掉落率
    levelMultiplier: 0.002,  // 每級增加0.2%
    maxDropRate: 1,        // 最大10%掉落率
    qualityRates: {
        'common': 0.6,       // 60%
        'uncommon': 0.25,    // 25%
        'rare': 0.1,         // 10%
        'epic': 0.04,        // 4%
        'legendary': 0.01    // 1%
    }
} as const;

/**
 * 經驗值和金幣掉落配置
 */
export const BASIC_DROP_CONFIG = {
    exp: {
        baseAmount: 10,      // 基礎經驗值
        levelMultiplier: 1,  // 等級倍率
        randomRange: 20      // 隨機範圍
    },
    gold: {
        baseAmount: 5,       // 基礎金幣
        levelMultiplier: 1,  // 等級倍率
        randomRange: 15,     // 隨機範圍
        dropRate: 0.8        // 80%掉落率
    }
} as const;
