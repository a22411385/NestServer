import { Client } from "colyseus";
import { BaseMessageHandler } from "./Base/BaseMessageHandler";
import { GameRoom } from "../Rooms/GameRoom";
import { IMessageHandler, MessageData, PermissionLevel } from "@/Types";
import { UnitManager } from "@/Game/Managers/UnitManager";

/**
 * 物品撿取請求處理器
 */
export class ItemPickupHandler extends BaseMessageHandler implements IMessageHandler {

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
        return ['pickItem'];
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

            // 驗證請求數據
            if (!this.validatePickupData(data)) {
                console.warn(`❌ 無效的撿取請求數據: ${client.sessionId}`);
                return;
            }
            switch (type) {
                case "pickItem":
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
                        // 發送失敗回應給客戶端
                        client.send('pickFail', { success: false, itemId, error: "撿取失敗" });
                    }
                    break;


            }



        } catch (error) {
            console.error('❌ 撿取請求處理錯誤:', error);
            client.send("error", { message: "處理撿取請求時發生錯誤" });
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
}
