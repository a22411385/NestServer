import { WeaponData } from "../../Colyseus/Schema/Weapon/WeaponData";
import { WeaponBasic } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { getWeaponConfig } from "../Factories/WeaponConfig";
import { FinalWeaponStats } from "@/Types";

// 移除重複的interface定義，已搬移到Types資料夾

/**
 * 武器數據服務 - 專注於武器數據的業務邏輯計算
 * 不負責實例管理和緩存，只處理純計算邏輯
 */
export class WeaponDataService {

    /**
     * 計算武器的最終屬性
     */
    static calculateFinalStats(weaponData: WeaponData): FinalWeaponStats {
        const config = getWeaponConfig(weaponData.weaponId);

        if (!config) {
            console.warn(`找不到武器配置: ${weaponData.weaponId}`);
            return this.getDefaultStats(weaponData.weaponId);
        }

        // 計算各種加成乘數
        const multipliers = this.calculateMultipliers(weaponData);

        // 計算最終屬性
        const finalDamage = Math.floor(config.baseDamage * multipliers.damage);
        const finalRange = Math.floor(config.attackRange * multipliers.range);
        const finalSpeed = Math.max(100, Math.floor(config.attackSpeed * multipliers.speed));

        // 計算屬性加成
        const intBonus = Math.floor((config.specialProperties?.intBonus || 0) * multipliers.stats);
        const agiBonus = Math.floor((config.specialProperties?.agiBonus || 0) * multipliers.stats);
        const strBonus = Math.floor((config.specialProperties?.strBonus || 0) * multipliers.stats);
        const vitBonus = Math.floor((config.specialProperties?.vitBonus || 0) * multipliers.stats);

        // 生成顯示名稱
        const displayName = this.generateDisplayName(weaponData, config);

        return {
            finalDamage,
            finalRange,
            finalSpeed,
            intBonus,
            agiBonus,
            strBonus,
            vitBonus,
            displayName,
            rarity: config.rarity
        };
    }

    /**
     * 計算各種加成乘數
     */
    private static calculateMultipliers(weaponData: WeaponData): {
        damage: number;
        range: number;
        speed: number;
        stats: number;
    } {
        // 等級加成（每級+10%）
        const levelMultiplier = 1 + (weaponData.level - 1) * 0.1;

        // 強化加成（每級+5%）
        const enhanceMultiplier = 1 + weaponData.enhanceLevel * 0.05;

        // 耐久度影響（低於50%時開始有懲罰）
        let durabilityMultiplier = 1;
        if (weaponData.durability < 50) {
            const durabilityPenalty = (50 - weaponData.durability) / 50; // 0-1
            durabilityMultiplier = 1 - durabilityPenalty * 0.3; // 最多-30%
        }

        const damageMultiplier = levelMultiplier * enhanceMultiplier * durabilityMultiplier;
        const rangeMultiplier = levelMultiplier + (weaponData.enhanceLevel * 0.02); // 強化微幅增加射程
        const speedMultiplier = Math.max(0.5, 1 - (weaponData.level - 1) * 0.02); // 等級降低攻擊間隔
        const statsMultiplier = levelMultiplier;

        return {
            damage: damageMultiplier,
            range: rangeMultiplier,
            speed: speedMultiplier,
            stats: statsMultiplier
        };
    }

    /**
     * 生成武器顯示名稱
     */
    static generateDisplayName(weaponData: WeaponData, config?: any): string {
        const weaponConfig = config || getWeaponConfig(weaponData.weaponId);
        let baseName = weaponConfig?.displayName || weaponData.weaponId
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

        // 添加強化等級
        if (weaponData.enhanceLevel > 0) {
            baseName += ` +${weaponData.enhanceLevel}`;
        }

        // 添加武器等級
        if (weaponData.level > 1) {
            baseName += ` (Lv.${weaponData.level})`;
        }

        return baseName;
    }

