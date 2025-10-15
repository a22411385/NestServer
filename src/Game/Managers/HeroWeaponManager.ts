/**
 * Hero 武器管理器
 * 負責處理角色的所有武器相關操作，包括背包管理、裝備管理、交易等
 */

import { WeaponBasic } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { WeaponData } from "../../Colyseus/Schema/Weapon/WeaponData";
import { WeaponSystemFacade } from "../Systems/WeaponSystemFacade";
import { WeaponInstanceManager } from "./WeaponInstanceManager";
import { ServerItem } from "../../Colyseus/Schema/Item/ServerItem";
import { AttackResult } from "../../Types";

// 前向聲明避免循環依賴
interface IServerHero {
    name: string;
    position: { x: number; y: number };
    weaponInventory: any; // ArraySchema<WeaponData>
    equippedWeaponIds: any; // ArraySchema<string>
    gold: number;
}

export class HeroWeaponManager {
    private hero: IServerHero;

    constructor(hero: IServerHero) {
        this.hero = hero;
    }

    // =================== 🔍 武器查詢與實例管理 ===================

    /**
     * 根據唯一ID查找武器數據
     */
    public findWeaponDataById(uniqueId: string): WeaponData | null {
        for (const weaponData of this.hero.weaponInventory) {
            if (weaponData.uniqueId === uniqueId) {
                return weaponData;
            }
        }
        return null;
    }

    /**
     * 獲取武器實例（懶加載）- 統一使用 WeaponInstanceManager
     */
    public getWeaponInstance(weaponId: string): WeaponBasic | null {
        // 找到對應的 weaponData
        const weaponData = this.findWeaponDataById(weaponId);
        if (!weaponData) {
            console.warn(`[${this.hero.name}] 找不到武器數據: ${weaponId}`);
            return null;
        }

        // 統一使用 WeaponInstanceManager，移除重複快取
        return WeaponInstanceManager.getOrCreateInstance(weaponData);
    }

    /**
     * 獲取當前裝備的武器實例
     */
    public getEquippedWeapons(): WeaponBasic[] {
        const weapons: WeaponBasic[] = [];

        for (let i = 0; i < this.hero.equippedWeaponIds.length; i++) {
            const weaponId = this.hero.equippedWeaponIds[i];
            const weapon = this.getWeaponInstance(weaponId);
            if (weapon) {
                weapons.push(weapon);
            }
        }

        return weapons;
    }

    // =================== 🎒 背包管理 ===================

    /**
     * 添加武器到背包
     */
    public addToInventory(weaponId: string): string {
        // 使用 Facade 創建完整武器數據
        const { data } = WeaponSystemFacade.createAndGetWeapon(weaponId);
        this.hero.weaponInventory.push(data);

        console.log(`${this.hero.name} 獲得了武器: ${data.weaponId} (${data.uniqueId})`);
        return data.uniqueId;  // 返回唯一ID而不是索引
    }

    /**
     * 從背包移除武器（賣掉或刪除）
     */
    public removeFromInventory(weaponUniqueId: string): boolean {
        // 先確保武器未裝備
        if (this.isEquipped(weaponUniqueId)) {
            this.unequipById(weaponUniqueId);
        }

        // 從背包移除
        const index = this.hero.weaponInventory.findIndex((weapon: WeaponData) => weapon.uniqueId === weaponUniqueId);
        if (index !== -1) {
            const weaponData = this.hero.weaponInventory[index];
            this.hero.weaponInventory.splice(index, 1);

            // 清理實例快取 - 使用 WeaponInstanceManager
            WeaponInstanceManager.invalidateCache(weaponData);

            const displayName = WeaponSystemFacade.getWeaponDisplayName(weaponData);
            console.log(`${this.hero.name} 移除了武器: ${displayName}`);
            return true;
        }

        console.warn(`找不到要移除的武器: ${weaponUniqueId}`);
        return false;
    }

