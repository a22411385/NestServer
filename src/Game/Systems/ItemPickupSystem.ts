import { GameRoom } from "../../Colyseus/Rooms/GameRoom";
import { ServerItem, ItemType } from "../../Colyseus/Schema/Item/ServerItem";
import { ServerHero } from "../../Colyseus/Schema/Unit/Hero";
import { ConfigManager } from "../Managers/ConfigManager";
import { BattleMathUtils } from "../../Util/BattleMathUtils";

/**
 * 物品拾取系統 - 重建版本
 * 支持統一物品系統和配置管理
 */
export class ItemPickupSystem {
    private room: GameRoom;
    // private pickupRange: number = 80; // 拾取範圍

    constructor(room: GameRoom) {
        this.room = room;
        this.initializeSystem();
    }

    /**
     * 初始化拾取系統
     */
    private initializeSystem(): void {
        console.log('✅ 物品拾取系統已初始化');

    }

    /**
     * 🎯 處理客戶端撿取請求
     * @param heroId 玩家ID
     * @param itemId 物品ID  
     * @param playerPosition 玩家報告的位置
     */
    public handlePickupRequest(heroId: string, itemId: string, playerPosition: { x: number, y: number }): boolean {
        const hero = this.room.state.getHero(heroId);
        if (!hero) {
            console.warn(`❌ 撿取請求失敗: 玩家不存在 (${heroId})`);
            return false;
        }

        if (hero.isDead) {
            console.warn(`❌ 撿取請求失敗: 玩家已死亡 (${heroId}), HP: ${hero.hp}, isDead: ${hero.isDead}`);
            return false;
        }

        // 檢查血量是否為0但isDead未設置的情況
        if (hero.hp <= 0) {
            console.warn(`❌ 撿取請求失敗: 玩家血量為0 (${heroId}), HP: ${hero.hp}, isDead: ${hero.isDead}`);
            hero.isDead = true; // 確保狀態一致性
            return false;
        }

        // 找到物品
        const itemIndex = this.room.state.gameCore.mapItems.findIndex(item => item.uniqueId === itemId);
        if (itemIndex === -1) {
            console.warn(`❌ 撿取請求失敗: 物品不存在 (${itemId})`);
            return false;
        }

        const item = this.room.state.gameCore.mapItems[itemIndex];

        // 驗證撿取請求
        if (!this.validatePickupRequest(hero, item, playerPosition)) {
            console.warn(`❌ 撿取請求驗證失敗: ${heroId} -> ${itemId}`);
            return false;
        }

        // 執行撿取
        return this.pickupItem(hero, item, itemIndex);
    }

    /**
     * 🎯 驗證撿取請求的合法性
     */
    private validatePickupRequest(hero: ServerHero, item: ServerItem, reportedPosition: { x: number, y: number }): boolean {
        // 1. 檢查玩家與物品的距離 - 考慮英雄的碰撞體積
        const effectivePickupDistance = this.calculateEffectivePickupDistance(hero, item);
        if (effectivePickupDistance > hero.pickupRange + 20) { // 給一點容差
            console.warn(`❌ 距離驗證失敗: 有效距離 ${effectivePickupDistance.toFixed(1)} > 允許距離 ${hero.pickupRange + 20}`);
            return false;
        }

        // 2. 檢查玩家報告位置是否合理（防止位置作弊）
        const positionDifference = this.calculateDistance(hero.position, reportedPosition);
        const maxPositionTolerance = 100; // 允許的位置誤差
        if (positionDifference > maxPositionTolerance) {
            console.warn(`❌ 位置驗證失敗: 位置差異 ${positionDifference.toFixed(1)} > 允許誤差 ${maxPositionTolerance}`);
            return false;
        }

        // 3. 檢查物品狀態（可以添加更多驗證）
        // 注意：ServerItem 目前沒有 pickedUp 屬性，但物品如果在列表中就代表未被撿取

        return true;
    }

