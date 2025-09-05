import { GameRoom } from "../../Colyseus/Rooms/GameRoom";
import { GameRoomState } from "../../Colyseus/Schema/GameState";
import { ServerHero } from "../../Colyseus/Schema/Unit/Hero";
import { ServerItem } from "../../Colyseus/Schema/Item/ServerItem";
import { WeaponSystemFacade } from "../Systems/WeaponSystemFacade";
import { AttributeBonus } from "@/Types";

/**
 * 裝備管理器 - 負責處理裝備穿脫、屬性計算和驗證
 */
export class EquipmentManager {
    private room: GameRoom;
    private state: GameRoomState;

    constructor(room: GameRoom) {
        this.room = room;
        this.state = room.state;
    }

    /**
     * 裝備物品
     */
    public equipItem(playerId: string, inventoryIndex: number): boolean {
        const hero = this.state.getHero(playerId);
        if (!hero) {
            console.warn(`玩家不存在: ${playerId}`);
            return false;
        }

        // 檢查背包索引是否有效
        if (inventoryIndex < 0 || inventoryIndex >= hero.inventory.length) {
            console.warn(`無效的背包索引: ${inventoryIndex}`);
            return false;
        }

        const item = hero.inventory[inventoryIndex];
        if (!item) {
            console.warn(`背包位置為空: ${inventoryIndex}`);
            return false;
        }

        // 如果是武器，使用現有的武器系統
        if (this.isWeaponItem(item)) {
            return this.equipWeapon(hero, item);
        }

        // 其他裝備類型的處理邏輯
        return this.equipGeneralItem(hero, item, inventoryIndex);
    }

    /**
     * 卸下裝備
     */
    public unequipItem(playerId: string, slotIndex: number): boolean {
        const hero = this.state.getHero(playerId);
        if (!hero) {
            console.warn(`玩家不存在: ${playerId}`);
            return false;
        }

        // 如果是武器槽
        if (slotIndex < hero.equippedWeaponIds.length) {
            return hero.unequipWeaponBySlot(slotIndex);
        }

        // 其他裝備槽的處理
        return this.unequipGeneralItem(hero, slotIndex);
    }

    /**
     * 通過裝備ID卸下裝備
     */
    public unequipItemById(playerId: string, itemId: string): boolean {
        const hero = this.state.getHero(playerId);
        if (!hero) {
            console.warn(`玩家不存在: ${playerId}`);
            return false;
        }

        // 檢查是否是已裝備的武器
        for (let i = 0; i < hero.equippedWeaponIds.length; i++) {
            const weaponUniqueId = hero.equippedWeaponIds[i];
            // 通過背包遍歷查找匹配的武器
            for (const weaponData of hero.weaponInventory) {
                if (weaponData.uniqueId === weaponUniqueId && weaponData.weaponId === itemId) {
                    return hero.unequipWeaponBySlot(i);
                }
            }
        }

        // 檢查其他裝備
        // TODO: 實作其他類型裝備的卸下邏輯

        console.warn(`找不到已裝備的物品: ${itemId}`);
        return false;
    }

    /**
     * 檢查是否可以裝備物品
     */
    public canEquipItem(playerId: string, inventoryIndex: number): boolean {
        const hero = this.state.getHero(playerId);
        if (!hero) return false;

        const item = hero.inventory[inventoryIndex];
        if (!item) return false;

        // 檢查等級需求
        // TODO: 根據物品需求檢查玩家等級和屬性

        // 檢查裝備槽是否有空位
        if (this.isWeaponItem(item)) {
            return hero.equippedWeaponIds.length < 8; // 最多8個武器槽
        }

        return true;
    }

    /**
     * 獲取玩家所有裝備屬性加成
     */
    public getEquipmentBonuses(playerId: string): AttributeBonus[] {
        const hero = this.state.getHero(playerId);
        if (!hero) return [];

        const bonuses: AttributeBonus[] = [];

        // 獲取武器加成
        const equippedWeapons = hero.getEquippedWeapons();
        for (const weapon of equippedWeapons) {
            bonuses.push({
                attackBonus: weapon.damage || 0,
                attackMultiplier: 0.1, // 示例加成
            });
        }

        // TODO: 添加其他裝備類型的加成計算

        return bonuses;
    }

    /**
     * 更新玩家裝備屬性
     */
    public updateEquipmentStats(playerId: string): void {
        const hero = this.state.getHero(playerId);
        if (!hero) return;

        const bonuses = this.getEquipmentBonuses(playerId);
        hero.applyEquipmentBonus(bonuses);

        console.log(`更新了 ${hero.name} 的裝備屬性`);
    }

    /**
     * 獲取裝備槽信息
     */
    public getEquipmentSlots(playerId: string): any[] {
        const hero = this.state.getHero(playerId);
        if (!hero) return [];

        const slots = [];

        // 武器槽
        for (let i = 0; i < 8; i++) {
            if (i < hero.equippedWeaponIds.length) {
                const weaponUniqueId = hero.equippedWeaponIds[i];
                // 查找對應的武器數據
                const weaponData = hero.weaponInventory.find(w => w.uniqueId === weaponUniqueId);
                slots.push({
                    type: 'weapon',
                    slotIndex: i,
                    item: weaponData ? {
                        id: weaponData.weaponId,
                        name: WeaponSystemFacade.getWeaponDisplayName(weaponData),
                        equipped: true
                    } : null
                });
            } else {
                slots.push({
                    type: 'weapon',
                    slotIndex: i,
                    item: null,
                    locked: i >= 4 && hero.level < (10 + (i - 4) * 5) // 等級解鎖邏輯
                });
            }
        }

        return slots;
    }

    // 私有方法

    private isWeaponItem(item: ServerItem): boolean {
        // 檢查物品是否為武器類型
        return item.itemType === "weapon" ||
            ["melee", "projectile", "support"].includes(item.itemType);
    }

    private equipWeapon(hero: ServerHero, item: ServerItem): boolean {
        // 將物品轉換為武器ID並使用現有武器系統
        const weaponId = this.convertItemToWeaponId(item);
        if (weaponId) {
            const weaponUniqueId = hero.addWeaponToInventory(weaponId);
            return hero.equipWeaponById(weaponUniqueId);
        }
        return false;
    }

    private equipGeneralItem(hero: ServerHero, item: ServerItem, inventoryIndex: number): boolean {
        // TODO: 實作一般裝備的穿戴邏輯
        console.log(`裝備一般物品: ${item.name}`);

        // 暫時標記物品為已裝備（需要擴展ServerItem schema）
        // item.equipped = true;

        this.updateEquipmentStats(hero.id);
        return true;
    }

    private unequipGeneralItem(hero: ServerHero, slotIndex: number): boolean {
        // TODO: 實作一般裝備的卸下邏輯
        console.log(`卸下裝備槽 ${slotIndex} 的物品`);

        this.updateEquipmentStats(hero.id);
        return true;
    }

    private convertItemToWeaponId(item: ServerItem): string | null {
        // 根據物品類型轉換為武器ID
        const weaponMapping: Record<string, string> = {
            "melee": "baseballBat",
            "projectile": "fireball",
            "support": "healingPotion"
        };

        return weaponMapping[item.itemType] || null;
    }
}
