import { PropertyType, PropertyTypeValue } from "../Equipment/WeaponPropertyTypes";

/**
 * 天賦屬性類型 - 直接使用統一的屬性定義
 * 這樣可以避免重複定義和不必要的轉換
 */
export type TalentPropertyType = PropertyTypeValue;

/**
 * 天賦可影響的屬性白名單（如果需要限制天賦只能影響某些屬性）
 * 目前允許所有屬性，未來可以根據需求調整
 */
export const TALENT_SUPPORTED_PROPERTIES = [
    PropertyType.ATTACK_DAMAGE,
    PropertyType.ATTACK_SPEED,
    PropertyType.ATTACK_RANGE,
    PropertyType.CRITICAL_CHANCE,
    PropertyType.CRITICAL_DAMAGE,
    PropertyType.LIFE_STEAL,
    PropertyType.STRENGTH,
    PropertyType.INTELLIGENCE,
    PropertyType.VITALITY,
    PropertyType.AGILITY,
    PropertyType.PHYSICAL_RESISTANCE,
    PropertyType.MAGICAL_RESISTANCE,
    PropertyType.PROJECTILE_SPEED,
    PropertyType.AREA_OF_EFFECT,
    PropertyType.PIERCE_COUNT,
    PropertyType.HEAL_AMOUNT,
    PropertyType.BUFF_DURATION,
    PropertyType.SUPPORT_RADIUS,
    PropertyType.SWEEP_ANGLE,
    PropertyType.KNOCKBACK,
    PropertyType.PIERCING,
    PropertyType.CHAIN_ATTACK,
    PropertyType.SPLASH_DAMAGE,
    PropertyType.STUN,
    PropertyType.FREEZE,
    PropertyType.BURN,
    PropertyType.POISON,
    PropertyType.SLOW,
    PropertyType.MAX_HEALTH,
    PropertyType.MAX_MANA,
    PropertyType.MANA_REGEN,
    PropertyType.MOVEMENT_SPEED,
    PropertyType.EXPERIENCE_GAIN,
    PropertyType.GOLD_FIND,
    PropertyType.MAGIC_FIND
] as const;

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
    property_name: TalentPropertyType;  // 🆕 使用強類型定義
    modifier_type: ModifierType;
    base_value: number;
    per_point_value: number;
    condition?: TriggerCondition;
    stack_type: StackType;
    //條件細節範例 threshold:25|cooldown:5|max_stacks:5
    condition_params?: string;
    /* {
 
         threshold?: number;      // 觸發閾值（如低血量的百分比）
         cooldown?: number;       // 冷卻時間
         max_stacks?: number;     // 最大疊加次數
         probability?: number;    // 觸發機率 (0-1)
     };
     */
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

export enum ModifierType {
    FLAT_ADD = 'FLAT_ADD',
    PERCENTAGE_ADD = 'PERCENTAGE_ADD',
    PERCENTAGE_MULTIPLY = 'PERCENTAGE_MULTIPLY',
    NONE = 'NONE'
}
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
 * 天賦效果應用結果
 */
export interface AppliedTalentEffect {
    talentId: string;
    propertyName: TalentPropertyType;
    modifierType: ModifierType;
    value: number;
    condition?: TriggerCondition;
    isActive: boolean;
}