    /**
     * 🎯 執行物品拾取
     */
    private pickupItem(hero: ServerHero, item: ServerItem, itemIndex: number): boolean {
        console.log(`📦 玩家 ${hero.name} 嘗試拾取 ${item.itemType}...`);

        let success = false;

        switch (item.itemType) {
            case ItemType.CURRENCY:
                success = this.pickupGold(hero, item);
                break;

            case ItemType.EXP:
                success = this.pickupExp(hero, item);
                break;

            case ItemType.MATERIAL:
                success = this.pickupMaterial(hero, item);
                break;

            case ItemType.WEAPON:
                success = this.pickupWeapon(hero, item);
                break;

            default:
                console.warn(`未知物品類型: ${item.itemType}`);
                return false;
        }

        if (success) {
            // 從地圖移除物品
            this.room.state.gameCore.mapItems.splice(itemIndex, 1);
            console.log(`✅ 成功拾取 ${item.itemType}`);
            return true;
        } else {
            console.log(`❌ 拾取失敗 ${item.itemType} (背包可能已滿)`);
            return false;
        }
    }

    /**
     * 🎯 拾取金幣
     */
    private pickupGold(hero: ServerHero, item: ServerItem): boolean {
        const amount = item.value || 0;
        hero.gold += amount;

        console.log(`💰 玩家 ${hero.name} 獲得 ${amount} 金幣 (總計: ${hero.gold})`);
        return true;
    }

    /**
     * 🎯 拾取經驗值
     */
    private pickupExp(hero: ServerHero, item: ServerItem): boolean {
        const amount = item.value || 0;
        hero.exp += amount;

        // 檢查升級
        this.checkLevelUp(hero);

        console.log(`⭐ 玩家 ${hero.name} 獲得 ${amount} 經驗值 (總計: ${hero.exp})`);
        return true;
    }

    /**
     * 🎯 拾取材料
     */
    private pickupMaterial(hero: ServerHero, item: ServerItem): boolean {
        const materialId = item.materialId || 'unknown';
        const quantity = item.value || 1;

        // 檢查材料是否在配置表中
        const itemConfig = ConfigManager.getItemConfigById(materialId);
        if (!itemConfig) {
            console.warn(`未找到材料配置: ${materialId}`);
            // 仍然允許拾取，使用默認設置
        }

        // 檢查是否可以堆疊 - 查找已有的相同材料
        const existingMaterialIndex = hero.inventory.findIndex(invItem =>
            invItem.itemType === ItemType.MATERIAL && invItem.materialId === materialId
        );

        if (existingMaterialIndex !== -1) {
            // 堆疊材料
            const existingMaterial = hero.inventory[existingMaterialIndex];
            const maxStack = itemConfig?.stackSize || 999;
            const currentQuantity = existingMaterial.value || 0;
            const canAdd = BattleMathUtils.atMost(quantity, maxStack - currentQuantity);

            if (canAdd > 0) {
                existingMaterial.value = currentQuantity + canAdd;
                console.log(`📦 材料 ${materialId} 堆疊 +${canAdd} (總計: ${existingMaterial.value})`);

                // 如果有剩餘，創建新的物品掉在地上
                if (canAdd < quantity) {
                    this.createOverflowItem(hero, materialId, item.name, quantity - canAdd);
                }
                return true;
            } else {
                console.log(`📦 材料 ${materialId} 已達最大堆疊數量 (${maxStack})`);
                return false;
            }
        } else {
            // 檢查背包空間
            if (hero.inventory.length >= 30) { // 假設背包上限30個不同物品
                console.log(`🎒 背包已滿，無法拾取 ${materialId}`);
                return false;
            }

            // 添加新材料到背包
            const newMaterial = ServerItem.createMaterial(0, 0, materialId, item.name, quantity);
            hero.inventory.push(newMaterial);

            console.log(`📦 獲得新材料: ${itemConfig?.name || materialId} x${quantity}`);
            return true;
        }
    }

