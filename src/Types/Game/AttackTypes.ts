/**
 * 戰鬥和攻擊相關的類型定義
 */

import { Vector2 } from '../BaseTypes';
import { PropertyValue } from '../Equipment/WeaponPropertyTypes';

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

    // 效果和視覺
    effects?: BufferEffect[];
    visualEffects?: VisualEffect[];

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
 * 攻擊效果
 */
export interface BufferEffect {
    type: 'knockback' | 'stun' | 'slow' | 'burn' | 'freeze' | 'poison';
    targetId: string;
    value: number | number[]; // 支援複合值
    duration?: number; // 持續時間（狀態效果用）
    direction?: Vector2; // 方向（擊退用）
}

/**
 * 基礎視覺效果接口 - 所有視覺效果共用的欄位
 */
interface BaseVisualEffect {
    position: Vector2;
    direction: Vector2;
} /**
 * 近戰攻擊視覺效果（揮砍、斬擊）
 */
export interface MeleeVisualEffect extends BaseVisualEffect {
    type: 'swing' | 'slash';
    data: {
        weaponType: string;
        damage: number;
        attackRange?: number;
        sweepAngle?: number;
    };
}

/**
 * 投射物視覺效果
 */
export interface ProjectileVisualEffect extends BaseVisualEffect {
    type: 'projectile';
    data: {
        bulletClass: string; // 投射物類名（如 'ExplosiveProjectile'）
        bulletType?: string; // 兼容舊代碼
        speed: number;
        damage: number;
        pierceCount?: number;
        areaOfEffect?: number;
        maxDistance?: number;
    };
}

/**
 * 爆炸視覺效果
 */
export interface ExplosionVisualEffect extends BaseVisualEffect {
    type: 'explosion';
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
    type: 'freeze';
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
    type: 'hit';
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
    type: 'support' | 'heal';
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
 * - 'projectile' → 不廣播（通過 Schema 同步）
 * - 其他類型 → broadcast(`${type}_effect`, data)
 */
export type VisualEffect =
    | MeleeVisualEffect
    | ProjectileVisualEffect
    | ExplosionVisualEffect
    | FreezeVisualEffect
    | HitVisualEffect
    | SupportVisualEffect;
