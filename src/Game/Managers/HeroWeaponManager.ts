/**
 * Hero 武器管理器
 * 負責處理角色的所有武器相關操作，包括背包管理、裝備管理、交易等
 */

import { WeaponBasic } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { WeaponSchema } from "../../Colyseus/Schema/Weapon/WeaponSchema";
import { WeaponSystemFacade } from "../Systems/Battle/WeaponSystemFacade";
import { WeaponInstanceManager } from "./WeaponInstanceManager";
import { AttackResult } from "../../Types";
import { ServerHero } from "@/Colyseus/Schema/Unit/Hero";
import { WeaponQuality } from "@/Types/Equipment/WeaponPropertyTypes";
import { ServerGameUnit } from "@/Colyseus/Schema/Unit/GameUnit";


const HERO_MAX_WEAPON_SLOTS = 8;
export class HeroWeaponManager {
    private hero: ServerHero;

    constructor(hero: ServerHero) {
        this.hero = hero;
    }

    // =================== 🔍 武器查詢與實例管理 ===================

    /**
     * 根據唯一ID查找武器 Schema
     */
    public findWeaponSchemaById(uniqueId: string): WeaponSchema | null {
        for (const weaponSchema of this.hero.weaponInventory) {
            if (weaponSchema.uniqueId === uniqueId) {
                return weaponSchema;
            }
        }
        return null;
    }

    /**
     * 🆕 獲取武器邏輯實例（使用 WeaponSchema 的懶加載機制）
     */
    public getWeaponLogicInstance(uniqueId: string): WeaponBasic | null {
        const weaponSchema = this.findWeaponSchemaById(uniqueId);
        if (!weaponSchema) {
            console.warn(`[${this.hero.name}] 找不到武器: ${uniqueId}`);
            return null;
        }

        return weaponSchema.getLogicInstance();
    }

    /**
     * 獲取當前裝備的武器實例
     */
    public getEquippedWeapons(): WeaponBasic[] {
        const weapons: WeaponBasic[] = [];

        for (let i = 0; i < this.hero.weaponInventory.length; i++) {
            const weaponSchema = this.hero.weaponInventory[i];

            // 只返回已裝備的武器
            if (!weaponSchema.isEquipped) {
                continue;
            }

            const weapon = this.getWeaponLogicInstance(weaponSchema.uniqueId);
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
    public addToInventory(weaponId: string, classModule: string): string {
        // 使用 Facade 創建完整武器數據
        const { data } = WeaponSystemFacade.createAndGetWeapon(weaponId, classModule);
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
            this.unequip(weaponUniqueId);
        }

        // 從背包移除
        const index = this.hero.weaponInventory.findIndex((weapon: WeaponSchema) => weapon.uniqueId === weaponUniqueId);
        if (index !== -1) {
            const weaponSchema = this.hero.weaponInventory[index];
            this.hero.weaponInventory.splice(index, 1)
            const displayName = WeaponSystemFacade.getWeaponDisplayName(weaponSchema);
            console.log(`${this.hero.name} 移除了武器: ${displayName}`);
            return true;
        }

        console.warn(`找不到要移除的武器: ${weaponUniqueId}`);
        return false;
    }

    // =================== ⚔️ 裝備管理 ===================

    public equip(weaponIdentifier: string): boolean {

        const weaponData = this.findWeaponSchemaById(weaponIdentifier);
        if (!weaponData) {
            console.warn(`找不到武器: ${weaponIdentifier}`);
            return false;
        }

        if (!weaponData.isEquipped) {
            const displayName = WeaponSystemFacade.getWeaponDisplayName(weaponData);
            console.warn(`武器未裝備: ${displayName}`);
            return false;
        }

        // 卸下武器
        weaponData.isEquipped = false;

        // ✅ 觸發屬性重算
        this.hero.recalculateAllStats();

        const displayName = WeaponSystemFacade.getWeaponDisplayName(weaponData);
        console.log(`[${this.hero.name}] 已卸下武器: ${displayName}`);
        return true;

    }


    public unequip(weaponIdentifier: string): boolean {

        const weaponData = this.findWeaponSchemaById(weaponIdentifier);
        if (!weaponData) {
            console.warn(`找不到武器: ${weaponIdentifier}`);
            return false;
        }

        if (weaponData.isEquipped) {
            const displayName = WeaponSystemFacade.getWeaponDisplayName(weaponData);
            console.warn(`武器已經裝備: ${displayName}`);
            return false;
        }

        // 檢查裝備槽 - 計算當前已裝備的武器數量
        const equippedCount = this.hero.weaponInventory.filter((w: WeaponSchema) => w.isEquipped).length;
        if (equippedCount >= HERO_MAX_WEAPON_SLOTS) {
            console.warn("裝備槽已滿");
            return false;
        }

        // 裝備武器 (只設置標記，不需要 push，因為武器已經在 inventory 裡)
        weaponData.isEquipped = true;

        // 修復：使用 WeaponInstanceManager 清除快取，強制重新創建
        WeaponInstanceManager.invalidateCache(weaponData);

        // ✅ 觸發屬性重算（武器屬性會自動被收集並應用）
        this.hero.recalculateAllStats();

        const displayName = WeaponSystemFacade.getWeaponDisplayName(weaponData);
        console.log(`${this.hero.name} 裝備了武器: ${displayName} [屬性: STR+${weaponData.str} INT+${weaponData.int} AGI+${weaponData.agi} VIT+${weaponData.vit}]`);
        return true;
    }

    /**
     * 檢查武器是否已裝備
     */
    public isEquipped(weaponUniqueId: string): boolean {
        return this.hero.weaponInventory.some((weapon: WeaponSchema) => weapon.uniqueId === weaponUniqueId);
    }

    // =================== 💰 武器交易 ===================
    /**
     * 賣掉武器（轉為金幣）
     */
    public sellWeapon(weaponUniqueId: string): number {
        const weaponIndex = this.hero.weaponInventory.findIndex((weapon: WeaponSchema) => weapon.uniqueId === weaponUniqueId);

        if (weaponIndex === -1) {
            console.warn(`${this.hero.name} 找不到要賣掉的武器: ${weaponUniqueId}`);
            return 0;
        }

        const weaponData = this.hero.weaponInventory[weaponIndex];

        // 先卸下武器（如果已裝備）
        if (this.isEquipped(weaponUniqueId)) {
            this.unequip(weaponUniqueId);
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
    public calculateSellPrice(weaponData: WeaponSchema): number {
        let basePrice = 100; // 基礎價格

        // 品質加成
        const qualityMultiplier: Record<WeaponQuality, number> = {
            'normal': 1,
            'rare': 5,
            'magic': 30,
            'epic': 15,
            'legendary': 50
        };

        const multiplier = qualityMultiplier[weaponData.rarity] || 1;

        // 等級和強化加成
        const levelBonus = weaponData.level * 10;
        return Math.floor(basePrice * multiplier + levelBonus);
    }

    // =================== ⚔️ 戰鬥系統 ===================

    /**
     * 嘗試進行攻擊
     */
    public tryAttack(enemies: ServerGameUnit[]): AttackResult[] {
        const results: AttackResult[] = [];

        // 使用新的武器系統
        const equippedWeapons = this.getEquippedWeapons();

        for (let i = 0; i < equippedWeapons.length; i++) {
            const weapon = equippedWeapons[i];
            if (weapon) {
                // 使用新的武器接口，傳入攻擊者和潛在目標
                const result = weapon.tryAttack(this.hero, enemies);

                if (result.success) {
                    results.push(result);
                }
            }
        }

        return results;
    }

}