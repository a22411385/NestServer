/**
 * 戰鬥和攻擊相關的類型定義
 */

import { Vector2 } from '../BaseTypes';
import { CategoryKey, PropertyTypeValue, PropertyValue } from '../Equipment/WeaponPropertyTypes';
import { BulletCreateConfig } from './BulletTypes';

/**
 * 統一的攻擊結果接口 - 合併了所有攻擊相關的結果
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

    // 🆕 狀態效果 (從武器屬性生成)
    // - 近戰武器: CombatSystem 立即應用到 ServerGameUnit.statusEffects
    // - 遠程武器: 存在 ProjectileConfig 中,命中時應用
    statusEffects?: StatusEffectConfig[];

    // 視覺效果
    visualEffects?: VisualEffect[];  // 🎯 近戰武器使用（swing, slash）
    projectileConfig?: BulletCreateConfig;  // 🆕 投射武器使用（替代 visualEffects）

    // 失敗原因
    reason?: AttackFailReason;

    // 攻擊數據
    attackData?: {
        position: Vector2;
        direction: Vector2;
        range: number;
        sweepAngle?: number;
        targetPosition?: Vector2; // 投射武器需要目標位置
        supportRadius?: number; // 支援武器需要支援範圍
        properties?: PropertyValue[]; // 武器屬性
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
 * 
 * 📝 與 StatusEffectData 的差異:
 * - StatusEffectData: 武器屬性系統內部使用 (from properties)
 * - StatusEffectConfig: 攻擊結果傳遞使用 (in AttackResult)
 * - StatusEffect: Colyseus Schema,同步到客戶端
 */
export interface StatusEffectConfig {
    type: PropertyTypeValue;
    duration: number;           // 持續時間 (毫秒)
    value?: number;             // 效果數值 (減速百分比、每秒傷害)
    chance?: number;            // 觸發機率 (0-100)
    direction?: Vector2;        // 方向 (擊退效果用)
    category: CategoryKey; // 效果類別
}

/**
 * 基礎視覺效果接口 - 所有視覺效果共用的欄位
 */
interface BaseVisualEffect {
    type: 'swing' | 'slash' | 'explosion' | 'freeze' | 'hit' | 'support' | 'heal';
    position: Vector2;
    direction: Vector2;
}

/**
 * 近戰攻擊視覺效果（揮砍、斬擊）
 */
export interface MeleeVisualEffect extends BaseVisualEffect {
    data: {
        weaponType: string;
        damage: number;
        attackRange?: number;
        sweepAngle?: number;
    };
}

/**
 * 爆炸視覺效果
 */
export interface ExplosionVisualEffect extends BaseVisualEffect {
    data: {
        radius: number;
        colors?: number[];
        duration?: number;
        hasShockwave?: boolean;
    };
}

/**
 * 冰凍視覺效果
 */
export interface FreezeVisualEffect extends BaseVisualEffect {
    data: {
        radius: number;
        duration: number;
        slowAmount?: number;
    };
}

/**
 * 命中視覺效果
 */
export interface HitVisualEffect extends BaseVisualEffect {
    data: {
        damage: number;
        isCritical?: boolean;
        isPierce?: boolean;
    };
}

/**
 * 輔助/治療視覺效果
 */
export interface SupportVisualEffect extends BaseVisualEffect {
    data: {
        amount: number;
        radius?: number;
        buffType?: string;
    };
}

/**
 * 視覺效果聯合類型 - 所有視覺效果的總和
 *
 * 🎯 設計原則：
 * - position, direction 統一在頂層，避免混淆
 * - data 只包含該類型特有的資料
 * - 使用聯合類型提供類型安全和自動補全
 * - type 用於判斷邏輯，廣播時自動轉換為 `${type}_effect` 事件名稱
 *
 * 📡 事件廣播規則：
 * - 投射物 → 不使用 VisualEffect,使用 ProjectileConfig 通過 Schema 同步
 * - 其他類型 → broadcast(`${type}_effect`, data)
 */
export type VisualEffect =
    | MeleeVisualEffect
    | ExplosionVisualEffect
    | FreezeVisualEffect
    | HitVisualEffect
    | SupportVisualEffect;

