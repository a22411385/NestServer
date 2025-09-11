/**
 * 武器屬性系統類型定義
 * 支援動態屬性組合和品質系統
 * 統一裝備與武器的屬性系統
 */

/**
 * 通用屬性類型常數 - 裝備與武器共用
 * 使用 const object 提供更好的開發體驗和類型安全
 */
export const PropertyType = {
    // 基礎戰鬥屬性
    ATTACK_DAMAGE: 'attack_damage',
    ATTACK_SPEED: 'attack_speed',
    ATTACK_RANGE: 'attack_range',
    CRITICAL_CHANCE: 'critical_chance',
    CRITICAL_DAMAGE: 'critical_damage',
    LIFE_STEAL: 'life_steal',

    // 角色主屬性
    STRENGTH: 'strength',         // 力量 - 影響物理攻擊力
    INTELLIGENCE: 'intelligence', // 智力 - 影響魔法攻擊力  
    VITALITY: 'vitality',        // 體力 - 影響生命值
    AGILITY: 'agility',          // 敏捷 - 影響攻擊速度和閃避

    // 防禦屬性
    PHYSICAL_RESISTANCE: 'physical_resistance',
    MAGICAL_RESISTANCE: 'magical_resistance',

    // 武器專用屬性
    PROJECTILE_SPEED: 'projectile_speed',
    AREA_OF_EFFECT: 'area_of_effect',
    PIERCE_COUNT: 'pierce_count',
    HEAL_AMOUNT: 'heal_amount',
    BUFF_DURATION: 'buff_duration',
    SUPPORT_RADIUS: 'support_radius',
    SWEEP_ANGLE: 'sweep_angle',

    // 戰鬥效果（武器和裝備都可有）
    KNOCKBACK: 'knockback',
    PIERCING: 'piercing',
    CHAIN_ATTACK: 'chain_attack',
    SPLASH_DAMAGE: 'splash_damage',

    // 狀態效果（武器和裝備都可有）
    STUN: 'stun',
    FREEZE: 'freeze',
    BURN: 'burn',
    POISON: 'poison',
    SLOW: 'slow',

    // 天賦專用屬性
    MAX_HEALTH: 'max_health',
    MAX_MANA: 'max_mana',
    MANA_REGEN: 'mana_regen',
    MOVEMENT_SPEED: 'movement_speed',

    // 遊戲系統屬性
    EXPERIENCE_GAIN: 'experience_gain',
    GOLD_FIND: 'gold_find',
    MAGIC_FIND: 'magic_find'
} as const;

/**
 * 屬性類型的值類型 - 從常數物件推導
 */
export type PropertyTypeValue = typeof PropertyType[keyof typeof PropertyType];

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
    type: string; //武器分類 ,鈍器/劍/弓/匕首  之類的
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
 * 通用屬性值定義 - 裝備與武器共用
 */
export interface PropertyValue {
    type: PropertyTypeValue;
    value: number | number[];  // 單值或陣列值 [機率, 持續時間] 或 [min, max]
    isPercentage?: boolean;    // 是否為百分比
    description?: string;      // 描述文字
    isDynamic?: boolean;       // 是否為動態屬性
}

/**
 * 狀態效果數據結構
 */
export interface StatusEffectData {
    type: PropertyTypeValue;
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
    appliedProperties: PropertyValue[];
    errors: string[];
}
