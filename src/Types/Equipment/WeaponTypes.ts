/**
 * 武器系統類型定義 - 基於 Class 基底名稱分類
 */

import { AttackResult, StatusEffectConfig, AttackFailReason } from "../Game/AttackTypes";

/**
 * 重新導出攻擊相關類型，方便武器系統使用
 */
export { AttackResult, StatusEffectConfig, AttackFailReason };

/**
 * 武器類型枚舉 - 基於武器類別基底名稱
 */
export enum WeaponType {
    MELEE_WEAPON = "MeleeWeapon",           // 近戰武器：劍、錘、匕首等
    PROJECTILE_WEAPON = "ProjectileWeapon", // 投射武器：弓箭、火球、冰球等
    SUPPORT_WEAPON = "SupportWeapon"        // 輔助武器：治療杖、增益法杖等
}

/**
 * 武器屬性表
 */
export interface WeaponStatConfig {
    statName: string;
    type: 'number' | 'string' | 'boolean';
    description: string;
}
