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

export type PropertyValueType = 'single' | 'range' | 'composite';
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
    valueType: PropertyValueType;

    valueMin: number | string;
    valueMax: number | string;

    triggerProbability: number;
    stacked: boolean;
    category: 'basic' | 'combat' | 'status' | 'attribute';
    compositeFormat?: string;
}
export type compositeFormatCategory = 'probability' | 'duration' | 'damage' | 'count' | 'intensity';
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
    projectileClass: string; //如果是遠程武器,對應他產生的投射物類別
    weaponClass: string;    // 類別名稱
    classModule: string;    //是哪種類型的武器 , Melee/Projectile/Support
    fixedProperties: string;    // 逗號分隔的屬性字符串
    randomProperties: string;   // 逗號分隔的屬性字符串
    description: string;
}

/**
 * 通用屬性值定義 - 裝備與武器共用
 */
export interface PropertyValue {
    type: PropertyTypeValue;
    valueType: PropertyValueType; // 值類型
    value: number;  // 主要屬性 也有可能是傷害
    description?: string;      // 描述文字
    intensity?: number;      // 效果強度
    stacked?: boolean;      // 是否可堆疊
    probability: number;    // 觸發機率 (0-100)
    duration: number;       // 持續時間 (秒)
}

