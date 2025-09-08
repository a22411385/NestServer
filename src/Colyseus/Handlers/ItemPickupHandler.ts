import { Client } from "colyseus";
import { BaseMessageHandler } from "./Base/BaseMessageHandler";
import { GameRoom } from "../Rooms/GameRoom";
import { IMessageHandler, MessageData, PermissionLevel } from "@/Types";
import { ConfigManager } from "@/Game/Managers/ConfigManager";
import { ServerItem } from "../Schema/Item/ServerItem";

/**
 * 買賣請求數據結構
 */
interface BuyItemData {
    npcId: string;
    itemConfigId: string;
    quantity?: number;
}

interface SellItemData {
    npcId: string;
    playerItemId: string;
    quantity?: number;
}

/**
 * 物品撿取和買賣請求處理器
 */
export class ItemPickupHandler extends BaseMessageHandler implements IMessageHandler {

    // 🆕 買賣冷卻系統 - 每個玩家每個物品的冷卻時間記錄
    private buyCooldowns: Map<string, Map<string, number>> = new Map(); // playerSessionId -> itemConfigId -> timestamp
    private readonly BUY_COOLDOWN_MS = 5000; // 5秒冷卻時間
    private readonly SELL_DISCOUNT_RATE = 0.7; // 賣出折扣率 70%
    private readonly MAX_TRADE_DISTANCE = 1200; // 最大交易距離

    constructor(room: GameRoom) {
        super(room);
    }

    /**
     * 檢查是否能處理此類型消息
     */
    canHandle(type: string): boolean {
        return this.getSupportedTypes().includes(type);
    }

    /**
     * 獲取權限等級
     */
    getPermissionLevel(): PermissionLevel {
        return PermissionLevel.PLAYER;
    }

    /**
     * 獲取支援的消息類型
     */
    getSupportedTypes(): string[] {
        return ['pickItem', 'buyItem', 'sellItem'];
    }

    /**
     * 處理撿取物品請求
     */
    async handle(client: Client, message: MessageData): Promise<void> {
        try {
            const { type, data } = message;

            // 檢查權限
            if (!this.checkPermissions(client)) {
                console.warn(`❌ 權限不足: ${client.sessionId}`);
                return;
            }

            switch (type) {
                case "pickItem":
                    await this.handlePickItem(client, data);
                    break;

                case "buyItem":
                    await this.handleBuyItem(client, data);
                    break;

                case "sellItem":
                    await this.handleSellItem(client, data);
                    break;

                default:
                    console.warn(`❌ 未知的消息類型: ${type}`);
                    break;
            }

        } catch (error) {
            console.error('❌ 撿取請求處理錯誤:', error);
            client.send("error", { message: "處理撿取請求時發生錯誤" });
        }
    }

    /**
     * 處理撿取物品
     */
    private async handlePickItem(client: Client, data: any): Promise<void> {
        // 驗證請求數據
        if (!this.validatePickupData(data)) {
            console.warn(`❌ 無效的撿取請求數據: ${client.sessionId}`);
            return;
        }

        const { itemId } = data;
        const hero = this.room.state.getHero(client.sessionId);
        if (!hero) return;

        const heroPos = hero.position;

        // 調用撿取系統處理
        const pickupSystem = this.room.itemPickupSystem;
        const success = pickupSystem.handlePickupRequest(client.sessionId, itemId, { x: heroPos.x, y: heroPos.y });

        if (success) {
            this.room.broadcast('someOnePickItem', { heroId: client.sessionId, itemId });
        } else {
            console.log(`❌ 撿取失敗: ${client.sessionId} -> ${itemId}`);
            client.send('pickFail', { success: false, itemId, error: "撿取失敗" });
        }
    }

