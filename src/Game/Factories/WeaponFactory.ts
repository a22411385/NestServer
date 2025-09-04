import { WeaponBasic } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { BaseballBat } from "../../Colyseus/Schema/Weapon/MeleeWeapon/BaseballBat";
import { Fireball } from "../../Colyseus/Schema/Weapon/ProjectileWeapon/Fireball";
import { HealingPotion } from "../../Colyseus/Schema/Weapon/SupportWeapon/HealingPotion";
import { getWeaponConfig, getAllWeaponConfigs } from "./WeaponConfig";
import { WeaponClassRegistry } from "./WeaponClassRegistry";
import { WeaponConfigDefinition, WeaponType } from "@/Types";

/**
 * 武器工廠 - 負責創建各種武器實例
 */
export class WeaponFactory {
    // 🆕 動態武器類別映射，從配置中載入
    private static dynamicWeaponClassMap = new Map<string, any>();

    // 保留向下兼容的靜態映射（作為備用）
    private static weaponClassMap = new Map<string, any>([
        ['baseball_bat', BaseballBat],
        ['fireball', Fireball],
        ['healing_potion', HealingPotion]
        // 新武器類需要在這裡註冊
    ]);

    /**
     * 🆕 初始化武器工廠 - 從配置載入動態類別映射
     */
    public static async initialize(): Promise<void> {
        try {
            console.log('🏭 初始化武器工廠...');

            // 獲取所有武器配置
            const allConfigs = getAllWeaponConfigs();
            const weaponConfigs = allConfigs.reduce((map, config) => {
                map[config.id] = config;
                return map;
            }, {} as Record<string, WeaponConfigDefinition>);

            // 載入所有武器類別
            this.dynamicWeaponClassMap = await WeaponClassRegistry.loadWeaponClasses(weaponConfigs);

            console.log('✅ 武器工廠初始化完成');

        } catch (error) {
            console.error('❌ 武器工廠初始化失敗:', error);
            console.log('🔄 將使用靜態類別映射作為備用');
        }
    }

    /**
     * 根據武器ID創建武器實例
     */
    public static createWeapon(weaponId: string): WeaponBasic | null {
        const config = getWeaponConfig(weaponId);

        if (!config) {
            console.warn(`Unknown weapon config for ID: ${weaponId}`);
            return null;
        }

        // 🆕 優先使用動態類別映射
        let weaponClass = this.dynamicWeaponClassMap.get(weaponId);

        // 備用方案：使用靜態映射
        if (!weaponClass) {
            weaponClass = this.weaponClassMap.get(weaponId);
        }

        // 🆕 第三備用方案：通過配置中的 weaponClass 查找
        if (!weaponClass && config.weaponClass) {
            weaponClass = WeaponClassRegistry.getWeaponClass(config.weaponClass);
        }

        if (!weaponClass) {
            console.warn(`No weapon class found for ID: ${weaponId} (weaponClass: ${config.weaponClass || 'not specified'})`);
            return null;
        }

        try {
            const weapon = new weaponClass();
            // 應用配置數據到武器實例
            weapon.name = config.name;
            //weapon.rarity = config.rarity;
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
    public static getAllWeapons(): WeaponConfigDefinition[] {
        return Object.values(getWeaponConfig);
    }

    /**
     * 檢查武器是否存在
     */
    public static weaponExists(weaponId: string): boolean {
        return weaponId in getWeaponConfig;
    }

    /**
     * 根據類型獲取武器
     */
    public static getWeaponsByType(type: WeaponType): WeaponConfigDefinition[] {
        return Object.values(getWeaponConfig).filter(config => config.type === type);
    }

    /**
     * 註冊新武器類別（用於動態添加武器）
     */
    public static registerWeaponClass(weaponId: string, weaponClass: any): void {
        // 🆕 更新動態映射
        this.dynamicWeaponClassMap.set(weaponId, weaponClass);
        // 保持向下兼容
        this.weaponClassMap.set(weaponId, weaponClass);
        console.log(`🔧 註冊武器類別: ${weaponId} -> ${weaponClass.name}`);
    }

    /**
     * 🆕 重新載入武器類別映射
     */
    public static async reloadWeaponClasses(): Promise<void> {
        console.log('🔄 重新載入武器類別...');
        await this.initialize();
    }

    /**
     * 🆕 獲取武器類別映射統計
     */
    public static getClassMappingStats(): { dynamic: number, static: number, total: number } {
        return {
            dynamic: this.dynamicWeaponClassMap.size,
            static: this.weaponClassMap.size,
            total: new Set([...this.dynamicWeaponClassMap.keys(), ...this.weaponClassMap.keys()]).size
        };
    }

    /**
     * 🆕 檢查武器類別是否可用
     */
    public static isWeaponClassAvailable(weaponId: string): boolean {
        const config = getWeaponConfig(weaponId);
        if (!config) return false;

        // 檢查動態映射
        if (this.dynamicWeaponClassMap.has(weaponId)) return true;

        // 檢查靜態映射
        if (this.weaponClassMap.has(weaponId)) return true;

        // 檢查類別註冊器
        if (config.weaponClass && WeaponClassRegistry.isClassRegistered(config.weaponClass)) return true;

        return false;
    }
}
