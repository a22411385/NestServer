/**
 * 戰鬥和攻擊相關的類型定義
 */

/**
 * 武器攻擊結果
 */
export interface WeaponAttackResult {
    success: boolean;
    weaponId: string;
    targetIds?: string[];
    baseDamage: number; // 基礎傷害，實際傷害由 DamageSystem 計算
    effects?: AttackEffect[];
    visualEffects?: VisualEffect[];
    reason?: AttackFailReason;
    attackData?: {
        position: { x: number, y: number };
        direction: { x: number, y: number };
        range: number;
        sweepAngle?: number;
        targetPosition?: { x: number, y: number }; // 投射武器需要目標位置
        supportRadius?: number; // 支援武器需要支援範圍
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
 * 攻擊效果（移除舊的傷害相關邏輯）
 */
export interface AttackEffect {
    type: 'knockback' | 'stun' | 'slow';
    targetId: string;
    value: number;
    direction?: { x: number, y: number };
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
