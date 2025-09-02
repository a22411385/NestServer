/**
 * 敵人系統類型定義
 * 整合自 EnemyFactory.ts 的所有接口和枚舉
 */

/**
 * 敵人類型枚舉
 */
export enum EnemyType {
    NORMAL_ZOMBIE = 1,
    FAST_ZOMBIE = 2,
    STRONG_ZOMBIE = 3,
    BOSS_ZOMBIE = 4
}

/**
 * 敵人配置接口
 */
export interface EnemyConfig {
    type: EnemyType;
    hp: number;
    maxHp: number;
    attackDamage: number;
    moveSpeed: number;
    scale: number;
    collisionWidth: number;
    collisionHeight: number;
    experienceReward: number;
    goldReward: number;
}

/**
 * 敵人AI狀態枚舉
 */
export enum EnemyAIState {
    IDLE = "idle",
    PATROL = "patrol",
    CHASE = "chase",
    ATTACK = "attack",
    RETREAT = "retreat",
    DEAD = "dead"
}

/**
 * 敵人行為配置接口
 */
export interface EnemyBehaviorConfig {
    detectionRange: number;     // 偵測範圍
    attackRange: number;        // 攻擊範圍
    chaseRange: number;         // 追擊範圍
    patrolRadius: number;       // 巡邏半徑
    attackCooldown: number;     // 攻擊冷卻時間
    maxChaseTime: number;       // 最大追擊時間
}

/**
 * 敵人生成數據接口
 */
export interface EnemySpawnData {
    type: EnemyType;
    position: { x: number; y: number };
    level?: number;
    customConfig?: Partial<EnemyConfig>;
}

/**
 * 敵人統計接口
 */
export interface EnemyStats {
    enemiesSpawned: number;
    enemiesKilled: number;
    totalDamageDealt: number;
    totalExperienceGiven: number;
    totalGoldDropped: number;
}
