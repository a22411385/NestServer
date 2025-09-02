import { WeaponBasic } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { BaseballBat } from "../../Colyseus/Schema/Weapon/MeleeWeapon/BaseballBat";
import { Fireball } from "../../Colyseus/Schema/Weapon/ProjectileWeapon/Fireball";
import { HealingPotion } from "../../Colyseus/Schema/Weapon/SupportWeapon/HealingPotion";
import { WEAPON_CONFIGS, WeaponConfig, getWeaponConfig } from "./WeaponConfig";
import { WeaponType } from "@/Types";

/**
 * 武器工廠 - 負責創建各種武器實例
 */
export class WeaponFactory {
    private static weaponClassMap = new Map<string, any>([
        ['baseball_bat', BaseballBat],
        ['fireball', Fireball],
        ['healing_potion', HealingPotion]
        // 新武器類需要在這裡註冊
    ]);

    /**
     * 根據武器ID創建武器實例
     */
    public static createWeapon(weaponId: string): WeaponBasic | null {
        const config = getWeaponConfig(weaponId);
        const weaponClass = this.weaponClassMap.get(weaponId);

        if (!config) {
            console.warn(`Unknown weapon config for ID: ${weaponId}`);
            return null;
        }

        if (!weaponClass) {
            console.warn(`No weapon class registered for ID: ${weaponId}`);
            return null;
        }

        try {
            const weapon = new weaponClass();
            // 應用配置數據到武器實例
            weapon.name = config.name;
            weapon.rarity = config.rarity;
            weapon.baseDamage = config.baseDamage;
            weapon.attackSpeed = config.attackSpeed;
            weapon.attackRange = config.attackRange;

            return weapon;
        } catch (error) {
            console.error(`Failed to create weapon ${weaponId}:`, error);
            return null;
        }
    }

    /**
     * 獲取所有可用武器的資訊
     */
    public static getAllWeapons(): WeaponConfig[] {
        return Object.values(WEAPON_CONFIGS);
    }

    /**
     * 檢查武器是否存在
     */
    public static weaponExists(weaponId: string): boolean {
        return weaponId in WEAPON_CONFIGS;
    }

    /**
     * 根據類型獲取武器
     */
    public static getWeaponsByType(type: WeaponType): WeaponConfig[] {
        return Object.values(WEAPON_CONFIGS).filter(config => config.type === type);
    }

    /**
     * 註冊新武器類別（用於動態添加武器）
     */
    public static registerWeaponClass(weaponId: string, weaponClass: any): void {
        this.weaponClassMap.set(weaponId, weaponClass);
    }
}
