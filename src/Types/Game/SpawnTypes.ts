/**
 * 生成管理系統類型定義
 * 整合自 SpawnManager.ts 的所有接口和枚舉
 */

import { Vector2 } from "../BaseTypes";

/**
 * 生成位置類型枚舉
 */
export enum SpawnType {
    RANDOM_EDGE = "random_edge",    // 隨機邊緣
    NORTH_EDGE = "north_edge",      // 北邊緣
    SOUTH_EDGE = "south_edge",      // 南邊緣
    EAST_EDGE = "east_edge",        // 東邊緣
    WEST_EDGE = "west_edge",        // 西邊緣
    CORNERS = "corners",            // 四個角落
    CIRCLE_FORMATION = "circle",    // 圓形陣型
    BOSS_CENTER = "boss_center"     // Boss 專用中心位置
}

/**
 * 生成位置配置接口
 */
export interface SpawnConfig {
    type: SpawnType;
    count: number;
    minDistanceFromPlayers: number;
    minDistanceBetweenEnemies: number;
    maxAttempts: number;
}

/**
 * 生成區域接口
 */
export interface SpawnArea {
    center: Vector2;
    radius: number;
    excludeRadius?: number;  // 排除的內圓半徑
}

/**
 * 地圖邊界接口
 */
export interface MapBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

/**
 * 生成驗證結果接口
 */
export interface SpawnValidationResult {
    isValid: boolean;
    reason?: string;
    suggestedPosition?: Vector2;
}

/**
 * 生成統計接口
 */
export interface SpawnStatistics {
    totalSpawnAttempts: number;
    successfulSpawns: number;
    failedSpawns: number;
    averageAttemptsPerSpawn: number;
    spawnsByType: Record<SpawnType, number>;
}
