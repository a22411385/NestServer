/**
 * 子彈相關的類型定義
 */

import { Vector2 } from "../BaseTypes";

/**
 * 子彈類型枚舉
 */
export enum BulletType {
    BASIC = "basic",
    PIERCING = "piercing",
    EXPLOSIVE = "explosive",
    MAGIC = "magic",
    ARROW = "arrow",
    FIREBALL = "fireball"
}

/**
 * 子彈創建配置
 */
export interface BulletCreateConfig {
    ownerId: string;
    startPosition: { x: number, y: number };
    direction: { x: number, y: number };
    damage: number;
    speed?: number;
    bulletType?: BulletType;
    pierceCount?: number;
    areaOfEffect?: number;
    lifeTime?: number;
    scale?: number;
}

/**
 * 武器子彈配置
 */
export interface WeaponBulletConfig {
    weapon: any; // WeaponBasic 的引用，避免循環依賴
    startPosition: Vector2;
    direction: Vector2;
    ownerId: string;
    damageMultiplier?: number;
}