    /**
     * 🆕 處理購買物品
     */
    private async handleBuyItem(client: Client, data: BuyItemData): Promise<void> {
        const { npcId, itemConfigId, quantity = 1 } = data;

        // 基本驗證
        if (!this.validateBuyData(data)) {
            client.send('buyFail', { error: "INVALID_DATA", message: "無效的購買數據" });
            return;
        }

        const hero = this.room.state.getHero(client.sessionId);
        if (!hero) {
            client.send('buyFail', { error: "HERO_NOT_FOUND", message: "找不到英雄" });
            return;
        }

        // 檢查冷卻時間
        if (this.isOnCooldown(client.sessionId, itemConfigId)) {
            const remainingCooldown = this.getRemainingCooldown(client.sessionId, itemConfigId);
            client.send('buyFail', {
                error: "COOLDOWN_ACTIVE",
                message: `購買冷卻中，還需等待 ${Math.ceil(remainingCooldown / 1000)} 秒`,
                remainingCooldown
            });
            return;
        }

        // 檢查距離
        const npc = this.findNPCById(npcId);
        if (!npc) {
            client.send('buyFail', { error: "NPC_NOT_FOUND", message: "找不到NPC" });
            return;
        }

        const distance = Math.sqrt(
            Math.pow(hero.position.x - npc.position.x, 2) +
            Math.pow(hero.position.y - npc.position.y, 2)
        );

        if (distance > this.MAX_TRADE_DISTANCE) {
            client.send('buyFail', {
                error: "DISTANCE_TOO_FAR",
                message: `距離過遠，需要在 ${this.MAX_TRADE_DISTANCE} 像素內交易`,
                currentDistance: Math.floor(distance)
            });
            return;
        }

        // 檢查NPC是否販賣此物品
        if (!ConfigManager.canNpcSellItem(npcId, itemConfigId)) {
            client.send('buyFail', { error: "ITEM_NOT_AVAILABLE", message: "該NPC不販賣此物品" });
            return;
        }

        // 獲取物品配置
        const itemConfig = ConfigManager.getItemConfigById(itemConfigId);
        if (!itemConfig) {
            client.send('buyFail', { error: "ITEM_NOT_FOUND", message: "找不到物品配置" });
            return;
        }

        // 計算總價
        const totalPrice = itemConfig.sellPrice * quantity;

        // 檢查玩家金錢
        if (hero.gold < totalPrice) {
            client.send('buyFail', {
                error: "INSUFFICIENT_FUNDS",
                message: `金錢不足，需要 ${totalPrice} 金幣，目前有 ${hero.gold} 金幣`,
                required: totalPrice,
                current: hero.gold
            });
            return;
        }

        // 檢查背包空間
        if (hero.inventory.length >= 60) { // 假設背包上限60個
            client.send('buyFail', { error: "INVENTORY_FULL", message: "背包已滿" });
            return;
        }

        // 執行購買
        try {
            // 扣除金錢
            hero.gold -= totalPrice;

            // 創建物品並加入背包
            const item = this.createItemFromConfig(itemConfig, quantity);
            hero.inventory.push(item);

            // 設置冷卻時間
            this.setCooldown(client.sessionId, itemConfigId);

            // 回應成功
            client.send('buySuccess', {
                itemConfigId,
                quantity,
                totalPrice,
                remainingGold: hero.gold,
                item: {
                    id: item.id,
                    name: item.name,
                    type: item.itemType,
                    quantity
                }
            });

            console.log(`💰 ${hero.name} 從 ${npc.name} 購買了 ${quantity}x ${itemConfig.name}，花費 ${totalPrice} 金幣`);

        } catch (error) {
            console.error('購買處理錯誤:', error);
            client.send('buyFail', { error: "TRANSACTION_ERROR", message: "交易處理失敗" });
        }
    }

    /**
     * 🆕 處理賣出物品
     */
    private async handleSellItem(client: Client, data: SellItemData): Promise<void> {
        const { npcId, playerItemId, quantity = 1 } = data;

        // 基本驗證
        if (!this.validateSellData(data)) {
            client.send('sellFail', { error: "INVALID_DATA", message: "無效的賣出數據" });
            return;
        }

        const hero = this.room.state.getHero(client.sessionId);
        if (!hero) {
            client.send('sellFail', { error: "HERO_NOT_FOUND", message: "找不到英雄" });
            return;
        }

        // 檢查距離
        const npc = this.findNPCById(npcId);
        if (!npc) {
            client.send('sellFail', { error: "NPC_NOT_FOUND", message: "找不到NPC" });
            return;
        }

        const distance = Math.sqrt(
            Math.pow(hero.position.x - npc.position.x, 2) +
            Math.pow(hero.position.y - npc.position.y, 2)
        );

        if (distance > this.MAX_TRADE_DISTANCE) {
            client.send('sellFail', {
                error: "DISTANCE_TOO_FAR",
                message: `距離過遠，需要在 ${this.MAX_TRADE_DISTANCE} 像素內交易`,
                currentDistance: Math.floor(distance)
            });
            return;
        }

        // 找到玩家背包中的物品
        const itemIndex = hero.inventory.findIndex(item => item.uniqueId === playerItemId);
        if (itemIndex === -1) {
            client.send('sellFail', { error: "ITEM_NOT_FOUND", message: "背包中找不到此物品" });
            return;
        }

        const playerItem = hero.inventory[itemIndex];

        // 檢查數量
        if (playerItem.value < quantity) {
            client.send('sellFail', {
                error: "INSUFFICIENT_QUANTITY",
                message: `物品數量不足，擁有 ${playerItem.value}，要賣出 ${quantity}`,
                available: playerItem.value,
                requested: quantity
            });
            return;
        }

        // 獲取物品配置來計算賣價
        const itemConfig = ConfigManager.getItemConfigById(playerItem.materialId || playerItem.itemType);
        if (!itemConfig) {
            client.send('sellFail', { error: "ITEM_CONFIG_NOT_FOUND", message: "找不到物品配置" });
            return;
        }

        // 計算賣價 (sellPrice * 折扣率)
        const sellPrice = Math.floor(itemConfig.sellPrice * this.SELL_DISCOUNT_RATE * quantity);

        // 執行賣出
        try {
            // 增加金錢
            hero.gold += sellPrice;

            // 處理物品數量
            if (playerItem.value <= quantity) {
                // 全部賣出，移除物品
                hero.inventory.splice(itemIndex, 1);
            } else {
                // 部分賣出，減少數量
                playerItem.value -= quantity;
            }

            // 回應成功
            client.send('sellSuccess', {
                playerItemId,
                quantity,
                sellPrice,
                remainingGold: hero.gold,
                itemName: playerItem.name
            });

            console.log(`💰 ${hero.name} 向 ${npc.name} 賣出了 ${quantity}x ${playerItem.name}，獲得 ${sellPrice} 金幣`);

        } catch (error) {
            console.error('賣出處理錯誤:', error);
            client.send('sellFail', { error: "TRANSACTION_ERROR", message: "交易處理失敗" });
        }
    }

