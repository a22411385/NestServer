import { ArraySchema, MapSchema, type } from "@colyseus/schema";
import { UnitType } from "../GameState";

import { ServerGameUnit } from "./GameUnit";
import { WeaponBasic } from "../Weapon/Baisc/WeaponBasic";
import { WeaponSchema } from "../Weapon/WeaponSchema";
import { AttackResult, AttributeBonus, BuffEffect, StatType } from "@/Types";
import { ConfigManager } from "@/Game/Managers/ConfigManager";
import { WeaponSystemFacade } from "@/Game/Systems/Battle/WeaponSystemFacade";
import { WeaponInstanceManager } from "@/Game/Managers/WeaponInstanceManager";
import { WeaponConfigDefinition, WeaponQuality } from "@/Types/Equipment/WeaponPropertyTypes";

const HERO_MAX_WEAPON_SLOTS = 1; // 🎯 改為只能裝備 1 個武器
// 玩家操控的主要單位
export class ServerHero extends ServerGameUnit {

    @type("number") invincibleRemaining: number = 0; // 無敵剩餘時間 (ms)
    @type("number") level: number = 1;
    @type("number") exp: number = 0;

    @type([WeaponSchema]) public weaponInventory = new ArraySchema<WeaponSchema>();

    // 材料庫存 (key: MaterialType, value: quantity)
    @type({ map: "number" }) public materials = new MapSchema<number>();

    @type("number") public gold: number = 0; // 新增金幣屬性
    @type("number") public pickupRange: number = 5; // 拾取範圍
    @type("number") public visionRange: number = 1500; // 🔧 視野範圍（用於戰爭迷霧）

    // === 基礎屬性點 (永久，升級分配) ===
    @type("number") public vit: number = 10;        // 體質點數 (基礎)
    @type("number") public str: number = 10;        // 力量點數 (基礎)
    @type("number") public agi: number = 10;        // 敏捷點數 (基礎)
    @type("number") public int: number = 10;        // 智力點數 (基礎)

    // === 🆕 武器屬性加成 (動態，裝備武器獲得) - 同步到客戶端用於UI顯示 ===
    @type("number") public weaponVit: number = 0;   // 武器提供的體質加成
    @type("number") public weaponStr: number = 0;   // 武器提供的力量加成
    @type("number") public weaponAgi: number = 0;   // 武器提供的敏捷加成
    @type("number") public weaponInt: number = 0;   // 武器提供的智力加成

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

    // === 🆕 副屬性 (同步到客戶端) ===
    @type("number") public critRate: number = 0;     // 暴擊率 (百分比)
    @type("number") public dodgeRate: number = 0;    // 閃避率 (百分比)

    // === 副屬性 (不同步) ===
    public baseExpMultiplier: number = 30;


