/**
 * 素材系統類型定義 (服務端版本)
 * 用於定義遊戲中的製作材料配置
 */

import { EquipmentQuality } from "./EquipmentTypes";
/**
 * 素材分類
 */
export enum MaterialCategory {
    ESSENCE = 'essence',     // 元素精華
    ORE = 'ore',            // 礦石
    SPECIAL = 'special',    // 特殊材料
    CHIP = 'chip',         // 碎片
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
    composite?: string;             // 碎片自動合成的成品
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
    materialId: string;
    probability: number;           // 掉落機率 (0-100)
    minQuantity: number;          // 最小數量
    maxQuantity: number;          // 最大數量
    enemyLevelRequirement: number; // 敵人等級需求
}
