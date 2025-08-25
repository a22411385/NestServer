import { ArraySchema, type } from "@colyseus/schema";
import { UnitType } from "../GameState";

import { ServerGameUnit } from "./GameUnit";
import { WeaponAttackResult, WeaponBasic } from "../Weapon/Baisc/WeaponBasic";
import { WeaponFactory } from "../Weapon/Baisc/WeaponFactory";

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

    //武器插槽
    @type(["string"]) public equippedWeapons = new ArraySchema<string>();

    // 武器實例管理 (不同步給客戶端)
    private weaponInstances: Map<string, WeaponBasic> = new Map();

    constructor() {
        super();

        // 設置基礎屬性
        this.baseHp = 100;
        this.baseMp = 100;
        this.baseAttackDamage = 10;

        this.baseMoveSpeed = 50; // 每秒移動50像素
        this.radius = 20;
        this.collisionWidth = 32;
        this.collisionHeight = 40;
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

    //嘗試進行攻擊
    public tryAttack(enemies: ServerGameUnit[]): WeaponAttackResult[] {
        const results: WeaponAttackResult[] = [];

        //嘗試呼叫所有武器進行攻擊
        for (const weaponId of this.equippedWeapons) {
            const weapon = this.weaponInstances.get(weaponId);
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
     * 裝備武器
     */
    public equipWeapon(weaponId: string): boolean {
        // 檢查是否已經裝備
        if (this.equippedWeapons.includes(weaponId)) {
            return false;
        }

        // 檢查裝備槽是否已滿（假設最多8個槽位）
        if (this.equippedWeapons.length >= 8) {
            return false;
        }

        // 創建武器實例
        const weaponInstance = WeaponFactory.createWeapon(weaponId);

        if (!weaponInstance) {
            console.warn(`Failed to create weapon: ${weaponId}`);
            return false;
        }

        // 添加到裝備列表和實例管理
        this.equippedWeapons.push(weaponId);
        this.weaponInstances.set(weaponId, weaponInstance);

        console.log(`${this.name} 裝備了武器: ${weaponId}`);
        return true;
    }

    /**
     * 卸下武器
     */
    public unequipWeapon(weaponId: string): boolean {
        const index = this.equippedWeapons.findIndex(id => id === weaponId);
        if (index === -1) {
            return false;
        }

        // 從裝備列表移除
        this.equippedWeapons.splice(index, 1);

        // 移除武器實例
        this.weaponInstances.delete(weaponId);

        console.log(`${this.name} 卸下了武器: ${weaponId}`);
        return true;
    }


    /**
     * 獲取裝備的武器實例
     */
    public getWeaponInstances(): Map<string, any> {
        return this.weaponInstances;
    }
}