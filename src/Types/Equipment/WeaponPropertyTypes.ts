/**
 * 武器屬性系統類型定義
 * 支援動態屬性組合和品質系統
 */

/**
 * 武器屬性類型枚舉
 */
export enum WeaponPropertyType {
    // 基礎屬性
    ATTACK_DAMAGE = 'attack_damage',
    ATTACK_SPEED = 'attack_speed',
    ATTACK_RANGE = 'attack_range',
    PROJECTILE_SPEED = 'projectile_speed',
    AREA_OF_EFFECT = 'area_of_effect',
    PIERCE_COUNT = 'pierce_count',
    HEAL_AMOUNT = 'heal_amount',
    BUFF_DURATION = 'buff_duration',
    SUPPORT_RADIUS = 'support_radius',
    SWEEP_ANGLE = 'sweep_angle',

    // 戰鬥效果
    KNOCKBACK = 'knockback',
    CRITICAL_CHANCE = 'critical_chance',
    CRITICAL_DAMAGE = 'critical_damage',
    LIFE_STEAL = 'life_steal',
    PIERCING = 'piercing',
    CHAIN_ATTACK = 'chain_attack',
    SPLASH_DAMAGE = 'splash_damage',

    // 狀態效果
    STUN = 'stun',
    FREEZE = 'freeze',
    BURN = 'burn',
    POISON = 'poison',
    SLOW = 'slow',

    // 屬性加成
    STRENGTH = 'strength',
    INTELLIGENCE = 'intelligence',
    VITALITY = 'vitality',
    AGILITY = 'agility',
}

/**
 * 武器品質等級
 */
export enum WeaponQuality {
    NORMAL = 'normal',      // 普通 - 0個隨機詞綴
    MAGIC = 'magic',        // 魔法 - 1個隨機詞綴
    RARE = 'rare',          // 稀有 - 2個隨機詞綴
    EPIC = 'epic',          // 史詩 - 3個隨機詞綴
    LEGENDARY = 'legendary'  // 傳奇 - 4個隨機詞綴
}

/**
 * 屬性定義 (從 google-sheets-cache.json 載入)
 */
export interface WeaponPropertyDefinition {
    propertyType: string;
    displayName: string;
    description: string;
    valueType: 'single' | 'range' | 'composite';
    valueMin: number | string;
    valueMax: number | string;
    triggerProbability: number;
    stacked: boolean;
    category: 'basic' | 'combat' | 'status' | 'attribute';
    compositeFormat?: string;
}

/**
 * 武器配置定義 (從 google-sheets-cache.json 載入)
 */
export interface WeaponConfigDefinition {
    id: string;
    name: string;
    baseDamage: number;
    attackSpeed: number;
    attackRange: number;
    enabled: boolean;
    weaponClass: string;
    classModule: string;
    fixedProperties: string;    // 逗號分隔的屬性字符串
    randomProperties: string;   // 逗號分隔的屬性字符串
    description: string;
}

/**
 * 武器屬性值定義
 */
export interface WeaponPropertyValue {
    type: WeaponPropertyType;
    value: number | number[];  // 單值或陣列值 [機率, 持續時間] 或 [min, max]
    isPercentage?: boolean;    // 是否為百分比
    description?: string;      // 描述文字
    isDynamic?: boolean;       // 是否為動態屬性
}

/**
 * 狀態效果數據結構
 */
export interface StatusEffectData {
    type: WeaponPropertyType;
    chance?: number;        // 觸發機率 (0-100)
    duration?: number;      // 持續時間 (秒)
    value?: number;         // 效果數值
    damagePerSecond?: number; // 每秒傷害 (for burn, poison)
    slowPercentage?: number;  // 減速百分比 (for slow)
}

/**
 * 武器屬性應用結果
 */
export interface PropertyApplicationResult {
    success: boolean;
    appliedProperties: WeaponPropertyValue[];
    errors: string[];
}