    // =================== ⚔️ 裝備管理 ===================

    /**
     * 🔄 裝備武器 - 方法重載
     * @param weaponUniqueId 武器唯一ID
     */
    public equip(weaponUniqueId: string): boolean;

    /**
     * 🔄 裝備武器 - 方法重載
     * @param inventoryIndex 背包索引
     */
    public equip(inventoryIndex: number): boolean;

    /**
     * 🔄 裝備武器 - 實現
     */
    public equip(weaponIdentifier: string | number): boolean {
        if (typeof weaponIdentifier === 'string') {
            return this.equipById(weaponIdentifier);
        } else {
            return this.equipByIndex(weaponIdentifier);
        }
    }

    /**
     * 🔄 卸下武器 - 方法重載
     * @param weaponUniqueId 武器唯一ID
     */
    public unequip(weaponUniqueId: string): boolean;

    /**
     * 🔄 卸下武器 - 方法重載
     * @param slotIndex 裝備槽索引
     */
    public unequip(slotIndex: number): boolean;

    /**
     * 🔄 卸下武器 - 實現
     */
    public unequip(weaponIdentifier: string | number): boolean {
        if (typeof weaponIdentifier === 'string') {
            return this.unequipById(weaponIdentifier);
        } else {
            return this.unequipBySlot(weaponIdentifier);
        }
    }

    /**
     * 裝備武器（通過武器唯一ID）
     */
    public equipById(weaponUniqueId: string): boolean {
        const weaponData = this.findWeaponDataById(weaponUniqueId);
        if (!weaponData) {
            console.warn(`找不到武器: ${weaponUniqueId}`);
            return false;
        }

        if (weaponData.isEquipped) {
            const displayName = WeaponSystemFacade.getWeaponDisplayName(weaponData);
            console.warn(`武器已經裝備: ${displayName}`);
            return false;
        }

        // 檢查裝備槽
        if (this.hero.equippedWeaponIds.length >= 8) {
            console.warn("裝備槽已滿");
            return false;
        }

        // 裝備武器
        weaponData.isEquipped = true;
        this.hero.equippedWeaponIds.push(weaponUniqueId);

        // 修復：使用 WeaponInstanceManager 清除快取，強制重新創建
        WeaponInstanceManager.invalidateCache(weaponData);

        const displayName = WeaponSystemFacade.getWeaponDisplayName(weaponData);
        console.log(`${this.hero.name} 裝備了武器: ${displayName}`);
        return true;
    }

    /**
     * 裝備武器（通過背包索引 - 便利方法）
     */
    public equipByIndex(inventoryIndex: number): boolean {
        if (inventoryIndex < 0 || inventoryIndex >= this.hero.weaponInventory.length) {
            console.warn(`無效的武器索引: ${inventoryIndex}`);
            return false;
        }

        const weaponData = this.hero.weaponInventory[inventoryIndex];
        if (!weaponData) {
            console.warn(`找不到武器，索引: ${inventoryIndex}`);
            return false;
        }

        return this.equipById(weaponData.uniqueId);
    }

