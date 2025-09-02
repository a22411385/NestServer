/**
 * 武器服務相關的類型定義
 */

import { ITEM_RATE, WeaponType } from "../index";

/**
 * 武器最終屬性結構（擴展的屬性結構）
 */
export interface FinalWeaponStats {
    finalDamage: number;
    finalRange: number;
    finalSpeed: number;
    intBonus: number;
    agiBonus: number;
    strBonus: number;
    vitBonus: number;
    displayName: string;
    rarity: string;
}

/**
 * 武器配置定義（合併自 WeaponConfig.ts）
 */
export interface WeaponConfigData {
    id: string;
    name: string;
    type: WeaponType;
    rarity: ITEM_RATE;
    description?: string;
    icon?: string;
    // 基礎屬性
    baseDamage: number;
    attackSpeed: number;
    attackRange: number;
    // 特殊屬性
    specialProperties?: Record<string, any>;
}
