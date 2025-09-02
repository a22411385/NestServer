/**
 * 裝備系統類型定義
 * 整合自 EquipmentManager.ts 的所有接口和枚舉
 */

import { RarityType, LevelRequirement, Durability } from "../BaseTypes";

/**
 * 裝備類型枚舉
 */
export enum EquipmentType {
    WEAPON = "weapon",
    ARMOR = "armor",
    ACCESSORY = "accessory",
    CONSUMABLE = "consumable"
}

/**
 * 裝備部位枚舉
 */
export enum EquipmentSlot {
    MAIN_HAND = "mainHand",
    OFF_HAND = "offHand",
    HEAD = "head",
    CHEST = "chest",
    LEGS = "legs",
    FEET = "feet",
    RING = "ring",
    NECKLACE = "necklace"
}

/**
 * 裝備屬性加成接口
 */
export interface EquipmentBonus {
    hpBonus?: number;
    mpBonus?: number;
    attackBonus?: number;
    defenseBonus?: number;
    speedBonus?: number;
    hpMultiplier?: number;
    attackMultiplier?: number;
    speedMultiplier?: number;
    mpMultiplier?: number;
    defenseMultiplier?: number;

    // 特殊屬性
    criticalRate?: number;
    dodgeRate?: number;
    blockRate?: number;
    lifeSteal?: number;
    manaSteal?: number;

    // 抗性
    physicalResistance?: number;
    magicalResistance?: number;
    fireResistance?: number;
    iceResistance?: number;
    poisonResistance?: number;
}

/**
 * 裝備數據接口
 */
export interface EquipmentData {
    id: string;
    name: string;
    type: EquipmentType;
    slot?: EquipmentSlot;
    level: number;
    rarity: RarityType;
    bonus: EquipmentBonus;
    requirements?: LevelRequirement;
    durability?: Durability;
    description?: string;
    icon?: string;

    // 套裝信息
    setId?: string;
    setPieces?: number;

    // 強化信息
    enhanceLevel?: number;
    maxEnhanceLevel?: number;
    enhanceCost?: number;
}

/**
 * 裝備套裝接口
 */
export interface EquipmentSet {
    id: string;
    name: string;
    pieces: string[];  // 裝備ID列表
    setBonuses: Record<number, EquipmentBonus>;  // 套裝數量 -> 加成
}

/**
 * 裝備強化結果接口
 */
export interface EnhanceResult {
    success: boolean;
    newLevel: number;
    bonusChange: Partial<EquipmentBonus>;
    cost: number;
    message: string;
}

/**
 * 裝備驗證結果接口
 */
export interface EquipmentValidation {
    canEquip: boolean;
    reason?: string;
    requirements?: LevelRequirement;
}
