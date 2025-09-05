/**
 * 戰鬥和攻擊相關的類型定義
 */

import { PropertyValue } from "../Equipment/WeaponPropertyTypes";

/**
 * 統一的攻擊結果接口 - 合併了所有攻擊相關的結果
 */
export interface AttackResult {
    success: boolean;
    attackerId?: string;  // 改為可選，保持向下相容
    weaponId?: string;
    targetIds?: string[]; // 改為可選，失敗時可能沒有目標
    timestamp?: number;   // 改為可選，保持向下相容

    // 傷害信息
    baseDamage: number;
    actualDamage?: number;
    isCritical?: boolean;

    // 效果和視覺
    effects?: AttackEffect[];
    visualEffects?: VisualEffect[];

    // 失敗原因
    reason?: AttackFailReason;

    // 攻擊數據
    attackData?: {
        position: { x: number, y: number };
        direction: { x: number, y: number };
        range: number;
        sweepAngle?: number;
        targetPosition?: { x: number, y: number }; // 投射武器需要目標位置
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
    OUT_OF_RANGE = 'out_of_range'
}

/**
 * 攻擊效果
 */
export interface AttackEffect {
    type: 'knockback' | 'stun' | 'slow' | 'burn' | 'freeze' | 'poison';
    targetId: string;
    value: number | number[]; // 支援複合值
    duration?: number; // 持續時間（狀態效果用）
    direction?: { x: number, y: number }; // 方向（擊退用）
}

/**
 * 視覺效果
 */
export interface VisualEffect {
    type: 'swing' | 'slash' | 'explosion' | 'projectile' | 'support' | 'heal';
    eventType: string; // 對應的廣播事件名稱
    position: { x: number, y: number };
    direction?: { x: number, y: number };
    data?: any;
}
