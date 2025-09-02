/**
 * 類型定義統一導出索引
 * 提供所有類型的統一入口
 */

// 基礎類型
export * from './BaseTypes';

// 遊戲核心類型
export * from './Game/GameTypes';
export * from './Game/CombatTypes';
export * from './Game/WaveTypes';
export * from './Game/EnemyTypes';
export * from './Game/SpawnTypes';
export * from './Game/BulletTypes';
export * from './Game/AttackTypes';
export * from './Game/ItemBaseTypes';

// 裝備系統類型
export * from './Equipment/EquipmentTypes';
export * from './Equipment/WeaponTypes';
export * from './Equipment/WeaponServiceTypes';

// 網路類型
export * from './Network/NetworkTypes';
export * from './Network/MessageHandlerTypes';


// 類型組合和工具類型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
