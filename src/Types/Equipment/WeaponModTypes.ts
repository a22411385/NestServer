/**
 * 🎯 POE 風格統一詞綴系統類型定義
 * 
 * 設計理念：
 * - 合併 WeaponModifiers 和 AttributeBonus 為單一 WeaponMods 表
 * - 一個詞綴可以影響多個屬性（複合詞綴）
 * - 通過 category 和 modType 區分詞綴類型
 * - 支援隨機生成、權重系統、等級需求
 * 
 * @version 2.0.0
 * @date 2025-01-05
 */

/**
 * 詞綴類別
 */
export type ModCategory =
    | 'attribute'      // 角色基礎屬性（力量、敏捷、智力、體質）
    | 'combat'         // 戰鬥屬性（暴擊、生命偷取、傷害）
    | 'mechanic'       // 攻擊機制（穿透、連鎖、彈射、掃擊）
    | 'support';       // 輔助效果（治療、增益、範圍）

/**
 * 詞綴類型（POE 風格）
 */
export type ModType =
    | 'prefix'         // 前綴詞綴（通常是攻擊性/數值性）
    | 'suffix'         // 後綴詞綴（通常是防禦性/機制性）
    | 'implicit';      // 隱性詞綴（武器基底固有）

/**
 * 修改器類型
 */
export type ModifierType =
    | 'flat'           // 固定值加成
    | 'increased'      // 提高百分比（加法疊加）
    | 'more';          // 更多百分比（乘法疊加）

/**
 * 🆕 統一詞綴定義（POE 風格）
 * 合併 WeaponModifiers 和 AttributeBonus
 */
export interface WeaponMod {
    // 基本資訊
    id: string;                    // 詞綴 ID (piercing, strength, critical_strike)
    displayName: string;           // 顯示名稱
    description: string;           // 描述
    tags: string;                  // 標籤（逗號分隔）

    // 🔑 核心：扁平結構（每個 id 只有一個條目）
    affectedStat: string;          // 影響的屬性
    value: number;                 // 數值
    valueType: string;             // 數值類型
    modifierType: ModifierType;    // 修改器類型（flat/increased/more）

    // 詞綴分類
    category: ModCategory;         // 詞綴類別
    modType: ModType;              // 詞綴類型（前綴/後綴/隱性）

    // 生成規則
    stackable: boolean;            // 是否可堆疊
    weight: number;                // 詞綴權重（隨機生成時使用，0 = 不隨機生成）
    requiredLevel: number;         // 需求等級

    // 系統控制
    enabled: boolean;              // 是否啟用
}

/**
 * 🆕 詞綴實例（裝備在武器上的詞綴）
 * 從 WeaponMod 實例化而來，包含實際隨機值
 */
export interface WeaponModInstance {
    modId: string;                 // 參照 WeaponMod.id
    displayName: string;           // 顯示名稱

    // 實際生成的修改器（已隨機數值）
    modifiers: {
        affectedStat: string;
        value: number;             // 實際隨機生成的數值
        valueType: string;
        modifierType: ModifierType;
    }[];

    modType: ModType;              // 詞綴類型
    category: ModCategory;         // 詞綴類別
}

/**
 * CSV 欄位對應（用於 Google Sheets）- 拆分欄位版本
 * 
 * 欄位說明：
 * - id: 詞綴唯一 ID
 * - displayName: 顯示名稱
 * - description: 描述
 * - tags: 標籤（逗號分隔）
 * - affectedStat: 影響的屬性 ID（拆分自 modifiers）
 * - value: 屬性值（固定值，字串格式）
 * - valueType: 數值單位（拆分自 modifiers）
 * - modifierType: 修改器類型（拆分自 modifiers）
 * - category: 類別（attribute, combat, mechanic, support）
 * - modType: 詞綴類型（prefix, suffix, implicit）
 * - stackable: 是否可堆疊（TRUE/FALSE）
 * - weight: 權重（0-1000）
 * - requiredLevel: 需求等級
 * - enabled: 是否啟用（TRUE/FALSE）
 * 
 * 注意：複合詞綴使用多行表示（相同 id，不同 affectedStat）
 */
export interface WeaponModCSV {
    id: string;
    displayName: string;
    description: string;
    tags: string;
    // 🆕 拆分欄位（取代 JSON modifiers）
    affectedStat: string;          // 影響的屬性 ID
    value: string;                 // 屬性值（字串格式）
    valueType: string;             // 數值單位
    modifierType: string;          // flat | increased | more
    category: string;
    modType: string;
    stackable: string;             // 'TRUE' | 'FALSE'
    weight: string;                // 數字字串
    requiredLevel: string;         // 數字字串
    enabled: string;               // 'TRUE' | 'FALSE'
}