    /**
     * 驗證撿取請求數據
     */
    private validatePickupData(data: any): boolean {
        if (!data || typeof data !== 'object') {
            return false;
        }

        // 檢查必要欄位
        if (typeof data.itemId !== 'string' || !data.itemId) {
            console.warn('❌ 撿取請求缺少有效的 itemId');
            return false;
        }

        return true;
    }

    // ================================
    // 🛠️ 交易相關輔助方法
    // ================================

    /**
     * 驗證購買請求數據
     */
    private validateBuyData(data: any): data is BuyItemData {
        return data &&
            typeof data.npcId === 'string' && data.npcId.length > 0 &&
            typeof data.itemConfigId === 'string' && data.itemConfigId.length > 0 &&
            (data.quantity === undefined || (typeof data.quantity === 'number' && data.quantity > 0));
    }

    /**
     * 驗證賣出請求數據
     */
    private validateSellData(data: any): data is SellItemData {
        return data &&
            typeof data.npcId === 'string' && data.npcId.length > 0 &&
            typeof data.playerItemId === 'string' && data.playerItemId.length > 0 &&
            (data.quantity === undefined || (typeof data.quantity === 'number' && data.quantity > 0));
    }

    /**
     * 檢查物品是否在冷卻中
     */
    private isOnCooldown(playerId: string, itemConfigId: string): boolean {
        const playerCooldowns = this.buyCooldowns.get(playerId);
        if (!playerCooldowns) return false;

        const lastBuyTime = playerCooldowns.get(itemConfigId);
        if (!lastBuyTime) return false;

        return Date.now() - lastBuyTime < this.BUY_COOLDOWN_MS;
    }

    /**
     * 獲取剩餘冷卻時間（毫秒）
     */
    private getRemainingCooldown(playerId: string, itemConfigId: string): number {
        const playerCooldowns = this.buyCooldowns.get(playerId);
        if (!playerCooldowns) return 0;

        const lastBuyTime = playerCooldowns.get(itemConfigId);
        if (!lastBuyTime) return 0;

        const elapsed = Date.now() - lastBuyTime;
        return Math.max(0, this.BUY_COOLDOWN_MS - elapsed);
    }

    /**
     * 設置購買冷卻時間
     */
    private setCooldown(playerId: string, itemConfigId: string): void {
        let playerCooldowns = this.buyCooldowns.get(playerId);
        if (!playerCooldowns) {
            playerCooldowns = new Map();
            this.buyCooldowns.set(playerId, playerCooldowns);
        }
        playerCooldowns.set(itemConfigId, Date.now());
    }

    /**
     * 根據ID尋找NPC
     */
    private findNPCById(npcId: string): any {
        // 從所有單位中尋找指定的NPC
        return this.room.state.allUnits.get(npcId);
    }

    /**
     * 從配置創建物品
     */
    private createItemFromConfig(itemConfig: any, quantity: number): any {
        // 使用 ServerItem 靜態方法創建物品（不需要位置信息）
        let item: ServerItem | null = null;

        switch (itemConfig.type) {
            case 'gold':
                item = ServerItem.createGold(0, 0, quantity);
                break;
            case 'material':
            case 'consumable':
            case 'misc':
                item = ServerItem.createMaterial(0, 0, itemConfig.id, itemConfig.name, quantity);
                break;
            default:
                item = ServerItem.createMaterial(0, 0, itemConfig.id, itemConfig.name, quantity);
                break;
        }

        if (!item) {
            throw new Error(`無法創建物品: ${itemConfig.name}`);
        }

        return item;
    }
}
