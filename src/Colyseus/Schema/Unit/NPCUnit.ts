import { ArraySchema, type } from "@colyseus/schema";
import { ItemType, ServerItem } from "../Item/ServerItem";
import { ServerGameUnit } from "./GameUnit";
import { ConfigManager } from "../../../Game/Managers/Config/ConfigManager";

export class ServerNPC extends ServerGameUnit {

    //販售的物品
    @type([ServerItem]) sellItems: ArraySchema<ServerItem> = new ArraySchema<ServerItem>();

    /**
     * 🆕 初始化NPC的商品列表
     * 根據NPCId從ItemConfig中載入可販賣的物品
     */
    public initializeMerchantItems(): void {
        // 清空現有商品
        this.sellItems.clear();

        // 從配置中獲取該NPC可販賣的物品
        const merchantItems = ConfigManager.getItemsByNpcId(this.id);

        console.log(`🏪 NPC ${this.name} (${this.id}) 載入商品 ${merchantItems.length} 件`);

        // 為每個商品創建ServerItem實例
        merchantItems.forEach(itemConfig => {
            const item = new ServerItem(itemConfig.id, itemConfig.type, itemConfig.name, this.position.x, this.position.y);
            item.uniqueId = `npc_${this.id}_${itemConfig.id}`;
            item.value = itemConfig.sellPrice; // 使用販賣價格作為顯示價格
            item.itemId = itemConfig.id; // 保存原始配置ID
            item.createdAt = Date.now();
            item.expiresAt = 0; // NPC商品不會過期

            this.sellItems.push(item);
        });

        console.log(`✅ NPC ${this.name} 商品載入完成`);
    }

    /**
     * 🆕 檢查是否有指定物品可販賣
     */
    public hasItemForSale(itemConfigId: string): boolean {
        return ConfigManager.canNpcSellItem(this.id, itemConfigId);
    }

    /**
     * 🆕 獲取物品的販賣價格
     */
    public getItemPrice(itemConfigId: string): number {
        const itemConfig = ConfigManager.getItemConfigById(itemConfigId);
        return itemConfig?.sellPrice || 0;
    }
}