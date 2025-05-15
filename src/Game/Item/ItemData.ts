import { ITEM_RATE, ITEM_TYPE, MonsterKind } from "src/Shared/Enum";


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
    Rate: ITEM_RATE
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
export interface IItemBase {
    name: string;
    itemId: string;
    price: number;
    type: ITEM_TYPE;
    rate: ITEM_RATE;
}
export class PlayerItem implements IItemBase {

    constructor(
        public name: string,
        public itemId: string,
        public price: number,
        public type: ITEM_TYPE,
        public rate: ITEM_RATE) {
    }
}

export class PlayerEquipmentData implements IItemBase {

    constructor(
        public name: string,
        public itemId: string,
        public price: number,
        public type: ITEM_TYPE,
        public rate: ITEM_RATE,
        public value: number,
        public affixes: {
            key: string;
            value: number;
        }[]
    ) {

    }
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