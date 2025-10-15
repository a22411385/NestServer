/**
 * 子彈相關的類型定義
 */

import { WeaponBasic } from "@/Colyseus/Schema/Weapon/Baisc";
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
    maxDistance?: number; // 🆕 推薦：最大飛行距離（像素）

    scale?: number;
    weaponId?: string; // 武器ID，用於獲取武器屬性
}

/**
 * 武器子彈配置
 */
export interface WeaponBulletConfig {
    weapon: WeaponBasic; // WeaponBasic 的引用，避免循環依賴
    startPosition: Vector2;
    direction: Vector2;
    ownerId: string;
    damageMultiplier?: number;
}