    /**
     * 卸下武器（通過裝備槽索引）
     */
    public unequipBySlot(slotIndex: number): boolean {
        console.log(`[${this.hero.name}] 嘗試卸下裝備槽 ${slotIndex} 的武器`);
        console.log(`[${this.hero.name}] 當前裝備武器列表:`, this.hero.equippedWeaponIds.toArray());

        if (slotIndex < 0 || slotIndex >= this.hero.equippedWeaponIds.length) {
            console.warn(`[${this.hero.name}] 無效的裝備槽索引: ${slotIndex}, 總裝備數: ${this.hero.equippedWeaponIds.length}`);
            return false;
        }

        const weaponUniqueId = this.hero.equippedWeaponIds[slotIndex];
        console.log(`[${this.hero.name}] 準備卸下武器: ${weaponUniqueId}`);

        const weaponData = this.findWeaponDataById(weaponUniqueId);

        if (!weaponData) {
            console.warn(`[${this.hero.name}] 找不到武器數據，ID: ${weaponUniqueId}`);
            return false;
        }

        // 卸下武器
        weaponData.isEquipped = false;
        this.hero.equippedWeaponIds.splice(slotIndex, 1);

        // 可選：保留實例快取，避免重複創建（由 WeaponInstanceManager 管理）
        // WeaponInstanceManager.invalidateCache(weaponData); // 卸載時不清理快取

        const displayName = WeaponSystemFacade.getWeaponDisplayName(weaponData);
        console.log(`[${this.hero.name}] 已卸下武器: ${displayName}`);
        console.log(`[${this.hero.name}] 卸載後裝備武器列表:`, this.hero.equippedWeaponIds.toArray());
        return true;
    }

    /**
     * 卸下武器（通過武器唯一ID）
     */
    public unequipById(weaponUniqueId: string): boolean {
        const slotIndex = this.hero.equippedWeaponIds.findIndex((id: string) => id === weaponUniqueId);
        if (slotIndex === -1) {
            console.warn(`武器未裝備: ${weaponUniqueId}`);
            return false;
        }
        return this.unequipBySlot(slotIndex);
    }

    /**
     * 檢查武器是否已裝備
     */
    public isEquipped(weaponUniqueId: string): boolean {
        return this.hero.equippedWeaponIds.includes(weaponUniqueId);
    }

    // =================== 💰 武器交易 ===================

    /**
     * 丟棄武器到地圖（給其他玩家撿起）
     */
    public dropWeapon(weaponUniqueId: string, targetX?: number, targetY?: number): ServerItem | null {
        // 找到要丟棄的武器
        const weaponIndex = this.hero.weaponInventory.findIndex((weapon: WeaponData) => weapon.uniqueId === weaponUniqueId);

        if (weaponIndex === -1) {
            console.warn(`${this.hero.name} 找不到要丟棄的武器: ${weaponUniqueId}`);
            return null;
        }

        const weaponData = this.hero.weaponInventory[weaponIndex];

        // 先卸下武器（如果已裝備）
        if (this.isEquipped(weaponUniqueId)) {
            this.unequipById(weaponUniqueId);
        }

        // 使用 ServerItem 的轉換方法創建掉落物品
        const dropX = targetX !== undefined ? targetX : this.hero.position.x + (Math.random() - 0.5) * 100;
        const dropY = targetY !== undefined ? targetY : this.hero.position.y + (Math.random() - 0.5) * 100;

        const dropItem = ServerItem.createFromWeaponData(weaponData, dropX, dropY);

        // 從背包移除
        this.hero.weaponInventory.splice(weaponIndex, 1);

        // 清理武器實例快取
        WeaponInstanceManager.invalidateCache(weaponData);

        console.log(`${this.hero.name} 丟棄了武器: ${weaponData.weaponId} (${weaponData.quality})`);
        return dropItem;
    }

    /**
     * 賣掉武器（轉為金幣）
     */
    public sellWeapon(weaponUniqueId: string): number {
        const weaponIndex = this.hero.weaponInventory.findIndex((weapon: WeaponData) => weapon.uniqueId === weaponUniqueId);

        if (weaponIndex === -1) {
            console.warn(`${this.hero.name} 找不到要賣掉的武器: ${weaponUniqueId}`);
            return 0;
        }

        const weaponData = this.hero.weaponInventory[weaponIndex];

        // 先卸下武器（如果已裝備）
        if (this.isEquipped(weaponUniqueId)) {
            this.unequipById(weaponUniqueId);
        }

        // 計算武器價值
        const sellPrice = this.calculateSellPrice(weaponData);

        // 從背包移除
        this.hero.weaponInventory.splice(weaponIndex, 1);

        // 清理武器實例快取
        WeaponInstanceManager.invalidateCache(weaponData);

        // 增加金幣
        this.hero.gold += sellPrice;

        console.log(`${this.hero.name} 賣掉了武器: ${weaponData.weaponId}, 獲得 ${sellPrice} 金幣`);
        return sellPrice;
    }