    /**
     * 將最終屬性應用到武器實例
     */
    static applyStatsToInstance(instance: WeaponBasic, stats: FinalWeaponStats): void {
        instance.baseDamage = stats.finalDamage;
        instance.attackRange = stats.finalRange;
        instance.attackSpeed = stats.finalSpeed;
        instance.name = stats.displayName;
        instance.rarity = stats.rarity;
        instance.int = stats.intBonus;
        instance.agi = stats.agiBonus;
        instance.str = stats.strBonus;
        instance.vit = stats.vitBonus;
    }

    /**
     * 獲取默認屬性（當配置不存在時）
     */
    private static getDefaultStats(weaponId: string): FinalWeaponStats {
        return {
            finalDamage: 10,
            finalRange: 50,
            finalSpeed: 1000,
            intBonus: 0,
            agiBonus: 0,
            strBonus: 0,
            vitBonus: 0,
            displayName: weaponId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            rarity: 'common'
        };
    }

    /**
     * 計算武器經驗需求
     */
    static getExpRequirement(level: number): number {
        return level * 100 + (level - 1) * 50;
    }

    /**
     * 增加經驗值
     */
    static addExp(weaponData: WeaponData, amount: number): boolean {
        weaponData.exp += amount;
        const requiredExp = this.getExpRequirement(weaponData.level);

        if (weaponData.exp >= requiredExp && weaponData.level < 100) {
            weaponData.exp -= requiredExp;
            weaponData.level += 1;
            return true; // 升級了
        }

        return false; // 沒升級
    }

    /**
     * 強化武器
     */
    static enhance(weaponData: WeaponData): boolean {
        if (weaponData.enhanceLevel >= 15) return false; // 最高強化+15

        weaponData.enhanceLevel += 1;
        weaponData.durability = Math.min(100, weaponData.durability + 5);
        return true;
    }

    /**
     * 修復武器耐久度
     */
    static repair(weaponData: WeaponData, amount: number = 100): void {
        weaponData.durability = Math.min(100, weaponData.durability + amount);
    }

    /**
     * 檢查武器是否可用
     */
    static isUsable(weaponData: WeaponData): boolean {
        return weaponData.durability > 0;
    }

    /**
     * 檢查武器是否可以升級
     */
    static canLevelUp(weaponData: WeaponData): boolean {
        if (weaponData.level >= 100) return false; // 最高等級

        const requiredExp = this.getExpRequirement(weaponData.level);
        return weaponData.exp >= requiredExp;
    }

    /**
     * 計算武器價值（用於排序等）
     */
    static calculateValue(weaponData: WeaponData): number {
        const config = getWeaponConfig(weaponData.weaponId);
        const baseValue = (config?.baseDamage || 10) * 10;
        const levelValue = weaponData.level * 100;
        const enhanceValue = weaponData.enhanceLevel * 500;
        const rarityMultiplier = this.getRarityMultiplier(config?.rarity || 'common');

        return Math.floor((baseValue + levelValue + enhanceValue) * rarityMultiplier);
    }

    /**
     * 獲取稀有度乘數
     */
    private static getRarityMultiplier(rarity: string): number {
        switch (rarity) {
            case 'common': return 1;
            case 'uncommon': return 1.5;
            case 'rare': return 2;
            case 'epic': return 3;
            case 'legendary': return 5;
            default: return 1;
        }
    }

    /**
     * 檢查兩個武器數據是否在屬性計算上相等
     * 用於緩存優化
     */
    static areStatsEqual(data1: WeaponData, data2: WeaponData): boolean {
        return data1.weaponId === data2.weaponId &&
            data1.level === data2.level &&
            data1.enhanceLevel === data2.enhanceLevel &&
            Math.abs(data1.durability - data2.durability) < 10; // 耐久度差距小於10認為相等
    }

    /**
     * 生成屬性緩存鍵 - 確保每個武器都有唯一的實例
     */
    static generateStatsKey(weaponData: WeaponData): string {
        // 使用 uniqueId 確保每個武器都有獨立的實例，避免多武器時攻擊衝突
        return `${weaponData.uniqueId}_${weaponData.weaponId}_lv${weaponData.level}_enh${weaponData.enhanceLevel}`;
    }
}
