/**
 * 戰鬥和攻擊相關的類型定義
 */

import { Vector2 } from '../BaseTypes';
import { CategoryKey } from '../Equipment/WeaponPropertyTypes';
import { BulletCreateConfig } from './BulletTypes';

/**
 * 統一的攻擊結果接口 - 合併了所有攻擊相關的結果
 * 
 * 🆕 標籤系統整合：
 * - tags: 武器完整標籤（用於通用判斷）
 * - elementTags: 元素標籤（用於元素傷害加成）
 * - modifiers: 武器詞綴（用於物理效果判斷）
 */
export interface AttackResult {
    success: boolean;
    attackerId?: string; // 傷害來源
    weaponId?: string; // 使用的武器
    targetIds?: string[]; // 失敗時可能沒有目標

    // 傷害信息
    baseDamage: number;
    actualDamage?: number; // 實際造成的傷害
    isCritical?: boolean;

    // 🆕 標籤系統（POE 風格）
    tags?: string[];              // 武器完整標籤 ['weapon', 'melee', 'sword', 'fire']
    elementTags?: string[];       // 元素標籤 ['fire', 'elemental']
    modifiers?: any[];            // 武器詞綴（用於物理效果判斷）

    // 🆕 狀態效果 (從武器屬性生成)
    // - 近戰武器: CombatSystem 立即應用到 ServerGameUnit.statusEffects
    // - 遠程武器: 存在 ProjectileConfig 中,命中時應用
    statusEffects?: StatusEffectConfig[];
    projectileConfig?: BulletCreateConfig;  // 🆕 投射武器使用（替代 visualEffects）

    // 失敗原因
    reason?: AttackFailReason;

    // 攻擊數據（精簡版）
    attackData?: {
        position: Vector2;
        direction: Vector2;
        range: number;
        sweepAngle?: number;
        targetPosition?: Vector2; // 投射武器需要目標位置
        supportRadius?: number; // 支援武器需要支援範圍
    };
}

/**
 * 攻擊失敗原因
 */
export enum AttackFailReason {
    ON_COOLDOWN = 'on_cooldown',
    NO_TARGET = 'no_target',
    OUT_OF_RANGE = 'out_of_range',
}

/**
 * 狀態效果配置 - 從武器屬性生成,應用到 ServerGameUnit.statusEffects
 * 
 * 🎯 職責：武器系統 → 戰鬥系統 的狀態效果傳遞
 * - 武器從 properties 解析生成 StatusEffectConfig[]
 * - 近戰: CombatSystem 立即轉換為 StatusEffect Schema 並應用
 * - 遠程: 存在 ProjectileConfig 中,命中時應用
 * - 客戶端: 透過 ServerGameUnit.statusEffects (Schema) 自動同步
/**
 * 🆕 狀態效果配置（POE風格 + 標籤系統）
 * 
 * 📝 與 StatusEffectData 的差異:
 * - StatusEffectData: 武器屬性系統內部使用 (from properties)
 * - StatusEffectConfig: 攻擊結果傳遞使用 (in AttackResult)
 * - StatusEffect: Colyseus Schema,同步到客戶端
 * 
 * 🆕 標籤支持：
 * - tags: 從定義表複製，用於天賦加成匹配
 * - baseDamage/damageScaling: 用於傷害計算
 */
export interface StatusEffectConfig {
    type: string;               // 🆕 使用屬性ID（如 'burn', 'freeze'）
    duration: number;           // 持續時間 (毫秒)
    value?: number;             // 效果數值 (減速百分比、每秒傷害)
    chance?: number;            // 觸發機率 (0-100)
    direction?: Vector2;        // 方向 (擊退效果用)
    category: CategoryKey;      // 效果類別

    // 🆕 標籤系統（用於天賦加成）
    tags?: string[];            // 標籤列表 ['fire', 'ailment', 'elemental']
    baseDamage?: number;        // 基礎傷害（用於 DOT 計算）
    damageScaling?: number;     // 傷害縮放（武器攻擊力的百分比）
}
