import { ArraySchema, type } from "@colyseus/schema";
import { UnitType } from "../GameState";

import { ServerGameUnit } from "./GameUnit";
import { WeaponAttackResult } from "@/Types";
import { WeaponBasic } from "../Weapon/Baisc/WeaponBasic";
import { ServerItem } from "../Item/ServerItem";
import { WeaponData } from "../Weapon/WeaponData";
import { WeaponSystemFacade } from "../../../Game/Systems/WeaponSystemFacade";
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

    // 🆕 當前裝備的武器唯一ID（同步到客戶端）
    @type(["string"]) public equippedWeaponIds = new ArraySchema<string>();

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

    constructor() {
        super();

        // 設置基礎屬性
        this.baseHp = 1000000;
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
     * 🆕 獲取武器實例（懶加載）- 統一使用 WeaponInstanceManager
     */
    private getWeaponInstance(weaponId: string): WeaponBasic | null {
        // 找到對應的 weaponData
        const weaponData = this.findWeaponDataById(weaponId);
        if (!weaponData) {
            console.warn(`[${this.name}] 找不到武器數據: ${weaponId}`);
            return null;
        }

        // 🔧 統一使用 WeaponInstanceManager，移除重複快取
        return WeaponInstanceManager.getOrCreateInstance(weaponData);
    }

    /**
     * 🆕 根據唯一ID查找武器數據
     */
    private findWeaponDataById(uniqueId: string): WeaponData | null {
        for (const weaponData of this.weaponInventory) {
            if (weaponData.uniqueId === uniqueId) {
                return weaponData;
            }
        }
        return null;
    }

    /**
     * 🆕 獲取當前裝備的武器實例
     */
    public getEquippedWeapons(): WeaponBasic[] {
        const weapons: WeaponBasic[] = [];

        console.log(`[${this.name}] 檢查裝備武器，數量: ${this.equippedWeaponIds.length}`);
        for (let i = 0; i < this.equippedWeaponIds.length; i++) {
            const weaponId = this.equippedWeaponIds[i];
            console.log(`[${this.name}] 處理武器 ${i}: ${weaponId}`);

            const weapon = this.getWeaponInstance(weaponId);
            if (weapon) {
                weapons.push(weapon);
                console.log(`[${this.name}] 武器實例獲取成功: ${weaponId}`);
            } else {
                console.warn(`[${this.name}] 武器實例獲取失敗: ${weaponId}`);
            }
        }

        console.log(`[${this.name}] 最終可用武器數量: ${weapons.length}`);
        return weapons;
    }

    /**
     * 🆕 添加武器到背包
     */
    public addWeaponToInventory(weaponId: string): string {
        // 🎭 使用 Facade 創建完整武器數據
        const { data } = WeaponSystemFacade.createAndGetWeapon(weaponId);
        this.weaponInventory.push(data);

        console.log(`${this.name} 獲得了武器: ${data.weaponId} (${data.uniqueId})`);
        return data.uniqueId;  // 返回唯一ID而不是索引
    }

    /**
     * 🆕 裝備武器（通過武器唯一ID）
     */
    public equipWeaponById(weaponUniqueId: string): boolean {
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
        if (this.equippedWeaponIds.length >= 8) {
            console.warn("裝備槽已滿");
            return false;
        }

        // 裝備武器
        weaponData.isEquipped = true;
        this.equippedWeaponIds.push(weaponUniqueId);

        // 🔧 修復：使用 WeaponInstanceManager 清除快取，強制重新創建
        WeaponInstanceManager.invalidateCache(weaponData);

        const displayName = WeaponSystemFacade.getWeaponDisplayName(weaponData);
        console.log(`${this.name} 裝備了武器: ${displayName}`);
        return true;
    }

    /**
     * 🆕 裝備武器（通過背包索引 - 便利方法）
     */
    public equipWeaponByIndex(inventoryIndex: number): boolean {
        if (inventoryIndex < 0 || inventoryIndex >= this.weaponInventory.length) {
            console.warn(`無效的武器索引: ${inventoryIndex}`);
            return false;
        }

        const weaponData = this.weaponInventory[inventoryIndex];
        if (!weaponData) {
            console.warn(`找不到武器，索引: ${inventoryIndex}`);
            return false;
        }

        return this.equipWeaponById(weaponData.uniqueId);
    }

    /**
     * 🆕 卸下武器（通過裝備槽索引）
     */
    public unequipWeaponBySlot(slotIndex: number): boolean {
        console.log(`[${this.name}] 嘗試卸下裝備槽 ${slotIndex} 的武器`);
        console.log(`[${this.name}] 當前裝備武器列表:`, this.equippedWeaponIds.toArray());

        if (slotIndex < 0 || slotIndex >= this.equippedWeaponIds.length) {
            console.warn(`[${this.name}] 無效的裝備槽索引: ${slotIndex}, 總裝備數: ${this.equippedWeaponIds.length}`);
            return false;
        }

        const weaponUniqueId = this.equippedWeaponIds[slotIndex];
        console.log(`[${this.name}] 準備卸下武器: ${weaponUniqueId}`);

        const weaponData = this.findWeaponDataById(weaponUniqueId);

        if (!weaponData) {
            console.warn(`[${this.name}] 找不到武器數據，ID: ${weaponUniqueId}`);
            return false;
        }

        // 卸下武器
        weaponData.isEquipped = false;
        this.equippedWeaponIds.splice(slotIndex, 1);

        // 🔧 可選：保留實例快取，避免重複創建（由 WeaponInstanceManager 管理）
        // WeaponInstanceManager.invalidateCache(weaponData); // 卸載時不清理快取

        const displayName = WeaponSystemFacade.getWeaponDisplayName(weaponData);
        console.log(`[${this.name}] 已卸下武器: ${displayName}`);
        console.log(`[${this.name}] 卸載後裝備武器列表:`, this.equippedWeaponIds.toArray());
        return true;
    }

    /**
     * 🆕 卸下武器（通過武器唯一ID）
     */
    public unequipWeaponById(weaponUniqueId: string): boolean {
        const slotIndex = this.equippedWeaponIds.findIndex(id => id === weaponUniqueId);
        if (slotIndex === -1) {
            console.warn(`武器未裝備: ${weaponUniqueId}`);
            return false;
        }
        return this.unequipWeaponBySlot(slotIndex);
    }

    /**
     * 🆕 從背包移除武器（賣掉或刪除）
     */
    public removeWeaponFromInventory(weaponUniqueId: string): boolean {
        // 先確保武器未裝備
        if (this.isWeaponEquipped(weaponUniqueId)) {
            this.unequipWeaponById(weaponUniqueId);
        }

        // 從背包移除
        const index = this.weaponInventory.findIndex(weapon => weapon.uniqueId === weaponUniqueId);
        if (index !== -1) {
            const weaponData = this.weaponInventory[index];
            this.weaponInventory.splice(index, 1);

            // 🔧 清理實例快取 - 使用 WeaponInstanceManager
            WeaponInstanceManager.invalidateCache(weaponData);

            const displayName = WeaponSystemFacade.getWeaponDisplayName(weaponData);
            console.log(`${this.name} 移除了武器: ${displayName}`);
            return true;
        }

        console.warn(`找不到要移除的武器: ${weaponUniqueId}`);
        return false;
    }

    /**
     * 🆕 檢查武器是否已裝備
     */
    public isWeaponEquipped(weaponUniqueId: string): boolean {
        return this.equippedWeaponIds.includes(weaponUniqueId);
    }

    // =================== 🔄 更新現有方法 ===================

    /**
     * 🔧 武器系統檢測方法 - 用於調試
     */
    public validateWeaponSystem(): void {
        console.log(`[${this.name}] === 武器系統狀態檢查 ===`);
        console.log(`[${this.name}] 背包武器總數: ${this.weaponInventory.length}`);
        console.log(`[${this.name}] 裝備武器ID數量: ${this.equippedWeaponIds.length}`);
        console.log(`[${this.name}] 裝備武器列表:`, this.equippedWeaponIds.toArray());

        // 檢查每個裝備武器的狀態
        for (let i = 0; i < this.equippedWeaponIds.length; i++) {
            const weaponId = this.equippedWeaponIds[i];
            const weaponData = this.findWeaponDataById(weaponId);
            const weaponInstance = this.getWeaponInstance(weaponId);

            console.log(`[${this.name}] 武器槽 ${i}:`);
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
        console.log(`[${this.name}] WeaponInstanceManager 快取狀態:`, cacheStats);
        console.log(`[${this.name}] === 武器系統檢查結束 ===`);
    }

    //嘗試進行攻擊
    public tryAttack(enemies: ServerGameUnit[]): WeaponAttackResult[] {
        const results: WeaponAttackResult[] = [];

        // 🔄 使用新的武器系統
        const equippedWeapons = this.getEquippedWeapons();
        //console.log(`[${this.name}] 攻擊檢查：共有 ${equippedWeapons.length} 個可用武器`);

        for (let i = 0; i < equippedWeapons.length; i++) {
            const weapon = equippedWeapons[i];
            if (weapon) {
                //      console.log(`[${this.name}] 嘗試使用武器 ${i}: ${weapon.constructor.name}`);

                // 使用新的武器接口，傳入攻擊者和潛在目標
                const result = weapon.tryAttack(this, enemies);

                if (result.success) {
                    //  console.log(`[${this.name}] 武器 ${i} 攻擊成功`);
                    results.push(result);
                } else {
                    // console.log(`[${this.name}] 武器 ${i} 攻擊失敗或冷卻中`);
                }
            }
        }

        // console.log(`[${this.name}] 攻擊結果：${results.length} 個武器成功攻擊`);
        return results;
    }
}