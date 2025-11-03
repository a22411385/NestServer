/**
 * 基礎通用類型定義
 * 整合自 struct.ts 和其他分散的基礎類型
 */
import { TagDefinition, WeaponConfigDefinition, StatusEffectDefinition, WeaponModifier, AttributeBonus } from "./Equipment/WeaponPropertyTypes";
import { MaterialConfigDefinition } from "./Equipment/MaterialTypes";
import { TalentConfig, TalentEffect } from "./Game/TalentTypes";
import { EnemyConfigDefinition } from "./Game/EnemyTypes";
import { WeaponStatConfig } from "./Equipment/WeaponTypes";
import { VisualEffectDefinition } from "./Visual/VisualEffectTypes";

/**
 * JWT 載荷接口
 */
export interface JWTPayload {
    userId: number;
    openId: string;
    // 如果 undefined 代表他還沒選角
    playerId: number | undefined;
}

/**
 * HTTP 響應接口
 */
export interface HttpResponse {
    content: unknown;
    errorCode: number;
}

/**
 * 二維向量接口
 */
export interface Vector2 {
    x: number;
    y: number;
}

/**
 * 通用 ID 生成器接口
 */
export interface IdGenerator {
    generateId(): string;
    generateNumericId(): number;
}

/**
 * 通用稀有度類型
 */
export type RarityType = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/**
 * 通用等級需求接口
 */
export interface LevelRequirement {
    level?: number;
    stats?: Record<string, number>;
}

/**
 * 通用耐久度接口
 */
export interface Durability {
    current: number;
    max: number;
}

export interface GoogleCacheData {
    StatusEffectDefinitions: StatusEffectDefinition[];  // 🔄 狀態效果定義 (臨時效果)
    WeaponModifiers: WeaponModifier[];                  // 🆕 武器詞綴定義
    AttributeBonus: AttributeBonus[];                   // 🆕 屬性加成定義
    WeaponConfigs: WeaponConfigDefinition[];
    TagDefinitions: TagDefinition[];
    MaterialConfigs: MaterialConfigDefinition[];
    EnemyConfigs: EnemyConfigDefinition[];
    TalentConfigs: TalentConfig[];
    TalentEffects: TalentEffect[];
    WeaponStatConfigs: WeaponStatConfig[];
    VisualEffectDefinitions: VisualEffectDefinition[];  // 🆕 視覺效果定義
    lastUpdated: string;
}
