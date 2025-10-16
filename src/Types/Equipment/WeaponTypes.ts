/**
 * 武器系統類型定義 - 基於 Class 基底名稱分類
 */

import { AttackResult, BufferEffect, VisualEffect, AttackFailReason } from "../Game/AttackTypes";

/**
 * 重新導出攻擊相關類型，方便武器系統使用
 */
export { AttackResult, BufferEffect as AttackEffect, VisualEffect, AttackFailReason };

/**
 * 武器類型枚舉 - 基於武器類別基底名稱
 */
export enum WeaponType {
    MELEE_WEAPON = "MeleeWeapon",           // 近戰武器：劍、錘、匕首等
    PROJECTILE_WEAPON = "ProjectileWeapon", // 投射武器：弓箭、火球、冰球等
    SUPPORT_WEAPON = "SupportWeapon"        // 輔助武器：治療杖、增益法杖等
}

/**
 * 武器攻擊模式
 */
export enum WeaponAttackMode {
    SINGLE_TARGET = "single_target",    // 單體攻擊
    AREA_OF_EFFECT = "area_of_effect", // 範圍攻擊
    SWEEP = "sweep",                   // 掃擊攻擊
    CHAIN = "chain",                   // 連鎖攻擊
    SUPPORT = "support"                // 輔助模式
}

/**
 * 武器傷害類型
 */
export enum WeaponDamageType {
    PHYSICAL = "physical", // 物理傷害
    MAGICAL = "magical",   // 魔法傷害
    HYBRID = "hybrid"      // 混合傷害
}

