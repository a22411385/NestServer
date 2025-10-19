/**
 * 子彈相關的類型定義
 */

import { WeaponBasic } from "@/Colyseus/Schema/Weapon/Baisc";
import { Vector2 } from "../BaseTypes";
import { StatusEffectConfig } from "./AttackTypes";

/**
 * 子彈創建配置
 * 
 * 🆕 優雅的擴展方案：
 * - 新增可選屬性時，只需在這裡定義，然後在 ServerBullet.applyExtendedConfig() 中添加到屬性列表
 * - BulletFactory 會自動處理所有可選屬性
 */
export interface BulletCreateConfig {
    // ===== 必需屬性 =====
    ownerId: string;
    startPosition: { x: number, y: number };
    direction: { x: number, y: number };
    damage: number;
    bulletClass: string;

    // ===== 可選屬性 (基礎) =====
    speed?: number;
    maxDistance?: number; // 最大飛行距離（像素）
    weaponId?: string; // 武器ID，用於獲取武器屬性
    scale?: number;

    // ===== 可選屬性 (擴展效果) =====
    pierceCount?: number; // 穿透次數
    areaOfEffect?: number; // 範圍效果半徑
    statusEffects?: StatusEffectConfig[]; // 命中時應用的狀態效果

    // 🔮 未來可擴展的屬性 (暫時保留註釋作為範例)
    // bounceCount?: number; // 彈射次數
    // knockbackDistance?: number; // 擊退距離
    // homingStrength?: number; // 追蹤強度 (0-1, 0=無追蹤, 1=完全追蹤)
    // chainCount?: number; // 連鎖攻擊次數
    // splitCount?: number; // 分裂子彈數量
    // lifesteal?: number; // 生命偷取百分比
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
