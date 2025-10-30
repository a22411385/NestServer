/**
 * 素材系統類型定義 (服務端版本)
 * 用於定義遊戲中的製作材料配置
 */

import { EquipmentQuality } from "./EquipmentTypes";

/**
 * 素材類型枚舉
 */
export enum MaterialType {
    // 元素精華類 (用於製作元素武器)
    POISON_ESSENCE = 'poison_essence',      // 毒素精華
    FROST_ESSENCE = 'frost_essence',        // 冰霜精華
    FLAME_ESSENCE = 'flame_essence',        // 火焰精華
    LIGHTNING_ESSENCE = 'lightning_essence',// 閃電精華
    EXPLOSIVE_ESSENCE = 'explosive_essence',// 爆炸精華

    // 礦石類 (用於製作基礎武器)
    IRON_ORE = 'iron_ore',                 // 鐵礦石
    MITHRIL_ORE = 'mithril_ore',           // 秘銀礦
    ADAMANTITE_ORE = 'adamantite_ore',     // 精金礦

    // 特殊素材 (用於提升成功率或特殊效果)
    WEAPON_SCROLL = 'weapon_scroll',       // 武器卷軸
    BLESSING_STONE = 'blessing_stone',     // 祝福石
}

/**
 * 素材分類
 */
export enum MaterialCategory {
    ESSENCE = 'essence',     // 元素精華
    ORE = 'ore',            // 礦石
    SPECIAL = 'special',    // 特殊材料
}

/**
 * 素材配置定義 (從 google-sheets-cache.json 載入)
 */
export interface MaterialConfigDefinition {
    id: string;                    // 素材ID (對應 MaterialType)
    name: string;                  // 素材名稱
    description: string;           // 素材描述
    rarity: EquipmentQuality;        // 稀有度
    category: MaterialCategory;    // 分類
    stackSize: number;             // 最大堆疊數
    sellPrice: number;             // 出售價格
    baseDropRate: number;          // 基礎掉落率 (百分比 0-100)
    minDropQuantity: number;       // 最小掉落數量
    maxDropQuantity: number;       // 最大掉落數量
    iconPath: string;              // 圖示路徑

    dropFromEnemyLevel: number;    // 從哪個等級的敵人開始掉落
    enabled: boolean;              // 是否啟用
}

/**
 * 素材掉落配置
 */
export interface MaterialDropConfig {
    materialId: MaterialType;
    probability: number;           // 掉落機率 (0-100)
    minQuantity: number;          // 最小數量
    maxQuantity: number;          // 最大數量
    enemyLevelRequirement: number; // 敵人等級需求
}
