import { ArraySchema, type } from "@colyseus/schema";
import { UnitType } from "../GameState";

import { ServerGameUnit } from "./GameUnit";
import { WeaponAttackResult, WeaponBasic } from "../Weapon/Baisc/WeaponBasic";
import { WeaponFactory } from "../../../Game/Factories/WeaponFactory";
import { ServerItem } from "../Item/ServerItem";
import { WeaponData } from "../Weapon/WeaponData";
import { WeaponInstanceManager } from "../../../Game/Managers/WeaponInstanceManager";

export type StatType = 'vit' | 'str' | 'agi' | 'int';

// 裝備加成接口
export interface EquipmentBonus {
    // 固定數值加成
    hpBonus?: number;
    attackBonus?: number;
    speedBonus?: number;
    mpBonus?: number;

    // 百分比加成 (0.1 = 10%)
    hpMultiplier?: number;
    attackMultiplier?: number;
    speedMultiplier?: number;
    mpMultiplier?: number;

    // 特殊效果
    critRate?: number;
    dodgeRate?: number;
    lifeSteal?: number;
}

// Buff 效果接口
export interface BuffEffect {
    id: string;
    type: 'hp_boost' | 'attack_boost' | 'speed_boost' | 'damage_reduction';
    value: number;
    duration: number;
    remaining: number;
}
// 玩家操控的主要單位
export class ServerHero extends ServerGameUnit {

    @type("number") invincibleRemaining: number = 0; // 無敵剩餘時間 (ms)
    @type("number") level: number = 1;
    @type("number") exp: number = 0;

    // 🆕 武器數據陣列（同步到客戶端）
    @type([WeaponData]) public weaponInventory = new ArraySchema<WeaponData>();

    // 🆕 當前裝備的武器索引（同步到客戶端）
    @type(["number"]) public equippedWeaponIndices = new ArraySchema<number>();

    //道具欄
    @type([ServerItem]) public inventory = new ArraySchema<ServerItem>();

    @type("number") public gold: number = 0; // 新增金幣屬性

    // === 基礎屬性點 (永久，升級分配) ===
    @type("number") public vit: number = 10;        // 體質點數
    @type("number") public str: number = 10;        // 力量點數
    @type("number") public agi: number = 10;        // 敏捷點數
    @type("number") public int: number = 10;        // 智力點數
    @type("number") public expToNext: number = 100;     // 升級所需經驗
    @type("number") public skillPoints: number = 0;     // 技能點數
    @type("number") public statPoints: number = 0;      // 屬性點數
    public usedPoints: number = 0;      // 已使用的屬性點數（不同步）

    // public baseAttackSpeed: number = 1000;
    // public baseSpeed: number = 3;
    public baseMp: number = 100;

    // === 裝備/Buff 加成 (動態變化) - 不需要同步給客戶端，客戶端只需要最終結果 ===
    public equipmentHpBonus: number = 0;
    public equipmentAttackBonus: number = 0;
    // public equipmentSpeedBonus: number = 0;
    public equipmentMpBonus: number = 0;

    public buffHpBonus: number = 0;
    public buffAttackBonus: number = 0;
    // public buffSpeedBonus: number = 0;
    public buffMpBonus: number = 0;

    // === 百分比加成 - 不需要同步給客戶端 ===
    public hpMultiplier: number = 1.0;
    public attackMultiplier: number = 1.0;
    public speedMultiplier: number = 1.0;
    public mpMultiplier: number = 1.0;

    // === 能量系統 ===
    @type("number") public maxMp: number = 100;
    @type("number") public mp: number = 100;
    @type("number") public mpRegen: number = 1; // 每秒回復的能量值

    // === 副屬性 - 不需要同步給客戶端 ===
    public baseExpMultiplier: number = 30;
    public baseCritRate: number = 0; // 暴擊率 (百分比)
    public baseDodgeRate: number = 0; // 閃避率 (百分比)


    //public equippedWeapons: Array<WeaponBasic> = [];
    //public items: Array<Item> = [];

    // 🆕 武器實例快取（不同步，僅服務端使用）
    private weaponInstances: Map<number, WeaponBasic> = new Map();

