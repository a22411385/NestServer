/**
 * 戰鬥系統類型定義
 * 整合所有戰鬥相關的接口
 */

/**
 * 攻擊結果接口
 */
export interface AttackResult {
    success: boolean;
    damage: number;
    targetId: string;
    isCritical?: boolean;
    effects?: string[];
}

/**
 * 攻擊處理結果接口
 */
export interface AttackProcessResult {
    success: boolean;
    damage: number;
    targetId: string;
    attackerId: string;
    weaponId?: string;
    timestamp: number;
}

/**
 * 攻擊系統統計接口
 */
export interface AttackSystemStats {
    totalAttacks: number;
    successfulAttacks: number;
    totalDamage: number;
    criticalHits: number;
    averageDamage: number;
}

/**
 * 傷害信息接口
 */
export interface DamageInfo {
    damage: number;
    attacker: string;
    target: string;
    weaponId?: string;
    isCritical?: boolean;
    damageType?: 'physical' | 'magical' | 'true';
}

/**
 * 戰鬥事件接口
 */
export interface CombatEvent {
    type: 'attack' | 'damage' | 'heal' | 'death' | 'buff' | 'debuff';
    timestamp: number;
    sourceId: string;
    targetId?: string;
    value?: number;
    data?: any;
}

/**
 * 戰鬥配置接口
 */
export interface CombatConfig {
    attackRange: number;
    attackCooldown: number;
    criticalChance: number;
    criticalMultiplier: number;
    dodgeChance: number;
    blockChance: number;
}

/**
 * 戰鬥狀態接口
 */
export interface CombatStatus {
    isInCombat: boolean;
    lastAttackTime: number;
    lastDamageTime: number;
    combatStartTime: number;
    targetId?: string;
}
