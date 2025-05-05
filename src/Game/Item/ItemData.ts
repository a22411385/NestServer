import { MonsterKind } from "src/Shared/Enum";

export type ITEM_TYPE = 'equipment' | 'consumable' | 'junk' | 'currency';
export type EQUIP_VERSION = 'normal' | 'superior' | 'exceptional' | 'elite';
export class ItemBase {
    ItemId: string;
    Name: string;
    Type: ITEM_TYPE;
    Price: number;
    Description: string;
    Icon: string;
    Stackable: boolean;
    MaxStack: number;
    Sellable: boolean;
    Rate: 'common' | 'uncommon' | 'rate' | 'epic' | 'legend'
}

export class EquipmentItem {
    itemId: string;
    slot: 'head' | 'chest' | 'mainHand' | 'offHand' | 'gloves' | 'boots';
    type: 'cloth' | 'leather' | 'staff' | 'plate' | 'oneHandSword' | 'twoHandSword' | 'bow' | 'dagger' | 'shield' | 'tome';
    baseValue: number //裝備基值 武器:攻擊力 防具:防禦
    // affixPool: string[];
    //   affixCount: number;
    //  durability: [number, number];
    //  Lv: number;

}

export class AffixDefinition {
    affixId: string;
    key: string;
    name: string;
    min: number;
    max: number;
    weight: number;
}

export class ConsumableItem {

    itemId: string;
    effectType: string;
    effectValue: number;
    duration: number;
    cooldown: number;

}

export class PlayerItem {

    itemId: string;
    price: number;
    type: ITEM_TYPE;
    rate: 'common' | 'uncommon' | 'rate' | 'epic' | 'legend';
}

export class PlayerEquipmentData extends PlayerItem {

    value: number = 0; //防禦或攻擊值
    affixes: {
        key: string;
        value: number;
    }[];
}

export class MainGroupData {
    groupId: string;
    rolls: number;

}


export class GroupEntrieData {
    groupId: string;
    refType: string;
    refId: string;
    weight: number;
    qtyMin: number;
    qtyMax: number;

}

export interface DropOptions { kind: MonsterKind; level: number; }

export class RandomAffixData {
    type: string; mainAffix: string; subAffix: string;
}