    constructor() {
        super();

        // 設置基礎屬性
        this.baseHp = 100;
        this.baseMp = 100;
        this.baseAttackDamage = 10;

        this.baseMoveSpeed = 50; // 每秒移動50像素
        this.scale = 1.0; // 預設縮放為1

        this.type = UnitType.hero;
        this.attackRange = 1000;

        // 初始化屬性點
        this.vit = 10;
        this.str = 10;
        this.agi = 10;
        this.int = 10;
        this.usedPoints = 0;


        // 初始化加成為0
        this.equipmentHpBonus = 0;
        this.equipmentAttackBonus = 0;
        this.equipmentMpBonus = 0;
        this.buffHpBonus = 0;
        this.buffAttackBonus = 0;
        this.buffMpBonus = 0;
        this.hpMultiplier = 1.0;
        this.attackMultiplier = 1.0;
        this.speedMultiplier = 1.0;
        this.mpMultiplier = 1.0;

        // 計算初始屬性
        this.recalculateAllStats();
    }

    /**
       * 添加經驗值並檢查升級
    */
    public addExperience(amount: number): boolean {
        this.exp += amount * this.baseExpMultiplier;

        if (this.exp >= this.expToNext) {
            return this.levelUp();
        }
        return false;
    }

    /**
     * 升級邏輯
     */
    private levelUp(): boolean {

        // 扣除升級所需經驗
        this.exp -= this.expToNext;
        this.level += 1;

        // 計算下次升級經驗 (指數增長)
        this.expToNext = Math.floor(100 * Math.pow(1.5, this.level - 1));

        // 獲得點數
        this.skillPoints += 1;
        this.statPoints += 5;

        // 升級時回滿血魔
        this.hp = this.maxHp;
        this.mp = this.maxMp;

        this.usedPoints = 0;

        // 重新計算實際屬性
        this.recalculateAllStats();

        console.log(`${this.name} 升級到 ${this.level} 級！`);
        return true;
    }

    // 添加獲取總屬性的方法
    public getTotalStats(): {
        vitality: number,
        strength: number,
        agility: number,
        intelligence: number
    } {
        return {
            vitality: this.vit,
            strength: this.str,
            agility: this.agi,
            intelligence: this.int
        };
    }
    // 重新計算屬性時也要考慮總屬性加成
    public recalculateAllStats(): void {
        // 1. 計算屬性點加成
        const vitBonus = this.vit * 5;      // 每點體質 +5 血量
        const strBonus = this.str * 2;      // 每點力量 +2 攻擊
        const agiBonus = this.agi * 0.5;    // 每點敏捷 +0.5 速度
        const intBonus = this.int * 3;      // 每點智力 +3 魔力

        // 2. 計算最終數值 = 基礎值 + 屬性加成 + 裝備加成 + Buff加成
        const finalHp = (this.baseHp + vitBonus + this.equipmentHpBonus + this.buffHpBonus) * this.hpMultiplier;
        const finalAttack = (this.baseAttackDamage + strBonus + this.equipmentAttackBonus + this.buffAttackBonus) * this.attackMultiplier;

        const finalMp = (this.baseMp + intBonus + this.equipmentMpBonus + this.buffMpBonus) * this.mpMultiplier;
        const finalSpeed = this.agi * 0.02 + this.baseMoveSpeed;
        // 3. 更新最終屬性
        const oldMaxHp = this.maxHp;
        const oldMaxMp = this.maxMp;

        this.maxHp = Math.floor(finalHp);
        this.attackDamage = Math.floor(finalAttack);

        this.maxMp = Math.floor(finalMp);
        this.moveSpeed = Math.floor(finalSpeed);
        // 4. 處理當前血量/魔力的變化
        this.adjustCurrentValues(oldMaxHp, oldMaxMp);
    }

    /**
     * 調整當前血量/魔力（當最大值改變時）
     */
    private adjustCurrentValues(oldMaxHp: number, oldMaxMp: number): void {
        // 血量調整：保持百分比
        if (oldMaxHp > 0) {
            const hpRatio = this.hp / oldMaxHp;
            this.hp = Math.floor(this.maxHp * hpRatio);
        } else {
            this.hp = this.maxHp; // 初始化時設為滿血
        }

        // 魔力調整：保持百分比
        if (oldMaxMp > 0) {
            const mpRatio = this.mp / oldMaxMp;
            this.mp = Math.floor(this.maxMp * mpRatio);
        } else {
            this.mp = this.maxMp; // 初始化時設為滿魔
        }

        // 確保不超過最大值
        this.hp = Math.min(this.hp, this.maxHp);
        this.mp = Math.min(this.mp, this.maxMp);
    }

