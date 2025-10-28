import { Schema, type } from "@colyseus/schema";
import { Vector2 } from "../Unit/GameUnit";
import { WeaponSchema } from "../Weapon/WeaponSchema";
import { UniqueIdGenerator } from "../../../Util/UniqueIdGenerator";

// 類型別名保持兼容性
type WeaponData = WeaponSchema;

export enum ItemType {
    CURRENCY = "CURRENCY",
    EXP = "EXP",
    MATERIAL = "MATERIAL",
    WEAPON = "WEAPON",
    CONSUMABLE = "CONSUMABLE",
    MISC = "MISC",
}

// --- 統一物品類 ---
export class ServerItem extends Schema {
    @type("string") uniqueId: string = "";

    @type("string") itemId: string = "";
    @type("string") name: string = "";
    @type("string") itemType: string = ItemType.CURRENCY;
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") value: number = 0;
    @type("number") createdAt: number = Date.now();
    @type("number") expiresAt: number = Date.now() + 30000; // 30秒後消失

    constructor(id: string, itemType: ItemType, name: string, x: number = 0, y: number = 0) {
        super();
        this.uniqueId = this.generateId(itemType);
        this.name = name;
        this.itemId = id;
        this.itemType = itemType;
        this.x = x;
        this.y = y;
    }

    private generateId(itemType: ItemType): string {
        const typeMap: Record<ItemType, string> = {
            [ItemType.CURRENCY]: 'currency',
            [ItemType.EXP]: 'exp',
            [ItemType.MATERIAL]: 'material',
            [ItemType.WEAPON]: 'weapon',
            [ItemType.CONSUMABLE]: 'consumable',
            [ItemType.MISC]: 'misc'
        };
        return UniqueIdGenerator.generateItemId(typeMap[itemType] || 'generic');
    }

    public isExpired(): boolean {
        return Date.now() > this.expiresAt;
    }

    /**
     * 創建金幣物品
     */
    static createGold(x: number, y: number, amount: number): ServerItem {
        const item = new ServerItem('gold', ItemType.CURRENCY, "", x, y);
        item.value = amount;
        return item;
    }

    /**
     * 創建經驗值物品
     */
    static createExp(x: number, y: number, amount: number): ServerItem {
        const item = new ServerItem('exp', ItemType.EXP, "", x, y);
        item.value = amount;
        return item;
    }

    /**
     * 創建材料物品
     */
    static createMaterial(x: number, y: number, itemId: string, name: string, quantity: number = 1): ServerItem {
        const item = new ServerItem(itemId, ItemType.MATERIAL, name, x, y);
        item.itemId = itemId;
        item.value = quantity;
        return item;
    }
}

