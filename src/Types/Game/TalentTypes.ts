/**
 * 🆕 天賦屬性類型 - 使用字符串（配置驅動）
 * 不再使用枚舉，完全由配置文件決定
 */
export type TalentPropertyType = string;

export interface TalentConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: TalentCategory;
    position_x: number;
    position_y: number;
    max_points: number;
    prerequisites: string; //用,分開
    is_active: boolean;
}

export interface TalentEffect {
    talent_id: string;
    effect_type: TalentEffectType;

    // 🆕 屬性和修改器（POE 風格）
    stat: string;                   // 影響的屬性 (damage, attack_speed, burn_chance)
    value: number;                  // 數值
    modifier_type: ModifierType;    // 修改器類型 (flat, increased, more)

    // 🆕 標籤系統
    affect_tags?: string;           // 影響的標籤 (sword,melee)
    conditions?: string;            // 條件字符串 (wielding:sword)

    // 舊系統兼容（逐步移除）
    base_value?: number;
    per_point_value?: number;
    stack_type?: StackType;
    condition_params?: string;
}

export enum TalentCategory {
    COMBAT = 'COMBAT',
    WEAPON = 'WEAPON',
    DEFENSE = 'DEFENSE',
    UTILITY = 'UTILITY',
    MAGIC = 'MAGIC'
}

export enum TalentEffectType {
    PROPERTY_MODIFIER = 'PROPERTY_MODIFIER',
    SKILL_UNLOCK = 'SKILL_UNLOCK',
    PASSIVE_ABILITY = 'PASSIVE_ABILITY',
    AURA_EFFECT = 'AURA_EFFECT'
}

// 🆕 使用 POE 風格的 ModifierType
import { ModifierType } from '../Equipment/WeaponPropertyTypes';
export { ModifierType }; // 重新導出供其他模組使用

export enum StackType {
    SINGLE = 'SINGLE',
    ADDITIVE = 'ADDITIVE'
}

export enum TriggerCondition {
    // 戰鬥觸發
    ON_ATTACK = 'on_attack',
    ON_HIT = 'on_hit',
    ON_CAST = 'on_cast',
    ON_HEAL = 'on_heal',
    ON_CRITICAL_HIT = 'on_critical_hit',
    ON_KILL = 'on_kill',
    ON_TAKE_DAMAGE = 'on_take_damage',
    ON_LOW_HEALTH = 'on_low_health',

    // 移動觸發
    ON_MOVE = 'on_move',
    ON_STOP = 'on_stop',
    ON_DODGE = 'on_dodge',

    // 遊戲狀態觸發
    ON_LEVEL_UP = 'on_level_up',
    ON_PICKUP_ITEM = 'on_pickup_item',
    ON_PICKUP_GOLD = 'on_pickup_gold',

    // 多人觸發
    ON_ALLY_DEATH = 'on_ally_death',
    ON_ALLY_NEARBY = 'on_ally_nearby',

    // 永久效果
    PASSIVE = 'passive'
}

/**
 * 角色天賦資料結構 - 用於儲存和管理角色的天賦分配
 */
export interface CharacterTalentData {
    characterId: string;
    totalPoints: number;           // 總天賦點數
    usedPoints: number;           // 已使用點數
    availablePoints: number;      // 可用點數
    allocatedTalents: {           // 已分配的天賦
        [talentId: string]: number; // 天賦ID: 投入點數
    };
    lastResetTime?: Date;         // 上次重置時間
}

/**
 * 🆕 天賦效果應用結果
 */
export interface AppliedTalentEffect {
    talentId: string;
    stat: string;                   // 影響的屬性
    modifierType: ModifierType;
    value: number;
    tags: string[];                 // 標籤列表
    condition?: TriggerCondition;
    isActive: boolean;
}