    constructor() {
        super();

        // 設置基礎屬性
        this.baseHp = 1000000;
        this.baseMp = 100;
        this.baseAttackDamage = 10;

        this.baseMoveSpeed = 50; // 每秒移動50像素
        this.scale = 1.0; // 預設縮放為1

        this.type = UnitType.hero;
        this.attackRange = 100;
        this.hpRegen = 1;
        this.mpRegen = 0.5;


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
     * 每秒回復生命/法力
     * 如果回復後超過最大值，則設定為最大值
     */
    public regenerate(): void {
        if (this.isDead) return;

        // 回復生命值，確保不超過最大值
        if (this.hp < this.maxHp) {
            const hpRegenAmount = this.hpRegen + this.vit * 0.1;
            this.hp = Math.min(this.hp + hpRegenAmount, this.maxHp);
        }

        // 回復魔力值，確保不超過最大值
        if (this.mp < this.maxMp) {
            const mpRegenAmount = this.mpRegen + this.int * 0.1;
            this.mp = Math.min(this.mp + mpRegenAmount, this.maxMp);
        }
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
        // 🔄 0. 首先收集所有裝備武器的屬性加成
        this.updateWeaponAttributeBonuses();

        // 1. 計算總屬性點 (基礎屬性 + 武器屬性)
        const totalVit = this.vit + this.weaponVit;
        const totalStr = this.str + this.weaponStr;
        const totalAgi = this.agi + this.weaponAgi;
        const totalInt = this.int + this.weaponInt;

        // 2. 計算屬性點加成
        const vitBonus = totalVit * 5;      // 每點體質 +5 血量
        const strBonus = totalStr * 2;      // 每點力量 +2 攻擊
        const agiBonus = totalAgi * 0.5;    // 每點敏捷 +0.5 速度
        const intBonus = totalInt * 3;      // 每點智力 +3 魔力

        // 🆕 計算回復與防禦
        const vitRegenBonus = totalVit * 0.1;    // 每點體質 +0.1 生命回復/秒
        const intRegenBonus = totalInt * 0.2;    // 每點智力 +0.2 魔力回復/秒
        const vitDefenseBonus = totalVit * 0.5;  // 每點體質 +0.5 物理防禦
        const intDefenseBonus = totalInt * 0.5;  // 每點智力 +0.5 魔法防禦

        // 3. 計算最終數值 = 基礎值 + 屬性加成 + 裝備加成 + Buff加成
        const finalHp = (this.baseHp + vitBonus + this.equipmentHpBonus + this.buffHpBonus) * this.hpMultiplier;
        const finalAttack = (this.baseAttackDamage + strBonus + this.equipmentAttackBonus + this.buffAttackBonus) * this.attackMultiplier;
        const finalMp = (this.baseMp + intBonus + this.equipmentMpBonus + this.buffMpBonus) * this.mpMultiplier;
        const finalSpeed = totalAgi * 0.02 + this.baseMoveSpeed;

        // 3. 更新最終屬性
        const oldMaxHp = this.maxHp;
        const oldMaxMp = this.maxMp;

        this.maxHp = Math.floor(finalHp);
        this.attackDamage = Math.floor(finalAttack);
        this.maxMp = Math.floor(finalMp);
        this.moveSpeed = Math.floor(finalSpeed);

        // 🆕 更新回復與防禦屬性
        this.hpRegen = Math.floor((1 + vitRegenBonus) * 10) / 10;  // 基礎1 + 體質加成，保留1位小數
        this.mpRegen = Math.floor((0.5 + intRegenBonus) * 10) / 10;  // 基礎0.5 + 智力加成，保留1位小數
        this.physicalDefense = Math.floor(vitDefenseBonus);  // 體質提供物理防禦
        this.magicDefense = Math.floor(intDefenseBonus);     // 智力提供魔法防禦

        // 🆕 計算副屬性 (暴擊率、閃避率)
        this.critRate = Math.floor((totalAgi * 0.1 + totalStr * 0.05) * 10) / 10;  // 每點敏捷 +0.1%，每點力量 +0.05%
        this.dodgeRate = Math.floor((totalAgi * 0.15) * 10) / 10;                    // 每點敏捷 +0.15%

        // 4. 處理當前血量/魔力的變化
        this.adjustCurrentValues(oldMaxHp, oldMaxMp);
    }

    /**
     * 🆕 更新武器屬性加成
     * 遍歷所有裝備的武器，累加它們的基本屬性
     */
    private updateWeaponAttributeBonuses(): void {
        // 重置武器屬性加成
        this.weaponStr = 0;
        this.weaponInt = 0;
        this.weaponAgi = 0;
        this.weaponVit = 0;

        // 遍歷所有裝備的武器
        for (const weapon of this.weaponInventory) {
            const weaponSchema = this.findWeaponSchemaById(weapon.uniqueId);
            if (weaponSchema) {
                this.weaponStr += weaponSchema.str || 0;
                this.weaponInt += weaponSchema.int || 0;
                this.weaponAgi += weaponSchema.agi || 0;
                this.weaponVit += weaponSchema.vit || 0;
            }
        }
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
     * 裝備屬性加成管理
     */
    public applyEquipmentBonus(bonuses: AttributeBonus[]): void {
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


    // =================== 🔍 武器查詢與實例管理 ===================

    /**
     * 根據唯一ID查找武器 Schema
     */
    public findWeaponSchemaById(uniqueId: string): WeaponSchema | null {
        for (const weaponSchema of this.weaponInventory) {
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
            console.warn(`[${this.name}] 找不到武器: ${uniqueId}`);
            return null;
        }

        return weaponSchema.getLogicInstance();
    }

    /**
     * 獲取當前裝備的武器實例
     */
    public getEquippedWeapons(): WeaponBasic[] {
        const weapons: WeaponBasic[] = [];

        for (let i = 0; i < this.weaponInventory.length; i++) {
            const weaponSchema = this.weaponInventory[i];

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

    /**
     * 添加武器到身上
     */
    public adddWeapon(weaponId: string): string {
        // 使用 Facade 創建完整武器數據
        const config = ConfigManager.getById<WeaponConfigDefinition>('WeaponConfigs', weaponId);
        if (!config) {
            throw new Error(`無法找到武器配置: ${weaponId}`);
        }

        const { data } = WeaponSystemFacade.createAndGetWeapon(weaponId, config.classModule);
        this.weaponInventory.push(data);

        console.log(`${this.name} 獲得了武器: ${data.weaponId} (${data.uniqueId})`);
        return data.uniqueId;  // 返回唯一ID而不是索引
    }

    /**
     * 移除武器（賣掉或刪除）
     */
    public removeWeapon(weaponUniqueId: string): boolean {
        // 先確保武器未裝備
        if (this.isEquipped(weaponUniqueId)) {
            this.unequip(weaponUniqueId);
        }

        // 從背包移除
        const index = this.weaponInventory.findIndex((weapon: WeaponSchema) => weapon.uniqueId === weaponUniqueId);
        if (index !== -1) {
            const weaponSchema = this.weaponInventory[index];
            this.weaponInventory.splice(index, 1)
            const displayName = WeaponSystemFacade.getWeaponDisplayName(weaponSchema);
            console.log(`${this.name} 移除了武器: ${displayName}`);
            return true;
        }

        console.warn(`找不到要移除的武器: ${weaponUniqueId}`);
        return false;
    }

    // =================== ⚔️ 裝備管理 ===================

    /**
     * 裝備武器
     * 🎯 單武器模式：裝備新武器時自動卸下舊武器
     */
    public equip(weaponIdentifier: string): boolean {

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

        // 🎯 單武器模式：檢查是否已有裝備的武器，自動卸下
        const currentEquipped = this.weaponInventory.find((w: WeaponSchema) => w.isEquipped);
        if (currentEquipped) {
            //  const oldWeaponName = WeaponSystemFacade.getWeaponDisplayName(currentEquipped);
            // console.log(`[${this.name}] 自動卸下舊武器: ${oldWeaponName}`);
            currentEquipped.isEquipped = false;
        }

        // 裝備武器 (只設置標記，不需要 push，因為武器已經在 inventory 裡)
        weaponData.isEquipped = true;

        // 修復：使用 WeaponInstanceManager 清除快取，強制重新創建
        WeaponInstanceManager.invalidateCache(weaponData);

        // ✅ 觸發屬性重算（武器屬性會自動被收集並應用）
        this.recalculateAllStats();

        const displayName = WeaponSystemFacade.getWeaponDisplayName(weaponData);
        console.log(`[${this.name}] 裝備了武器: ${displayName}`);
        return true;
    }

    /**
     * 卸下武器
     */
    public unequip(weaponIdentifier: string): boolean {

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
        this.recalculateAllStats();

        const displayName = WeaponSystemFacade.getWeaponDisplayName(weaponData);
        console.log(`[${this.name}] 已卸下武器: ${displayName}`);
        return true;
    }

    /**
     * 檢查武器是否已裝備
     */
    public isEquipped(weaponUniqueId: string): boolean {
        return this.weaponInventory.some((weapon: WeaponSchema) => weapon.uniqueId === weaponUniqueId);
    }

    // =================== 💰 武器交易 ===================
    /**
     * 賣掉武器（轉為金幣）
     */
    public sellWeapon(weaponUniqueId: string): number {
        const weaponIndex = this.weaponInventory.findIndex((weapon: WeaponSchema) => weapon.uniqueId === weaponUniqueId);

        if (weaponIndex === -1) {
            console.warn(`${this.name} 找不到要賣掉的武器: ${weaponUniqueId}`);
            return 0;
        }

        const weaponData = this.weaponInventory[weaponIndex];

        // 先卸下武器（如果已裝備）
        if (this.isEquipped(weaponUniqueId)) {
            this.unequip(weaponUniqueId);
        }

        // 計算武器價值
        const sellPrice = this.calculateSellPrice(weaponData);

        // 從背包移除
        this.weaponInventory.splice(weaponIndex, 1);

        // 清理武器實例快取
        WeaponInstanceManager.invalidateCache(weaponData);

        // 增加金幣
        this.gold += sellPrice;

        console.log(`${this.name} 賣掉了武器: ${weaponData.weaponId}, 獲得 ${sellPrice} 金幣`);
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
                const result = weapon.tryAttack(this, enemies);

                if (result.success) {
                    results.push(result);
                }
            }
        }

        return results;
    }
}