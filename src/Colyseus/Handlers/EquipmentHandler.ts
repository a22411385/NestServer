import { Client } from "colyseus";
import { BaseMessageHandler } from "./Base/BaseMessageHandler";
import { MessageData, PermissionLevel } from "@/Types";

/**
 * 裝備消息處理器
 * 處理裝備穿脫相關的消息
 */
export class EquipmentHandler extends BaseMessageHandler {
    private supportedTypes = [
        "equipItem",
        "unequipItem",
        "equip_weapon",        // 🔧 修正為前端使用的消息類型
        "unequip_weapon",      // 🔧 修正為前端使用的消息類型
        "swapEquipment",
        "getEquipmentSlots",
        "updateEquipmentStats",
        "addWeapon",           // 🆕 添加武器到背包
        "removeWeapon",        // 🆕 從背包移除武器
        "getWeaponInventory"   // 🆕 獲取武器背包
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
                case "swapEquipment":
                    this.handleSwapEquipment(client, data);
                    break;
                case "getEquipmentSlots":
                    this.handleGetEquipmentSlots(client, data);
                    break;

                case "addWeapon":
                    this.handleAddWeapon(client, data);
                    break;
                case "removeWeapon":
                    this.handleRemoveWeapon(client, data);
                    break;
                case "getWeaponInventory":
                    this.handleGetWeaponInventory(client, data);
                    break;
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


        // 首先嘗試作為 uniqueId 裝備（已存在的武器實例）
        if (hero.isWeaponEquipped(weaponId) || hero.weaponInventory.find(w => w.uniqueId === weaponId)) {
            hero.equipWeapon(weaponId);
        } else {
            // 如果不是 uniqueId，則作為新武器類型ID添加到背包並裝備
            const weaponUniqueId = hero.addWeaponToInventory(weaponId);
            hero.equipWeapon(weaponUniqueId);
        }
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

        hero.unequipWeapon(weaponId);


    }

    /**
     * 處理裝備交換請求
     */
    private handleSwapEquipment(client: Client, data: any): void {
        if (!this.validateMessage(data, ['fromSlot', 'toSlot'])) {
            throw new Error("無效的裝備交換數據");
        }

        const { fromSlot, toSlot } = data;
        const playerId = client.sessionId;

        // TODO: 實作裝備交換邏輯
        throw new Error("裝備交換功能尚未實作");
    }

    /**
     * 處理獲取裝備槽信息請求
     */
    private handleGetEquipmentSlots(client: Client, data: any): void {
        const playerId = client.sessionId;
        const hero = this.state.getHero(playerId);

        const equipmentSlots = hero?.getEquippedWeapons();

        this.sendSuccess(client, {
            message: "獲取裝備槽信息成功",
            equipmentSlots
        });
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

        const weaponUniqueId = hero.addWeaponToInventory(weaponId);

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

        const success = hero.removeWeaponFromInventory(weaponUniqueId);

        if (success) {
            // 🎯 武器移除會通過Schema自動同步到前端
            console.log(`✅ Removed weapon ${weaponUniqueId} from player ${playerId}`);
        } else {
            throw new Error("移除武器失敗");
        }
    }

    /**
     * 處理獲取武器背包請求
     * 🎯 返回當前武器背包狀態（用於初次載入或重新同步）
     */
    private handleGetWeaponInventory(client: Client, data: any): void {
        const playerId = client.sessionId;
        const hero = this.state.getHero(playerId);

        if (!hero) {
            throw new Error("玩家不存在");
        }

        // 🎯 這個方法主要用於調試或重新同步，正常情況下Schema會自動同步
        this.sendSuccess(client, {
            message: "獲取武器背包成功",
            weaponInventory: hero.weaponInventory.map(w => ({
                weaponId: w.weaponId,
                uniqueId: w.uniqueId,
                name: w.name,
                level: w.level,
                exp: w.exp,
                rarity: w.rarity,
                weaponType: w.weaponType
            })),
            equippedWeaponIds: [...hero.equippedWeaponIds]
        });
    }
}
