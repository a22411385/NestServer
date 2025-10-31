/**
 * 武器屬性系統類型定義
 * 支援動態屬性組合和品質系統
 * 統一裝備與武器的屬性系統
 */

/**
 * 元素類型常數 - 武器元素屬性
 */
export const ElementType = {
    PHYSICAL: 'physical',    // 物理
    FIRE: 'fire',           // 火
    ICE: 'ice',             // 冰
    LIGHTNING: 'lightning',  // 電
    POISON: 'poison',       // 毒
    HOLY: 'holy',           // 神聖
    SHADOW: 'shadow',       // 暗影
    ARCANE: 'arcane'        // 秘法
} as const;

/**
 * 元素類型的值類型
 */
export type ElementTypeValue = typeof ElementType[keyof typeof ElementType];

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
    STRENGTH: 'strength',          // 力量 - 影響物理攻擊力
    INTELLIGENCE: 'intelligence',  // 智力 - 影響魔法攻擊力  
    VITALITY: 'vitality',         // 體力 - 影響生命值
    AGILITY: 'agility',           // 敏捷 - 影響攻擊速度和閃避

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
    BLEED: 'bleed',

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
export type CategoryKey = 'debuff' | 'buff' | 'attribute' | 'combat';
export type PropertyValueType = 'single' | 'range' | 'composite';

/**
 * 元素到 Debuff 的映射關係
 * 用於判斷元素傷害應該施加的狀態效果
 */
export const ELEMENT_DEBUFF_MAP: Record<ElementTypeValue, PropertyTypeValue | null> = {
    [ElementType.PHYSICAL]: PropertyType.BLEED,      // 物理 → 流血
    [ElementType.FIRE]: PropertyType.BURN,           // 火 → 燃燒
    [ElementType.ICE]: PropertyType.FREEZE,          // 冰 → 冰凍
    [ElementType.LIGHTNING]: PropertyType.STUN,      // 電 → 眩暈
    [ElementType.POISON]: PropertyType.POISON,       // 毒 → 中毒
    [ElementType.HOLY]: null,                        // 神聖 → 無負面效果 (可能有治療/淨化)
    [ElementType.SHADOW]: PropertyType.SLOW,         // 暗影 → 緩速
    [ElementType.ARCANE]: null                       // 秘法 → 無固定效果 (可能有特殊機制)
};

/**
 * Debuff 到元素的反向映射
 * 用於從 Debuff 推導其元素屬性
 */
export const DEBUFF_TO_ELEMENT_MAP: Record<string, ElementTypeValue> = {
    [PropertyType.BLEED]: ElementType.PHYSICAL,
    [PropertyType.BURN]: ElementType.FIRE,
    [PropertyType.FREEZE]: ElementType.ICE,
    [PropertyType.STUN]: ElementType.LIGHTNING,
    [PropertyType.POISON]: ElementType.POISON,
    [PropertyType.SLOW]: ElementType.SHADOW
};
/**
 * 武器品質等級
 */
export type WeaponQuality = 'normal' | 'magic' | 'rare' | 'epic' | 'legendary';

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
    category: CategoryKey;
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
    elementType: ElementTypeValue; // 🆕 武器元素類型
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
    category: CategoryKey; // 效果類別
}

