/**
 * 道具系統類型定義
 * 整合自 interface.ts 和 ItemData.ts 的所有接口
 */

import { RarityType } from "../BaseTypes";

/**
 * 掉落道具接口
 */
export interface LootItem {
    itemId: string;
    dropRate: number;
    quantityMin: number;
    quantityMax: number;
}

/**
 * 掉落組接口
 */
export interface LootGroup {
    groupId: string;
    type: 'PickOne' | 'RollEach';  // 群組型態
    lootItems: LootItem[];
}

/**
 * 怪物掉落接口
 */
export interface MonsterLoot {
    monsterId: string;
    lootGroups: LootGroup[];
}

/**
 * 基礎道具接口
 */
export interface IItemBase {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: RarityType;
    stackable: boolean;
    maxStack: number;
    value: number;  // 價值/售價
}

/**
 * 道具類型枚舉
 */
export enum ItemType {
    CONSUMABLE = "consumable",
    MATERIAL = "material",
    QUEST = "quest",
    EQUIPMENT = "equipment",
    WEAPON = "weapon",
    CURRENCY = "currency"
}

/**
 * 消耗品效果接口
 */
export interface ConsumableEffect {
    type: 'heal' | 'mana' | 'buff' | 'debuff' | 'cure';
    value: number;
    duration?: number;  // 持續時間（毫秒）
    target: 'self' | 'ally' | 'enemy' | 'area';
}

/**
 * 消耗品道具接口
 */
export interface ConsumableItem extends IItemBase {
    type: ItemType.CONSUMABLE;
    effects: ConsumableEffect[];
    cooldown: number;  // 冷卻時間
    usageLimit?: number;  // 使用次數限制
}

/**
 * 材料道具接口
 */
export interface MaterialItem extends IItemBase {
    type: ItemType.MATERIAL;
    category: 'ore' | 'herb' | 'gem' | 'essence' | 'bone' | 'cloth';
    grade: number;  // 品級
}

/**
 * 任務道具接口
 */
export interface QuestItem extends IItemBase {
    type: ItemType.QUEST;
    questId: string;
    autoUse: boolean;  // 是否自動使用
}

/**
 * 道具掉落選項接口
 */
export interface DropOptions {
    baseRate: number;
    rateModifier: number;
    guaranteedDrop?: boolean;
    maxQuantity: number;
    minQuantity: number;
}

/**
 * 隨機詞綴數據接口
 */
export interface RandomAffixData {
    id: string;
    name: string;
    type: 'prefix' | 'suffix';
    tier: number;
    weight: number;
    effects: Record<string, number>;
    requirements?: {
        itemType?: ItemType[];
        minLevel?: number;
        maxLevel?: number;
    };
}

/**
 * 道具生成配置接口
 */
export interface ItemGenerationConfig {
    baseItemId: string;
    level: number;
    quality: number;  // 品質 0-100
    affixCount: {
        min: number;
        max: number;
    };
    rarityWeights: Record<RarityType, number>;
}