    /**
     * 🎯 拾取武器
     */
    private pickupWeapon(hero: ServerHero, item: ServerItem): boolean {
        // 檢查武器背包空間
        if (hero.weaponInventory.length >= 255) { // 假設武器背包上限10個
            console.log(`⚔️ 武器背包已滿，無拾取武器`);
            return false;
        }

        // 將 ServerItem 轉換為 WeaponData
        const weaponData = item.toWeaponData();
        if (!weaponData) {
            console.error(`❌ 無法轉換武器數據: ${item.weaponId}`);
            return false;
        }

        // 添加到武器背包
        hero.weaponInventory.push(weaponData);

        console.log(`⚔️ 獲得武器: ${weaponData.weaponId} (品質: ${weaponData.quality}, 等級: ${weaponData.level})`);
        return true;
    }

    /**
     * 🎯 創建溢出物品
     */
    private createOverflowItem(hero: ServerHero, materialId: string, name: string, quantity: number): void {
        const overflowItem = ServerItem.createMaterial(
            hero.position.x + 20,
            hero.position.y + 20,
            materialId,
            name,
            quantity
        );

        this.room.state.gameCore.mapItems.push(overflowItem);
        console.log(`📦 創建溢出物品: ${materialId} x${quantity}`);
    }

    /**
     * 🎯 檢查升級
     */
    private checkLevelUp(hero: ServerHero): void {
        // 簡單的升級公式：每級需要 level * 100 經驗值
        const expNeeded = hero.level * 100;

        if (hero.exp >= expNeeded) {
            hero.level += 1;
            hero.exp -= expNeeded;

            // 升級獎勵
            hero.maxHp += 20;
            hero.hp = hero.maxHp; // 升級時回滿血

            console.log(`🎉 玩家 ${hero.name} 升級到 Lv.${hero.level}！`);

            // 遞歸檢查是否可以繼續升級
            if (hero.exp >= hero.level * 100) {
                this.checkLevelUp(hero);
            }
        }
    }

    /**
     * 🎯 計算距離
     */
    private calculateDistance(pos1: { x: number, y: number }, pos2: { x: number, y: number }): number {
        return BattleMathUtils.calculateDistanceVector(pos1, pos2);
    }

    /**
     * 🎯 計算考慮碰撞體積的有效拾取距離
     * 這個方法會計算英雄邊緣到物品邊緣的最短距離，而不是中心點距離
     */
    private calculateEffectivePickupDistance(hero: ServerHero, item: ServerItem): number {
        // 英雄的碰撞邊界（考慮縮放）
        const heroHalfWidth = hero.getScaledCollisionWidth() / 2;
        const heroHalfHeight = hero.getScaledCollisionHeight() / 2;

        // 物品位置（假設物品是點狀，可以根據需要調整）
        const itemX = item.x;
        const itemY = item.y;

        // 英雄中心位置
        const heroX = hero.position.x;
        const heroY = hero.position.y;

        // 計算物品相對於英雄中心的位置
        const deltaX = itemX - heroX;
        const deltaY = itemY - heroY;

        // 計算英雄邊界到物品的最短距離
        const closestX = Math.max(-heroHalfWidth, Math.min(heroHalfWidth, deltaX));
        const closestY = Math.max(-heroHalfHeight, Math.min(heroHalfHeight, deltaY));

        // 如果物品在英雄碰撞框內，距離為0
        if (closestX === deltaX && closestY === deltaY) {
            return 0;
        }

        // 計算英雄邊界點到物品的距離
        const distanceX = deltaX - closestX;
        const distanceY = deltaY - closestY;

        return Math.hypot(distanceX, distanceY);
    }

    /**
     * 🎯 清理系統資源
     */
    public cleanup(): void {
        console.log('🧹 ItemPickupSystem 已清理');
    }
}
