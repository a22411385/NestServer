import { WeaponBasic } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { BaseballBat } from "../../Colyseus/Schema/Weapon/MeleeWeapon/BaseballBat";
import { Fireball } from "../../Colyseus/Schema/Weapon/ProjectileWeapon/Fireball";
import { HealingPotion } from "../../Colyseus/Schema/Weapon/SupportWeapon/HealingPotion";
import { getWeaponConfig, getAllWeaponConfigs, initializeWeaponConfigs } from "./WeaponConfig";
import { WeaponClassRegistry } from "./WeaponClassRegistry";
import { WeaponType } from "@/Types";
import { WeaponConfigDefinition } from "@/Types/Equipment/WeaponPropertyTypes";

/**
 * 武器工廠 - 負責創建各種武器實例
 * 🆕 完全基於配置驅動，武器類別無需構造函數參數
 */
export class WeaponFactory {
    // 🆕 動態武器類別映射，從配置中載入
    private static dynamicWeaponClassMap = new Map<string, any>();
    private static isInitialized = false;

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
        if (this.isInitialized) {
            console.log('✅ 武器工廠已經初始化');
            return;
        }

        try {
            console.log('🏭 初始化武器工廠...');

            // 首先初始化武器配置系統
            await initializeWeaponConfigs();

            // 獲取所有武器配置
            const allConfigs = getAllWeaponConfigs();
            const weaponConfigs = allConfigs.reduce((map, config) => {
                map[config.id] = config;
                return map;
            }, {} as Record<string, WeaponConfigDefinition>);

            // 載入所有武器類別
            this.dynamicWeaponClassMap = await WeaponClassRegistry.loadWeaponClasses(weaponConfigs);

            this.isInitialized = true;
            console.log('✅ 武器工廠初始化完成');
            console.log(`📊 載入統計: 動態類別 ${this.dynamicWeaponClassMap.size} 個, 靜態類別 ${this.weaponClassMap.size} 個`);

        } catch (error) {
            console.error('❌ 武器工廠初始化失敗:', error);
            console.log('🔄 將使用靜態類別映射作為備用');
            this.isInitialized = true; // 即使失敗也標記為已初始化，避免無限重試
        }
    }

    /**
     * 🆕 根據武器ID創建武器實例 - 完全基於配置驅動
     */
    public static createWeapon(weaponId: string): WeaponBasic | null {
        // 確保工廠已初始化
        if (!this.isInitialized) {
            console.warn(`⚠️ 武器工廠未初始化，嘗試立即初始化...`);
            // 同步初始化（如果可能的話）
            this.initialize().catch(error => {
                console.error('❌ 同步初始化失敗:', error);
            });
        }

        const config = getWeaponConfig(weaponId);
        if (!config) {
            console.warn(`❌ 未找到武器配置: ${weaponId}`);
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
            console.warn(`❌ 未找到武器類別: ${weaponId} (weaponClass: ${config.weaponClass || 'not specified'})`);
            return null;
        }

        try {
            // 🆕 創建武器實例（無參數構造函數）
            const weapon = new weaponClass();

            // 🆕 從配置初始化武器
            const success = weapon.initializeFromConfig(weaponId);
            if (!success) {
                console.error(`❌ 武器初始化失敗: ${weaponId}`);
                return null;
            }

            console.log(`✅ 成功創建武器: ${config.name} (${weaponId})`);
            return weapon;

        } catch (error) {
            console.error(`❌ 創建武器時發生錯誤: ${weaponId}`, error);
            return null;
        }
    }

    /**
     * 🆕 批量創建武器
     */
    public static createMultipleWeapons(weaponIds: string[]): WeaponBasic[] {
        const weapons: WeaponBasic[] = [];

        for (const weaponId of weaponIds) {
            const weapon = this.createWeapon(weaponId);
            if (weapon) {
                weapons.push(weapon);
            }
        }

        console.log(`🔧 批量創建武器: ${weapons.length}/${weaponIds.length} 成功`);
        return weapons;
    }

    /**
     * 🆕 根據類型獲取武器ID列表
     */
    public static getWeaponIdsByType(weaponType: string): string[] {
        const allConfigs = getAllWeaponConfigs();
        return allConfigs
            .filter(config => config.classModule === weaponType)
            .map(config => config.id);
    }

    /**
     * 🆕 獲取所有可用的武器ID
     */
    public static getAvailableWeaponIds(): string[] {
        const allConfigs = getAllWeaponConfigs();
        return allConfigs
            .filter(config => config.enabled !== false)
            .map(config => config.id);
    }

    /**
     * 獲取所有可用武器的資訊
     */
    public static getAllWeapons(): WeaponConfigDefinition[] {
        return getAllWeaponConfigs();
    }

    /**
     * 檢查武器是否存在
     */
    public static weaponExists(weaponId: string): boolean {
        return getWeaponConfig(weaponId) !== null;
    }

    /**
     * 根據類型獲取武器
     */
    public static getWeaponsByType(type: WeaponType): WeaponConfigDefinition[] {
        const allConfigs = getAllWeaponConfigs();
        return allConfigs.filter(config => {
            // 根據 classModule 判斷武器類型
            switch (type) {
                case WeaponType.MELEE_WEAPON:
                    return config.classModule === 'MeleeWeapon';
                case WeaponType.PROJECTILE_WEAPON:
                    return config.classModule === 'ProjectileWeapon';
                case WeaponType.SUPPORT_WEAPON:
                    return config.classModule === 'SupportWeapon';
                default:
                    return false;
            }
        });
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
        this.isInitialized = false;
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

    /**
     * 🆕 驗證配置完整性
     */
    public static validateConfiguration(): { valid: boolean; issues: string[] } {
        const issues: string[] = [];
        const allConfigs = getAllWeaponConfigs();

        for (const config of allConfigs) {
            // 檢查必要欄位
            if (!config.id) issues.push(`武器缺少 ID: ${JSON.stringify(config)}`);
            if (!config.name) issues.push(`武器 ${config.id} 缺少名稱`);
            if (!config.weaponClass) issues.push(`武器 ${config.id} 缺少 weaponClass`);
            if (!config.classModule) issues.push(`武器 ${config.id} 缺少 classModule`);

            // 檢查數值欄位
            if (typeof config.baseDamage !== 'number') issues.push(`武器 ${config.id} 的 baseDamage 無效`);
            if (typeof config.attackSpeed !== 'number') issues.push(`武器 ${config.id} 的 attackSpeed 無效`);
            if (typeof config.attackRange !== 'number') issues.push(`武器 ${config.id} 的 attackRange 無效`);

            // 檢查類別可用性
            if (!this.isWeaponClassAvailable(config.id)) {
                issues.push(`武器 ${config.id} 的類別 ${config.weaponClass} 不可用`);
            }
        }

        return {
            valid: issues.length === 0,
            issues
        };
    }
}
