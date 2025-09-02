/**
 * 波次管理系統類型定義
 * 整合自 WaveManager.ts 的所有接口
 */

import { EnemyType } from "./EnemyTypes";
import { SpawnType } from "./SpawnTypes";


/**
 * 波次狀態枚舉
 */
export enum WaveState {
    PREPARING = "preparing",    // 準備階段
    SPAWNING = "spawning",      // 生成階段
    ACTIVE = "active",          // 戰鬥階段
    COMPLETED = "completed",    // 完成階段
    FAILED = "failed"           // 失敗階段
}

/**
 * 遊戲流程狀態枚舉
 */
export enum GameFlowState {
    STOPPED = "stopped",
    PREPARE = "prepare",
    BATTLE = "battle",
    REST = "rest",
    GAME_OVER = "game_over"
}

/**
 * 遊戲流程配置接口
 */
export interface GameFlowConfig {
    prepareTime: number;    // 準備時間（秒）
    battleTime: number;     // 戰鬥時間（秒）
    restTime: number;       // 休息時間（秒）
    maxWaves: number;       // 最大波次數
}

/**
 * 波次配置接口
 */
export interface WaveConfig {
    waveNumber: number;
    enemyTypes: EnemyType[];
    enemyCount: number;
    spawnType: SpawnType;
    preparationTime: number;    // 準備時間（毫秒）
    spawnInterval: number;      // 生成間隔（毫秒）
    waveTimeout: number;        // 波次超時時間（毫秒）
    isBossWave: boolean;
    rewards: {
        experience: number;
        gold: number;
        items?: string[];
    };
}

/**
 * 波次事件接口
 */
export interface WaveEvent {
    type: 'wave_start' | 'wave_complete' | 'wave_failed' | 'enemy_spawned' | 'all_enemies_spawned';
    waveNumber: number;
    data?: any;
}

/**
 * 波次統計接口
 */
export interface WaveStatistics {
    totalWaves: number;
    completedWaves: number;
    failedWaves: number;
    totalEnemiesSpawned: number;
    totalEnemiesKilled: number;
    totalExperienceGained: number;
    totalGoldEarned: number;
    averageWaveTime: number;
}
