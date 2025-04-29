interface LootItem {
    itemId: string;
    dropRate: number;
    quantityMin: number;
    quantityMax: number;
}

interface LootGroup {
    groupId: string;
    type: 'PickOne' | 'RollEach'; // 群組型態
    lootItems: LootItem[];
}

interface MonsterLoot {
    monsterId: string;
    lootGroups: LootGroup[];
}