/**
 * 子彈相關的類型定義
 */

import { WeaponBasic } from "@/Colyseus/Schema/Weapon/Baisc";
import { Vector2 } from "../BaseTypes";

/**
 * 子彈創建配置
 */
export interface BulletCreateConfig {
    ownerId: string;
    startPosition: { x: number, y: number };
    direction: { x: number, y: number };
    damage: number;
    speed?: number;
    /**
     * 投射物類名（用於反射創建實例）
     * 
     * 🎯 支援的類名：
     * - 'BasicProjectile' - 基礎單體投射物
     * - 'ExplosiveProjectile' - 範圍爆炸投射物
     * - 'PiercingProjectile' - 穿透投射物
     * - 'FreezeProjectile' - 冰凍投射物
     * - 或任何註冊到 ProjectileRegistry 的自訂類名
     * 
     * 📝 擴充範例：
     * ```typescript
     * // 1. 創建新的投射物類別
     * class PoisonExplosiveProjectile extends ExplosiveProjectile {
     *     // 添加毒屬性邏輯
     * }
     * 
     * // 2. 註冊到註冊表
     * ProjectileRegistry.register('PoisonExplosiveProjectile', PoisonExplosiveProjectile);
     * 
     * // 3. 使用
     * const config: BulletCreateConfig = {
     *     bulletClass: 'PoisonExplosiveProjectile',
     *     // ...其他配置
     * };
     * ```
     */
    bulletClass: string;
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
