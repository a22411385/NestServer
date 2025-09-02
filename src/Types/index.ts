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
export * from './Game/ItemTypes';

// 裝備系統類型
export * from './Equipment/EquipmentTypes';
export * from './Equipment/WeaponTypes';

// 網路通信類型
export * from './Network/NetworkTypes';

// 類型組合和工具類型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 常用類型聯合
export type AllMessageTypes = import('./Network/NetworkTypes').MessageType;
export type AllEquipmentTypes = import('./Equipment/EquipmentTypes').EquipmentType;
export type AllWeaponTypes = import('./Equipment/WeaponTypes').WeaponType;
export type AllEnemyTypes = import('./Game/EnemyTypes').EnemyType;
export type AllItemTypes = import('./Game/ItemTypes').ItemType;
