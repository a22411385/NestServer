/**
 * 戰鬥和攻擊相關的類型定義
 */

import { PropertyValue } from '../Equipment/WeaponPropertyTypes';

/**
 * 統一的攻擊結果接口 - 合併了所有攻擊相關的結果
 */
export interface AttackResult {
  success: boolean;
  attackerId?: string; // 傷害來源
  weaponId?: string; // 使用的武器
  targetIds?: string[]; // 失敗時可能沒有目標

  // 傷害信息
  baseDamage: number;
  actualDamage?: number; // 實際造成的傷害
  isCritical?: boolean;

  // 效果和視覺
  effects?: BufferEffect[];
  visualEffects?: VisualEffect[];

  // 失敗原因
  reason?: AttackFailReason;

  // 攻擊數據
  attackData?: {
    position: { x: number; y: number };
    direction: { x: number; y: number };
    range: number;
    sweepAngle?: number;
    targetPosition?: { x: number; y: number }; // 投射武器需要目標位置
    supportRadius?: number; // 支援武器需要支援範圍
    properties?: PropertyValue[]; // 武器屬性
  };
}

/**
 * 攻擊失敗原因
 */
export enum AttackFailReason {
  ON_COOLDOWN = 'on_cooldown',
  NO_TARGET = 'no_target',
  OUT_OF_RANGE = 'out_of_range',
}

/**
 * 攻擊效果
 */
export interface BufferEffect {
  type: 'knockback' | 'stun' | 'slow' | 'burn' | 'freeze' | 'poison';
  targetId: string;
  value: number | number[]; // 支援複合值
  duration?: number; // 持續時間（狀態效果用）
  direction?: { x: number; y: number }; // 方向（擊退用）
}

/**
 * 視覺效果資料 - 根據不同效果類型可能包含不同欄位
 */
export interface VisualEffectData {
  // 投射物相關
  damage?: number;
  startPosition?: { x: number; y: number };
  direction?: { x: number; y: number };
  speed?: number;
  bulletType?: string;

  // 武器資料（用於 swing, slash 等效果）
  weaponId?: string;
  range?: number;
  sweepAngle?: number;

  // 其他效果相關
  radius?: number;
  duration?: number;

  // 允許擴充的額外屬性
  [key: string]: unknown;
}

/**
 * 視覺效果
 */
export interface VisualEffect {
  type: VisualEffectType;
  eventType: string; // 對應的廣播事件名稱
  position: { x: number; y: number };
  direction?: { x: number; y: number };
  data?: VisualEffectData;
}
export type VisualEffectType =
  | 'freeze'
  | 'hit'
  | 'swing'
  | 'slash'
  | 'explosion'
  | 'projectile'
  | 'support'
  | 'heal';