    /**
     * 計算武器賣價
     */
    public calculateSellPrice(weaponData: WeaponData): number {
        let basePrice = 100; // 基礎價格

        // 品質加成
        const qualityMultiplier: Record<string, number> = {
            'common': 1,
            'uncommon': 2,
            'rare': 5,
            'epic': 15,
            'legendary': 50
        };

        const multiplier = qualityMultiplier[weaponData.quality] || 1;

        // 等級和強化加成
        const levelBonus = weaponData.level * 10;
        const enhanceBonus = weaponData.enhanceLevel * 50;

        return Math.floor(basePrice * multiplier + levelBonus + enhanceBonus);
    }

    // =================== ⚔️ 戰鬥系統 ===================

    /**
     * 嘗試進行攻擊
     */
    public tryAttack(enemies: any[]): AttackResult[] {
        const results: AttackResult[] = [];

        // 使用新的武器系統
        const equippedWeapons = this.getEquippedWeapons();

        for (let i = 0; i < equippedWeapons.length; i++) {
            const weapon = equippedWeapons[i];
            if (weapon) {
                // 使用新的武器接口，傳入攻擊者和潛在目標
                const result = weapon.tryAttack(this.hero as any, enemies);

                if (result.success) {
                    results.push(result);
                }
            }
        }

        return results;
    }

    // =================== 🔧 系統工具 ===================

    /**
     * 武器系統檢測方法 - 用於調試
     */
    public validateSystem(): void {
        console.log(`[${this.hero.name}] === 武器系統狀態檢查 ===`);
        console.log(`[${this.hero.name}] 背包武器總數: ${this.hero.weaponInventory.length}`);
        console.log(`[${this.hero.name}] 裝備武器ID數量: ${this.hero.equippedWeaponIds.length}`);
        console.log(`[${this.hero.name}] 裝備武器列表:`, this.hero.equippedWeaponIds.toArray());

        // 檢查每個裝備武器的狀態
        for (let i = 0; i < this.hero.equippedWeaponIds.length; i++) {
            const weaponId = this.hero.equippedWeaponIds[i];
            const weaponData = this.findWeaponDataById(weaponId);
            const weaponInstance = this.getWeaponInstance(weaponId);

            console.log(`[${this.hero.name}] 武器槽 ${i}:`);
            console.log(`  - ID: ${weaponId}`);
            console.log(`  - 數據存在: ${weaponData ? 'YES' : 'NO'}`);
            console.log(`  - 實例存在: ${weaponInstance ? 'YES' : 'NO'}`);
            if (weaponData) {
                console.log(`  - 武器類型: ${weaponData.weaponId}`);
                console.log(`  - 裝備狀態: ${weaponData.isEquipped ? 'YES' : 'NO'}`);
                console.log(`  - 等級: ${weaponData.level}, 強化: ${weaponData.enhanceLevel}`);
            }
        }

        // 檢查 WeaponInstanceManager 快取狀態
        const cacheStats = WeaponInstanceManager.getCacheStats();
        console.log(`[${this.hero.name}] WeaponInstanceManager 快取狀態:`, cacheStats);
        console.log(`[${this.hero.name}] === 武器系統檢查結束 ===`);
    }

    /**
     * 獲取系統統計信息
     */
    public getSystemStats(): {
        inventoryCount: number;
        equippedCount: number;
        cacheStats: any;
    } {
        return {
            inventoryCount: this.hero.weaponInventory.length,
            equippedCount: this.hero.equippedWeaponIds.length,
            cacheStats: WeaponInstanceManager.getCacheStats()
        };
    }
}