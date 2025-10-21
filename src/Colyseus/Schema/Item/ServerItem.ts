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

    // 武器相關屬性（只有武器類型才使用）
    @type("string") quality: string = "";
    @type("number") level: number = 1;
    @type("number") enhanceLevel: number = 0;
    @type("number") exp: number = 0;
    @type("number") durability: number = 100;
    @type("string") weaponPropertiesJson: string = ""; // 武器屬性數據（序列化存儲）

    private classModule: string = "";
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

    /**
     * 從 WeaponData 創建掉落物品（玩家丟棄武器時使用）
     */
    static createFromWeaponData(weaponData: WeaponData, x: number, y: number): ServerItem {
        const item = new ServerItem(weaponData.weaponId, ItemType.WEAPON, weaponData.name, x, y);

        // 複製武器基本屬性
        item.itemId = weaponData.weaponId;
        item.quality = weaponData.quality || weaponData.rarity;
        item.level = weaponData.level;
        item.enhanceLevel = weaponData.enhanceLevel;
        item.exp = weaponData.exp;
        item.durability = weaponData.durability;
        item.classModule = weaponData.classModule;

        // 序列化武器屬性數據 (包含完整屬性值)
        item.weaponPropertiesJson = JSON.stringify({
            fixedProperties: weaponData.fixedProperties?.toArray() || [],
            randomProperties: weaponData.randomProperties?.toArray() || [],
            uniqueId: weaponData.uniqueId, // 保留原始唯一ID
            propertiesJson: weaponData.propertiesJson // ✅ 保存完整屬性值
        });

        return item;
    }

    /**
     * 轉換為 WeaponData（撿起武器時使用）
     */
    public toWeaponData(): WeaponData | null {
        if (this.itemType !== ItemType.WEAPON) {
            return null;
        }

        const weaponData = new WeaponSchema(this.itemId, this.classModule);
        weaponData.name = this.name;
        // 複製基本屬性
        weaponData.weaponId = this.itemId;
        weaponData.quality = this.quality;
        weaponData.rarity = this.quality; // 保持兼容性
        weaponData.level = this.level;
        weaponData.enhanceLevel = this.enhanceLevel;
        weaponData.exp = this.exp;
        weaponData.durability = this.durability;

        // 反序列化武器屬性
        if (this.weaponPropertiesJson) {
            try {
                const properties = JSON.parse(this.weaponPropertiesJson);

                // 恢復唯一ID（如果存在）
                if (properties.uniqueId) {
                    weaponData.uniqueId = properties.uniqueId;
                } else {
                    weaponData.uniqueId = this.generateUniqueWeaponId();
                }

                // 恢復屬性數據
                if (properties.fixedProperties) {
                    weaponData.fixedProperties.clear();
                    properties.fixedProperties.forEach((prop: any) => {
                        weaponData.fixedProperties.push(prop);
                    });
                }

                if (properties.randomProperties) {
                    weaponData.randomProperties.clear();
                    properties.randomProperties.forEach((prop: any) => {
                        weaponData.randomProperties.push(prop);
                    });
                }

                // ✅ 恢復完整屬性值
                if (properties.propertiesJson) {
                    weaponData.propertiesJson = properties.propertiesJson;
                    console.log(`✅ 恢復武器屬性: ${this.itemId}, 屬性數據: ${properties.propertiesJson.substring(0, 50)}...`);
                }

            } catch (error) {
                console.error("武器屬性反序列化失敗:", error);
                // 如果反序列化失敗，生成新的唯一ID
                weaponData.uniqueId = this.generateUniqueWeaponId();
            }
        } else {
            // 沒有屬性數據，生成新的唯一ID
            weaponData.uniqueId = this.generateUniqueWeaponId();
        }

        return weaponData;
    }

    private generateUniqueWeaponId(): string {
        return UniqueIdGenerator.generateWeaponId();
    }
}

