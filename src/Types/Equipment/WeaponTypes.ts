/**
 * 武器系統類型定義
 * 整合自 WeaponSystemFacade.ts 和相關武器文件的接口
 */

import { RarityType } from "../BaseTypes";
import { EquipmentBonus } from "./EquipmentTypes";

/**
 * 武器類型枚舉
 */
export enum WeaponType {
    MELEE = "melee",
    RANGED = "ranged",
    MAGIC = "magic",
    PROJECTILE = "projectile",
    SUPPORT = "support"
}

/**
 * 武器創建結果接口
 */
export interface WeaponCreateResult {
    weaponId: string;
    success: boolean;
    weaponData?: any;
    weaponInstance?: any;
    stats?: WeaponStats;
    message: string;
}

/**
 * 武器升級結果接口
 */
export interface WeaponUpgradeResult {
    success: boolean;
    weaponId: string;
    newLevel: number;
    statChanges: Partial<WeaponStats>;
    cost: number;
    message: string;
}

/**
 * 武器批量處理接口
 */
export interface WeaponBatchProcess {
    weaponId: string;
    weaponData?: any;
    weaponInstance?: any;
    stats?: WeaponStats;
    processTime: number;
}

/**
 * 最終武器屬性接口
 */
export interface WeaponStats {
    baseDamage: number;
    attackSpeed: number;
    criticalRate: number;
    criticalDamage: number;
    attackRange: number;
    durability: number;
    accuracy: number;

    // 特殊效果
    lifesteal?: number;
    armorPenetration?: number;
    elementalDamage?: {
        fire?: number;
        ice?: number;
        lightning?: number;
        poison?: number;
    };
}

/**
 * 武器配置接口
 */
export interface WeaponConfig {
    id: string;
    name: string;
    displayName: string;
    description: string;
    type: WeaponType;
    rarity: RarityType;
    baseStats: WeaponStats;
    levelScaling: Partial<WeaponStats>;  // 每級成長
    requirements: {
        level: number;
        stats?: Record<string, number>;
    };
    icon?: string;
    model?: string;
    animations?: Record<string, string>;
}

/**
 * 武器強化配置接口
 */
export interface WeaponEnhancementConfig {
    maxLevel: number;
    costPerLevel: number;
    successRate: number[];  // 每級強化成功率
    statMultiplier: number[];  // 每級屬性倍數
    materials?: Record<string, number>;  // 所需材料
}

/**
 * 武器實例接口
 */
export interface WeaponInstance {
    id: string;
    configId: string;
    level: number;
    enhanceLevel: number;
    currentStats: WeaponStats;
    durability: {
        current: number;
        max: number;
    };
    ownerId?: string;
    isEquipped: boolean;
    createdAt: number;
    modifiedAt: number;
}
