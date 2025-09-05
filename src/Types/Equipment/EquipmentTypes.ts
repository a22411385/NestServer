/**
 * 裝備系統類型定義
 * 統一使用 AttributeBonus 作為所有裝備的屬性加成系統
 */

// 重新導入統一的屬性加成接口和屬性系統
import { AttributeBonus } from "../Game/GameTypes";
import { PropertyType, PropertyValue } from "./WeaponPropertyTypes";

/**
 * 重新導出統一的屬性系統供裝備使用
 */
export { AttributeBonus, PropertyType, PropertyValue };

/**
 * 裝備槽位類型枚舉
 */
export enum EquipmentSlotType {
    WEAPON_PRIMARY = 'weapon_primary',     // 主武器
    WEAPON_SECONDARY = 'weapon_secondary', // 副武器
    HELMET = 'helmet',                     // 頭盔
    CHEST = 'chest',                       // 胸甲
    LEGS = 'legs',                         // 腿甲
    BOOTS = 'boots',                       // 靴子
    GLOVES = 'gloves',                     // 手套
    RING_1 = 'ring_1',                     // 戒指1
    RING_2 = 'ring_2',                     // 戒指2
    NECKLACE = 'necklace',                 // 項鍊
    ACCESSORY = 'accessory'                // 飾品
}

/**
 * 裝備品質等級 - 與武器品質統一
 */
export enum EquipmentQuality {
    NORMAL = 'normal',      // 普通
    MAGIC = 'magic',        // 魔法
    RARE = 'rare',          // 稀有
    EPIC = 'epic',          // 史詩
    LEGENDARY = 'legendary' // 傳奇
}

/**
 * 裝備基礎定義
 */
export interface EquipmentDefinition {
    id: string;
    name: string;
    slotType: EquipmentSlotType;
    quality: EquipmentQuality;
    level: number;
    fixedProperties: PropertyValue[];  // 固定屬性
    randomProperties?: PropertyValue[]; // 隨機屬性
    requirements?: {
        level?: number;
        strength?: number;
        intelligence?: number;
        vitality?: number;
        agility?: number;
    };
    description: string;
}