    /**
     * 分配屬性點（只修改基礎屬性點）
     */
    public allocateStatPoint(stat: StatType, points: number = 1): boolean {
        if (this.statPoints < points) return false;

        this.statPoints -= points;
        this.usedPoints += points;

        // 只修改屬性點，不直接修改數值
        switch (stat) {
            case 'vit':
                this.vit += points;
                break;
            case 'str':
                this.str += points;
                break;
            case 'agi':
                this.agi += points;
                break;
            case 'int':
                this.int += points;
                break;
        }

        // 重新計算最終屬性
        this.recalculateAllStats();
        return true;
    }

    /**
     * 裝備加成管理
     */
    public applyEquipmentBonus(bonuses: EquipmentBonus[]): void {
        // 重置裝備加成
        this.equipmentHpBonus = 0;
        this.equipmentAttackBonus = 0;

        this.equipmentMpBonus = 0;
        this.hpMultiplier = 1.0;
        this.attackMultiplier = 1.0;
        this.speedMultiplier = 1.0;
        this.mpMultiplier = 1.0;

        // 累加所有裝備的加成
        for (const bonus of bonuses) {
            this.equipmentHpBonus += bonus.hpBonus || 0;
            this.equipmentAttackBonus += bonus.attackBonus || 0;

            this.equipmentMpBonus += bonus.mpBonus || 0;

            this.hpMultiplier *= (1 + (bonus.hpMultiplier || 0));
            this.attackMultiplier *= (1 + (bonus.attackMultiplier || 0));
            this.speedMultiplier *= (1 + (bonus.speedMultiplier || 0));
            this.mpMultiplier *= (1 + (bonus.mpMultiplier || 0));
        }

        // 重新計算最終屬性
        this.recalculateAllStats();
    }

    /**
     * Buff 效果管理
     */
    public applyBuffEffects(buffs: BuffEffect[]): void {
        // 重置 Buff 加成
        this.buffHpBonus = 0;
        this.buffAttackBonus = 0;

        this.buffMpBonus = 0;

        // 累加所有 Buff 的效果
        for (const buff of buffs) {
            if (buff.type === 'hp_boost') {
                this.buffHpBonus += buff.value;
            } else if (buff.type === 'attack_boost') {
                this.buffAttackBonus += buff.value;
            }
        }

        // 重新計算最終屬性
        this.recalculateAllStats();
    }

    // 覆寫扣血方法，處理無敵時間
    takeDamage(amount: number): boolean {
        if (this.invincibleRemaining > 0) {
            return false; // 無敵期間不受傷害
        }

        const died = super.takeDamage(amount);
        if (!died) {
            this.invincibleRemaining = 1000; // 受傷後1秒無敵
        }
        return died;
    }

    // 更新無敵時間
    updateInvincible(deltaTime: number): void {
        if (this.invincibleRemaining > 0) {
            this.invincibleRemaining = Math.max(0, this.invincibleRemaining - deltaTime);
        }
    }

    // =================== 🆕 新的武器管理系統 ===================

    /**
     * 🆕 獲取武器實例（懶加載）
     */
    private getWeaponInstance(inventoryIndex: number): WeaponBasic | null {
        if (!this.weaponInstances.has(inventoryIndex)) {
            const weaponData = this.weaponInventory[inventoryIndex];
            if (!weaponData) return null;

            const instance = WeaponInstanceManager.getOrCreateInstance(weaponData);
            if (instance) {
                this.weaponInstances.set(inventoryIndex, instance);
            }
        }

        return this.weaponInstances.get(inventoryIndex) || null;
    }

    /**
     * 🆕 獲取當前裝備的武器實例
     */
    public getEquippedWeapons(): WeaponBasic[] {
        const weapons: WeaponBasic[] = [];

        for (const index of this.equippedWeaponIndices) {
            const weapon = this.getWeaponInstance(index);
            if (weapon) {
                weapons.push(weapon);
            }
        }

        return weapons;
    }

