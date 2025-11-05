/**
 * 武器屬性系統類型定義 - POE 風格標籤系統
 * 完全配置驅動，支援動態標籤匹配和修改器系統
 */

/**
 * 修改器類型 - POE 風格命名
 * 決定數值如何影響最終計算
 * 
 * @deprecated 使用 WeaponModTypes.ts 中的 ModifierType
 */
export enum ModifierType {
    FLAT = 'flat',              // 固定值加成 (+15)
    INCREASED = 'increased',    // 百分比加成，加法疊加 (+15%)
    MORE = 'more'               // 百分比乘法，乘法疊加 (更多 15%)
}

/**
 * 🆕 從 WeaponModTypes 導入統一的 ModifierType
 * 避免重複定義
 */
export type { ModifierType as WeaponModifierType } from './WeaponModTypes';

/**
 * 屬性類別
 */
export type CategoryKey = 'combat' | 'debuff' | 'buff' | 'attribute';

/**
 * 武器品質等級
 */
export type WeaponQuality = 'normal' | 'magic' | 'rare' | 'epic' | 'legendary';

/**
 * 標籤類別
 */
export type TagCategory = 'element' | 'ailment' | 'attack_type' | 'weapon_type' | 'function' | 'category';

/**
 * 🆕 標籤定義 (從 Google Sheets 載入)
 * 用於管理和驗證所有可用標籤
 */
export interface TagDefinition {
    id: string;                      // 標籤ID (fire, ailment, melee)
    displayName: string;             // 顯示名稱（中文）
    description: string;             // 標籤說明
    category: TagCategory;           // 標籤類別
    color?: string;                  // UI 顯示顏色 (#FF0000)
    icon?: string;                   // 圖示名稱或路徑
    parent?: string;                 // 父級標籤ID（支援層級關係）
    enabled: boolean;                // 是否啟用
}

/**
 * 🆕 狀態效果定義 (從 Google Sheets 載入)
 * 定義可以作用在目標身上的臨時效果（異常狀態、控制效果等）
 * 完全重新設計，基於標籤系統
 */
export interface StatusEffectDefinition {
    id: string;                      // 效果ID (burn, stun, slow, freeze)
    displayName: string;             // 顯示名稱
    description: string;             // 描述
    tags: string;                    // 標籤 (fire,ailment,elemental)

    // 🆕 基礎數值（固定值，不再有 min/max）
    baseProbability: number;         // 基礎觸發機率 (0-100)
    duration: number;                // 持續時間 (秒)
    baseDamage: number;              // 基礎傷害
    damageScaling: number;           // 傷害縮放 (武器攻擊力的百分比)

    // 🆕 修改器類型（決定如何應用這個屬性）
    defaultModifierType: ModifierType;

    // 🆕 傷害計算相關（從配置表讀取，取代硬編碼）
    elementTags: string;             // 元素標籤（複選，逗號分隔）如: "physical,fire" (火焰拳 = 物理+火系)
    damageType: 'physical' | 'magic' | 'true'; // 傷害類型（單選）決定防禦計算方式

    category: CategoryKey;           // 屬性類別
    stackable: boolean;              // 是否可堆疊
}

/**
 * @deprecated 已合併到 WeaponMod (WeaponModTypes.ts)
 * 🆕 武器詞綴定義 (從 Google Sheets 載入)
 * 定義武器的固定特性和攻擊機制
 */
export interface WeaponModifier {
    id: string;                      // 詞綴ID (piercing, chain_attack, critical_chance)
    displayName: string;             // 顯示名稱
    description: string;             // 描述
    tags: string;                    // 標籤 (attack,mechanic,pierce)

    // 詞綴數值
    baseValue: number;               // 基礎數值
    valueType: string;               // 顯示單位 (可使用中文: '%', '次', '度', '距離' 等)

    // 修改器配置
    modifierType: ModifierType;      // 修改器類型
    affectedStat: string;            // 影響的屬性 (如 'damage', 'speed', 'pierce_count')

    category: 'attack_mechanic' | 'combat_stat' | 'support'; // 類別
    stackable: boolean;              // 是否可堆疊
    enabled: boolean;                // 是否啟用
}

/**
 * @deprecated 已合併到 WeaponMod (WeaponModTypes.ts)
 * 🆕 屬性加成定義 (從 Google Sheets 載入)
 * 定義角色/武器的永久性屬性加成
 */
export interface AttributeBonus {
    id: string;                      // 屬性ID (strength, vitality, attack_damage)
    displayName: string;             // 顯示名稱
    description: string;             // 描述
    tags: string;                    // 標籤 (attribute,character,physical)

    // 加成數值
    baseValue: number;               // 基礎加成值

    // 修改器配置
    modifierType: ModifierType;      // 修改器類型 (FLAT, INCREASED, MORE)
    affectedStat: string;            // 影響的屬性 (如 'strength', 'max_health', 'attack_damage')

    category: 'character_stat' | 'weapon_stat'; // 類別
    stackable: boolean;              // 是否可堆疊
    enabled: boolean;                // 是否啟用
}

/**
 * 🆕 武器配置定義 (從 Google Sheets 載入)
 * 添加標籤系統支持
 */
export interface WeaponConfigDefinition {
    id: string;
    name: string;
    description: string;

    // 🆕 標籤系統（取代 elementType）
    tags: string;                    // 標籤列表 (weapon,melee,sword,fire)

    // 基礎屬性
    baseDamage: number;
    attackSpeed: number;
    attackRange: number;

    // 武器類別（用於實例化）
    classModule: string;             // MeleeWeapon, ProjectileWeapon, etc.

    // 屬性配置
    effectProperties: string;      // 武器效果屬性列表 (burn,sweep_angle)

    // ✨ 新：統一詞綴系統
    weaponMods?: string;           // 統一武器詞綴列表 (strength_mod,piercing,critical_chance)

    enabled: boolean;
}

/**
 * 🆕 狀態效果實例值 (作用在目標身上的效果實例)
 * 從 StatusEffectDefinition 實例化而來
 */
export interface PropertyValue {
    id: string;                      // 屬性ID
    displayName: string;             // 顯示名稱
    tags: string[];                  // 標籤列表

    // 🆕 修改器類型
    modifierType: ModifierType;

    // 數值
    value: number;                   // 主要數值（用途取決於屬性類型）
    probability: number;             // 觸發機率 (0-100)
    duration: number;                // 持續時間 (秒)
    baseDamage: number;              // 基礎傷害
    damageScaling: number;           // 傷害縮放比例

    category: CategoryKey;
    stackable: boolean;
}

