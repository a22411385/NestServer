/**
 * 天賦可影響的屬性類型 - 基於 WeaponProperties 定義
 * 直接使用武器屬性系統，確保一致性
 */
export type TalentPropertyType =
    // 基礎戰鬥屬性
    | 'attack_damage'
    | 'attack_speed'
    | 'attack_range'
    | 'critical_chance'
    | 'critical_damage'
    | 'life_steal'

    // 角色主屬性
    | 'strength'
    | 'intelligence'
    | 'vitality'
    | 'agility'

    // 防禦屬性
    | 'physical_resistance'
    | 'magical_resistance'

    // 武器專用屬性
    | 'projectile_speed'
    | 'area_of_effect'
    | 'pierce_count'
    | 'heal_amount'
    | 'buff_duration'
    | 'support_radius'
    | 'sweep_angle'

    // 戰鬥效果
    | 'knockback'
    | 'piercing'
    | 'chain_attack'
    | 'splash_damage'

    // 狀態效果
    | 'stun'
    | 'freeze'
    | 'burn'
    | 'poison'
    | 'slow'

    // 天賦專用屬性
    | 'max_health'
    | 'max_mana'
    | 'mana_regen'
    | 'movement_speed'
    | 'experience_gain'
    | 'gold_find'
    | 'magic_find';

export interface TalentConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: TalentCategory;
    position_x: number;
    position_y: number;
    max_points: number;
    prerequisites: string[];
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