import { WeaponData } from "../../Colyseus/Schema/Weapon/WeaponData";
import { WeaponBasic } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { getWeaponConfig } from "../Factories/WeaponConfig";

/**
 * 最終武器屬性接口
 */
export interface FinalWeaponStats {
    finalDamage: number;
    finalRange: number;
    finalSpeed: number;
    finalCritRate?: number;
    finalCritDamage?: number;
    finalLifeSteal?: number;
    displayName: string;
    rarity?: string;
}

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
            console.warn(`⚠️ 找不到武器配置: ${weaponData.weaponId}`);
            return {
                finalDamage: 10,
                finalRange: 100,
                finalSpeed: 1000,
                displayName: weaponData.weaponId,
                rarity: 'common'
            };
        }

        // 計算各種加成乘數
        const multipliers = this.calculateMultipliers(weaponData);

        // 計算最終屬性
        const finalDamage = Math.floor(config.baseDamage * multipliers.damage);
        const finalRange = Math.floor(config.attackRange * multipliers.range);
        const finalSpeed = Math.max(100, Math.floor(config.attackSpeed * multipliers.speed));

        // 計算戰鬥特效屬性
        const finalCritRate = this.calculateBaseCritRate(weaponData) * multipliers.stats;
        const finalCritDamage = this.calculateBaseCritDamage(weaponData) * multipliers.stats;
        const finalLifeSteal = this.calculateBaseLifeSteal(weaponData) * multipliers.stats;

        // 生成顯示名稱
        const displayName = this.generateDisplayName(weaponData, config);

        return {
            finalDamage,
            finalRange,
            finalSpeed,
            finalCritRate,
            finalCritDamage,
            finalLifeSteal,
            displayName,
            rarity: this.determineWeaponRarity(config)
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
        let baseName = weaponConfig?.name || weaponData.weaponId
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
     * 增加經驗值
     */
    static addExp(weaponData: WeaponData, amount: number): boolean {
        weaponData.exp += amount;
        const requiredExp = this.getRequiredExp(weaponData.level);

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

        const requiredExp = this.getRequiredExp(weaponData.level);
        return weaponData.exp >= requiredExp;
    }

    /**
     * 計算基礎暴擊率
     */
    private static calculateBaseCritRate(weaponData: WeaponData): number {
        return weaponData.level * 0.5; // 每級增加0.5%暴擊率
    }

    /**
     * 計算基礎暴擊傷害
     */
    private static calculateBaseCritDamage(weaponData: WeaponData): number {
        return 150 + weaponData.enhanceLevel * 10; // 基礎150%，強化每級+10%
    }

    /**
     * 計算基礎生命偷取
     */
    private static calculateBaseLifeSteal(weaponData: WeaponData): number {
        return weaponData.enhanceLevel * 0.2; // 強化每級增加0.2%生命偷取
    }

    /**
     * 根據配置確定武器稀有度
     */
    private static determineWeaponRarity(config: any): string {
        const fixedCount = config.fixedProperties ? config.fixedProperties.split(',').length : 0;
        const randomCount = config.randomProperties ? config.randomProperties.split(',').length : 0;
        const totalComplexity = fixedCount + randomCount;

        if (totalComplexity >= 8) return 'legendary';
        if (totalComplexity >= 6) return 'epic';
        if (totalComplexity >= 4) return 'rare';
        if (totalComplexity >= 2) return 'uncommon';
        return 'common';
    }

    /**
     * 獲取升級所需經驗值
     */
    private static getRequiredExp(level: number): number {
        return Math.floor(level * level * 1.5 + level * 10);
    }

    /**
     * 生成武器的唯一緩存鍵
     * 用於實例管理器的緩存系統
     */
    static generateStatsKey(weaponData: WeaponData): string {
        return `${weaponData.weaponId}_${weaponData.level}_${weaponData.enhanceLevel}_${weaponData.durability}`;
    }

    /**
     * 檢查兩個武器數據是否在屬性計算上相等
     * 用於緩存優化
     */
    static areStatsEqual(weapon1: WeaponData, weapon2: WeaponData): boolean {
        return weapon1.weaponId === weapon2.weaponId &&
            weapon1.level === weapon2.level &&
            weapon1.enhanceLevel === weapon2.enhanceLevel &&
            weapon1.durability === weapon2.durability;
    }
}
