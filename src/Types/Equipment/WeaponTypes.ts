/**
 * 武器系統類型定義 - 基於 Class 基底名稱分類
 */

import { AttackResult, StatusEffectConfig, AttackFailReason } from "../Game/AttackTypes";

/*
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
 * 屬性類別
 */
export type AttributeCategory =
    | 'combat'          // 基礎戰鬥屬性
    | 'critical'        // 暴擊系統
    | 'projectile'      // 投射物屬性
    | 'area'            // 範圍效果
    | 'special'         // 特殊效果（連鎖、穿透等）
    | 'elemental'       // 元素傷害
    | 'survival'        // 生存屬性（偷取等）
    | 'resource'        // 資源管理（法力、冷卻等）
    | 'duration'        // 持續時間
    | 'penetration';    // 防禦穿透

/**
 * 武器屬性表
 */
export interface WeaponStatConfig {
    attributeId: string;
    statName: string;
    type: 'number' | 'string' | 'boolean';
    category: AttributeCategory;
    aliases: string;
    description: string;
    enabled: boolean; // ✅ GoogleSheetCache 會統一轉換為布林值
}
