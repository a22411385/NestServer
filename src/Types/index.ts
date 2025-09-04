/**
 * 類型定義統一導出索引 - 已重新整理和合併重複定義
 * 提供所有類型的統一入口
 */

// 基礎類型
export * from './BaseTypes';

// ========================= 遊戲核心類型 =========================
export * from './Game/GameTypes';      // 包含 StatType, AttributeBonus 等統一接口
export * from './Game/AttackTypes';    // 包含統一的 AttackResult 接口
export * from './Game/CombatTypes';    // 重新導出 AttackTypes，避免重複

// ========================= 武器系統類型 =========================
export * from './Equipment/WeaponTypes';         // 重新設計的武器分類
export * from './Equipment/WeaponPropertyTypes'; // 武器屬性定義
export * from './Equipment/EquipmentTypes';      // 重新導出統一的 AttributeBonus

// ========================= 其他遊戲類型 =========================
export * from './Game/WaveTypes';
export * from './Game/EnemyTypes';
export * from './Game/SpawnTypes';
export * from './Game/BulletTypes';
export * from './Game/ItemBaseTypes';

// ========================= 網路類型 =========================
export * from './Network/NetworkTypes';
export * from './Network/MessageHandlerTypes';

// 移除已廢棄的導入
// export * from './Equipment/WeaponServiceTypes'; // 如果存在且無用，應該刪除

// ========================= 工具類型 =========================
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
