import { Client } from "colyseus";
import { BaseMessageHandler } from "./Base/BaseMessageHandler";
import { MessageData, PermissionLevel } from "@/Types";

/**
 * 裝備消息處理器
 * 處理裝備穿脫相關的消息
 */
export class EquipmentHandler extends BaseMessageHandler {
    private supportedTypes = [
        "equip_weapon",        // 🔧 修正為前端使用的消息類型
        "unequip_weapon",      // 🔧 修正為前端使用的消息類型
        "addWeapon",           // 🆕 添加武器到背包
        "removeWeapon",        // 🆕 從背包移除武器
    ];

    getPermissionLevel(): PermissionLevel {
        return PermissionLevel.USER;
    }

    canHandle(type: string): boolean {
        return this.supportedTypes.includes(type);
    }

    getSupportedTypes(): string[] {
        return [...this.supportedTypes];
    }

    async handle(client: Client, message: MessageData): Promise<void> {
        const { type, data } = message;

        try {
            switch (type) {

                case "equip_weapon":      // 🔧 修正消息類型
                    this.handleEquipWeapon(client, data);
                    break;
                case "unequip_weapon":    // 🔧 修正消息類型
                    this.handleUnequipWeapon(client, data);
                    break;
                case "addWeapon":
                    this.handleAddWeapon(client, data);
                    break;
                case "removeWeapon":
                    this.handleRemoveWeapon(client, data);
                    break;

                default:
                    throw new Error(`Unsupported equipment message type: ${type}`);
            }

            this.logHandle(type, client.id, true);
        } catch (error) {
            this.logHandle(type, client.id, false, error.message);
            this.sendError(client, error.message);
        }
    }

    /**
     * 處理裝備武器請求
     * 🎯 使用Schema自動同步，不需要返回詳細狀態
     */
    private handleEquipWeapon(client: Client, data: any): void {
        if (!this.validateMessage(data, ['weaponId'])) {
            throw new Error("無效的武器裝備數據");
        }

        const { weaponId } = data;
        const playerId = client.sessionId;
        const hero = this.state.getHero(playerId);

        if (!hero) {
            throw new Error("玩家不存在");
        }
        hero.equip(weaponId);
    }

    /**
     * 處理卸下武器請求
     * 🎯 使用Schema自動同步，不需要返回詳細狀態
     */
    private handleUnequipWeapon(client: Client, data: any): void {
        if (!this.validateMessage(data, ['weaponId'])) {
            throw new Error("無效的武器卸下數據");
        }

        const { weaponId } = data;
        const playerId = client.sessionId;
        const hero = this.state.getHero(playerId);

        if (!hero) {
            throw new Error("玩家不存在");
        }

        hero.unequip(weaponId);


    }

    /**
     * 處理添加武器到背包請求
     * 🎯 使用Schema自動同步武器背包狀態
     */
    private handleAddWeapon(client: Client, data: any): void {
        if (!this.validateMessage(data, ['weaponId'])) {
            throw new Error("無效的添加武器數據");
        }

        const { weaponId } = data;
        const playerId = client.sessionId;
        const hero = this.state.getHero(playerId);

        if (!hero) {
            throw new Error("玩家不存在");
        }

        const weaponUniqueId = hero.adddWeapon(weaponId);

        // 🎯 武器添加會通過Schema自動同步到前端
        console.log(`✅ Added weapon ${weaponId} (${weaponUniqueId}) to player ${playerId}`);
    }

    /**
     * 處理從背包移除武器請求
     * 🎯 使用Schema自動同步武器背包狀態
     */
    private handleRemoveWeapon(client: Client, data: any): void {
        if (!this.validateMessage(data, ['weaponUniqueId'])) {
            throw new Error("無效的移除武器數據");
        }

        const { weaponUniqueId } = data;
        const playerId = client.sessionId;
        const hero = this.state.getHero(playerId);

        if (!hero) {
            throw new Error("玩家不存在");
        }

        const success = hero.removeWeapon(weaponUniqueId);

        if (success) {
            // 🎯 武器移除會通過Schema自動同步到前端
            console.log(`✅ Removed weapon ${weaponUniqueId} from player ${playerId}`);
        } else {
            throw new Error("移除武器失敗");
        }
    }

}
