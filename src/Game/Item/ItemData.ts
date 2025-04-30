

export class ItemBase {
    ItemId: string;
    Name: string;
    Type: 'equipment' | 'consumable' | 'junk';
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
    type: 'cloth' | 'leather' | 'staff' | 'plate' | 'oneHandSword' | 'twoHandSword' | 'bow' | 'dagger' | 'shield' | 'tome'
    affixPool: string[];
    affixCount: number;
    durability: [number, number];
    Lv: number;

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
    instanceId: string;
    itemId: string;
    type: string;
    quantity: number;
    createdAt: number;
}

export class PlayerEquipmentData {
    instanceId: string;
    durability: number;
    affixes: {
        key: string;
        value: number;
    }[];
}