    /**
     * 🆕 添加武器到背包
     */
    public addWeaponToInventory(weaponId: string): number {
        const weaponData = new WeaponData(weaponId);
        this.weaponInventory.push(weaponData);
        const newIndex = this.weaponInventory.length - 1;

        console.log(`${this.name} 獲得了武器: ${weaponData.getDisplayName()}`);
        return newIndex;
    }

    /**
     * 🆕 裝備武器（通過背包索引）
     */
    public equipWeaponByIndex(inventoryIndex: number): boolean {
        if (inventoryIndex < 0 || inventoryIndex >= this.weaponInventory.length) {
            console.warn(`無效的武器索引: ${inventoryIndex}`);
            return false;
        }

        const weaponData = this.weaponInventory[inventoryIndex];
        if (!weaponData || weaponData.isEquipped) {
            console.warn(`武器無法裝備: ${weaponData?.weaponId} (已裝備: ${weaponData?.isEquipped})`);
            return false;
        }

        // 檢查裝備槽
        if (this.equippedWeaponIndices.length >= 8) {
            console.warn("裝備槽已滿");
            return false;
        }

        // 裝備武器
        weaponData.isEquipped = true;
        this.equippedWeaponIndices.push(inventoryIndex);

        // 清除實例快取，強制重新創建（應用最新數據）
        this.weaponInstances.delete(inventoryIndex);

        console.log(`${this.name} 裝備了武器: ${weaponData.getDisplayName()}`);
        return true;
    }

    /**
     * 🆕 卸下武器（通過裝備槽索引）
     */
    public unequipWeaponBySlot(slotIndex: number): boolean {
        if (slotIndex < 0 || slotIndex >= this.equippedWeaponIndices.length) {
            console.warn(`無效的裝備槽索引: ${slotIndex}`);
            return false;
        }

        const inventoryIndex = this.equippedWeaponIndices[slotIndex];
        const weaponData = this.weaponInventory[inventoryIndex];

        if (!weaponData) {
            console.warn(`找不到武器數據，索引: ${inventoryIndex}`);
            return false;
        }

        // 卸下武器
        weaponData.isEquipped = false;
        this.equippedWeaponIndices.splice(slotIndex, 1);

        // 保留實例快取，避免重複創建
        // this.weaponInstances.delete(inventoryIndex); // 不刪除

        console.log(`${this.name} 卸下了武器: ${weaponData.getDisplayName()}`);
        return true;
    }

    // =================== 🔄 更新現有方法 ===================

    //嘗試進行攻擊
    public tryAttack(enemies: ServerGameUnit[]): WeaponAttackResult[] {
        const results: WeaponAttackResult[] = [];

        // 🔄 使用新的武器系統
        const equippedWeapons = this.getEquippedWeapons();
        for (const weapon of equippedWeapons) {
            if (weapon) {
                // 使用新的武器接口，傳入攻擊者和潛在目標
                const result = weapon.tryAttack(this, enemies);
                if (result.success) {
                    results.push(result);
                }
            }
        }

        return results;
    }

    /**
     * 裝備武器 (已棄用，使用新的武器管理系統)
     * @deprecated 使用 addWeaponToInventory + equipWeaponByIndex 代替
     */
    public equipWeapon(weaponId: string): boolean {
        console.warn(`equipWeapon(${weaponId}) 已棄用，請使用新的武器管理系統`);

        // 為了向後兼容，自動添加到背包並裝備
        const inventoryIndex = this.addWeaponToInventory(weaponId);
        return this.equipWeaponByIndex(inventoryIndex);
    }

    /**
     * 卸下武器 (已棄用，使用新的武器管理系統)
     * @deprecated 使用 unequipWeaponBySlot 代替
     */
    public unequipWeapon(weaponId: string): boolean {
        console.warn(`unequipWeapon(${weaponId}) 已棄用，請使用新的武器管理系統`);

        // 為了向後兼容，找到武器並卸載
        for (let i = 0; i < this.equippedWeaponIndices.length; i++) {
            const inventoryIndex = this.equippedWeaponIndices[i];
            const weaponData = this.weaponInventory[inventoryIndex];

            if (weaponData && weaponData.weaponId === weaponId) {
                return this.unequipWeaponBySlot(i);
            }
        }

        console.warn(`找不到已裝備的武器: ${weaponId}`);
        return false;
    }
}