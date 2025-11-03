/**
 * 子彈相關的類型定義
 */

import { WeaponBasic } from "@/Colyseus/Schema/Weapon/Baisc";
import { Vector2 } from "../BaseTypes";
import { StatusEffectConfig } from "./AttackTypes";
import { PropertyValue } from "../Equipment/EquipmentTypes";

/**
 * 子彈創建配置
 * 
 * 🆕 優雅的擴展方案：
 * - 新增可選屬性時，只需在這裡定義，然後在 ServerBullet.applyExtendedConfig() 中添加到屬性列表
 * - BulletFactory 會自動處理所有可選屬性
 * 
 * 🆕 標籤系統整合：
 * - tags: 武器完整標籤
 * - elementTags: 元素標籤（用於傷害計算）
 * - modifiers: 武器詞綴（用於物理效果）
 */
export interface BulletCreateConfig {
    // ===== 必需屬性 =====
    ownerId: string;
    startPosition: { x: number, y: number };
    direction: { x: number, y: number };
    damage: number;

    weaponId: string; // 武器ID，用於獲取武器屬性
    // ===== 可選屬性 (基礎) =====
    speed?: number;
    maxDistance?: number; // 最大飛行距離（像素）

    scale?: number;

    // 🆕 使用屬性ID作為鍵（POE風格）
    properties: Record<string, PropertyValue>;
    statusEffects?: StatusEffectConfig[]; // 命中時應用的狀態效果

    // 🆕 標籤系統（避免回查武器）
    tags?: string[];              // 武器完整標籤 ['weapon', 'ranged', 'bow', 'fire']
    elementTags?: string[];       // 元素標籤 ['fire', 'elemental']
    modifiers?: any[];            // 武器詞綴

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
