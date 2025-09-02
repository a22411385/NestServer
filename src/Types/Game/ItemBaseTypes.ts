/**
 * 道具基礎類型定義
 */

/**
 * 道具基礎接口
 */
export interface IItemBase {
    name: string;
    itemId: string;
    price: number;
    type: ITEM_TYPE;
    rate: ITEM_RATE;
}

/**
 * 掉落選項接口
 */
export interface DropOptions {
    kind: MonsterKind;
    level: number;
}

export enum ITEM_TYPE {
    WEAPON = "weapon",
    ARMOR = "armor",
    ACCESSORY = "accessory",
    CONSUMABLE = "consumable",
    MATERIAL = "material",
    QUEST = "quest"
}

export enum ITEM_RATE {
    COMMON = "common",
    UNCOMMON = "uncommon",
    RARE = "rare",
    EPIC = "epic",
    LEGENDARY = "legendary"
}

export enum MonsterKind {
    NORMAL = 1,
    ELITE = 2,
    BOSS = 3,
    MINI_BOSS = 4
}
