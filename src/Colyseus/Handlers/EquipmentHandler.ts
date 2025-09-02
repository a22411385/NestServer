import { Client } from "colyseus";
import { BaseMessageHandler } from "./Base/BaseMessageHandler";
import { PermissionLevel } from "./Base/IMessageHandler";

/**
 * 裝備消息處理器
 * 處理裝備穿脫相關的消息
 */
export class EquipmentHandler extends BaseMessageHandler {
    private supportedTypes = [
        "equipItem",
        "unequipItem",
        "equipWeapon",
        "unequipWeapon",
        "swapEquipment",
        "getEquipmentSlots",
        "updateEquipmentStats"
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

    async handle(client: Client, message: any): Promise<void> {
        const { type, data } = message;

        try {
            switch (type) {
                case "equipItem":
                    this.handleEquipItem(client, data);
                    break;
                case "unequipItem":
                    this.handleUnequipItem(client, data);
                    break;
                case "equipWeapon":
                    this.handleEquipWeapon(client, data);
                    break;
                case "unequipWeapon":
                    this.handleUnequipWeapon(client, data);
                    break;
                case "swapEquipment":
                    this.handleSwapEquipment(client, data);
                    break;
                case "getEquipmentSlots":
                    this.handleGetEquipmentSlots(client, data);
                    break;
                case "updateEquipmentStats":
                    this.handleUpdateEquipmentStats(client, data);
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
     * 處理裝備物品請求
     */
    private handleEquipItem(client: Client, data: any): void {
        if (!this.validateMessage(data, ['inventoryIndex'])) {
            throw new Error("無效的裝備請求數據");
        }

        const { inventoryIndex } = data;

        if (typeof inventoryIndex !== 'number' || inventoryIndex < 0) {
            throw new Error("無效的背包索引");
        }

        const playerId = client.sessionId;
        const success = this.room.equipmentManager.equipItem(playerId, inventoryIndex);

        if (success) {
            this.sendSuccess(client, {
                message: "裝備成功",
                inventoryIndex,
                equipmentSlots: this.room.equipmentManager.getEquipmentSlots(playerId)
            });

            // 更新屬性
            this.room.equipmentManager.updateEquipmentStats(playerId);

            // 通知其他玩家
            this.room.broadcast("playerEquipmentChanged", {
                playerId,
                action: "equip",
                inventoryIndex
            }, { except: client });

        } else {
            throw new Error("裝備失敗");
        }
    }

    /**
     * 處理卸下裝備請求
     */
    private handleUnequipItem(client: Client, data: any): void {
        const { slotIndex, itemId } = data;

        const playerId = client.sessionId;
        let success = false;

        if (typeof slotIndex === 'number') {
            // 通過槽位索引卸下
            success = this.room.equipmentManager.unequipItem(playerId, slotIndex);
        } else if (typeof itemId === 'string') {
            // 通過物品ID卸下
            success = this.room.equipmentManager.unequipItemById(playerId, itemId);
        } else {
            throw new Error("需要提供 slotIndex 或 itemId");
        }

        if (success) {
            this.sendSuccess(client, {
                message: "卸下裝備成功",
                slotIndex: slotIndex || null,
                itemId: itemId || null,
                equipmentSlots: this.room.equipmentManager.getEquipmentSlots(playerId)
            });

            // 更新屬性
            this.room.equipmentManager.updateEquipmentStats(playerId);

            // 通知其他玩家
            this.room.broadcast("playerEquipmentChanged", {
                playerId,
                action: "unequip",
                slotIndex: slotIndex || null,
                itemId: itemId || null
            }, { except: client });

        } else {
            throw new Error("卸下裝備失敗");
        }
    }

    /**
     * 處理裝備武器請求 (兼容舊接口)
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

        const success = hero.equipWeaponById(weaponId);

        if (success) {
            this.sendSuccess(client, {
                message: `成功裝備武器: ${weaponId}`,
                weaponId,
                equippedWeapons: hero.getEquippedWeapons().map(w => ({
                    weaponId: w.weaponId,
                    name: w.name
                }))
            });

            // 更新屬性
            this.room.equipmentManager.updateEquipmentStats(playerId);

        } else {
            throw new Error("武器裝備失敗");
        }
    }

    /**
     * 處理卸下武器請求 (兼容舊接口)
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

        const success = hero.unequipWeaponById(weaponId);

        if (success) {
            this.sendSuccess(client, {
                message: `成功卸下武器: ${weaponId}`,
                weaponId,
                equippedWeapons: hero.getEquippedWeapons().map(w => ({
                    weaponId: w.weaponId,
                    name: w.name
                }))
            });

            // 更新屬性
            this.room.equipmentManager.updateEquipmentStats(playerId);

        } else {
            throw new Error("武器卸下失敗");
        }
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
        const equipmentSlots = this.room.equipmentManager.getEquipmentSlots(playerId);

        this.sendSuccess(client, {
            message: "獲取裝備槽信息成功",
            equipmentSlots
        });
    }

    /**
     * 處理更新裝備屬性請求
     */
    private handleUpdateEquipmentStats(client: Client, data: any): void {
        const playerId = client.sessionId;

        this.room.equipmentManager.updateEquipmentStats(playerId);

        const hero = this.state.getHero(playerId);
        if (hero) {
            this.sendSuccess(client, {
                message: "裝備屬性更新成功",
                stats: {
                    hp: hero.hp,
                    maxHp: hero.maxHp,
                    attackDamage: hero.attackDamage,
                    moveSpeed: hero.moveSpeed
                }
            });
        }
    }
}
