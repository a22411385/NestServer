import { WeaponBasic } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { BaseballBat } from "../../Colyseus/Schema/Weapon/MeleeWeapon/BaseballBat";
import { Fireball } from "../../Colyseus/Schema/Weapon/ProjectileWeapon/Fireball";
import { HealingPotion } from "../../Colyseus/Schema/Weapon/SupportWeapon/HealingPotion";

/**
 * 武器類別註冊器 - 管理所有可用的武器類別
 */
export class WeaponClassRegistry {

    // 動態註冊的類別映射
    private static dynamicClasses = new Map<string, any>();

    // 模組路徑映射，用於動態導入
    private static readonly MODULE_PATH_MAP = new Map<string, string>([
        ['MeleeWeapon', '../../Colyseus/Schema/Weapon/MeleeWeapon'],
        ['ProjectileWeapon', '../../Colyseus/Schema/Weapon/ProjectileWeapon'],
        ['SupportWeapon', '../../Colyseus/Schema/Weapon/SupportWeapon'],
        ['BasicWeapon', '../../Colyseus/Schema/Weapon/Baisc']
    ]);

    /**
     * 獲取武器類別
     */
    public static getWeaponClass(className: string): any | null {

        // 再檢查動態註冊的類別
        if (this.dynamicClasses.has(className)) {
            return this.dynamicClasses.get(className);
        }

        return null;
    }

    /**
     * 手動註冊武器類別
     */
    public static registerWeaponClass(className: string, weaponClass: any): void {
        this.dynamicClasses.set(className, weaponClass);
        console.log(`🔧 註冊武器類別: ${className}`);
    }

    /**
     * 🆕 根據模組和類別名稱動態導入武器類別
     */
    public static async loadWeaponClass(className: string, moduleName?: string): Promise<any | null> {
        try {
            // 如果已經有類別，直接返回
            const existingClass = this.getWeaponClass(className);
            if (existingClass) {
                return existingClass;
            }

            // 如果沒有提供模組名稱，使用預設邏輯
            if (!moduleName) {
                console.warn(`⚠️ 缺少模組信息，無法動態載入: ${className}`);
                return null;
            }

            // 獲取模組路徑
            const modulePath = this.MODULE_PATH_MAP.get(moduleName);
            if (!modulePath) {
                console.warn(`⚠️ 未知的武器模組: ${moduleName}`);
                return null;
            }

            // 構建完整的導入路徑
            const fullPath = `${modulePath}/${className}`;
            console.log(`📦 動態載入武器類別: ${fullPath}`);

            // 動態導入模組
            const module = await import(fullPath);

            // 尋找導出的類別
            const weaponClass = module[className] || module.default;

            if (!weaponClass) {
                console.error(`❌ 在模組 ${fullPath} 中找不到類別 ${className}`);
                return null;
            }

            // 註冊到動態類別映射中
            this.registerWeaponClass(className, weaponClass);

            return weaponClass;

        } catch (error) {
            console.error(`❌ 動態載入武器類別失敗: ${className} (${moduleName})`, error);
            return null;
        }
    }

    /**
     * 🆕 批量載入武器類別
     */
    public static async loadWeaponClasses(weaponConfigs: Record<string, any>): Promise<Map<string, any>> {
        const loadedClasses = new Map<string, any>();
        const loadPromises: Promise<void>[] = [];

        for (const [weaponId, config] of Object.entries(weaponConfigs)) {
            if (!config.weaponClass) {
                console.warn(`⚠️ 武器 ${weaponId} 沒有指定 weaponClass`);
                continue;
            }

            const loadPromise = this.loadWeaponClass(config.weaponClass, config.classModule)
                .then(weaponClass => {
                    if (weaponClass) {
                        loadedClasses.set(weaponId, weaponClass);
                        console.log(`✅ 武器 ${weaponId} -> 類別 ${config.weaponClass}`);
                    } else {
                        console.warn(`⚠️ 無法載入武器類別: ${weaponId} -> ${config.weaponClass}`);
                    }
                })
                .catch(error => {
                    console.error(`❌ 載入武器類別時發生錯誤: ${weaponId}`, error);
                });

            loadPromises.push(loadPromise);
        }

        // 等待所有載入完成
        await Promise.all(loadPromises);

        console.log(`🎯 成功載入 ${loadedClasses.size} 個武器類別`);
        return loadedClasses;
    }

    /**
     * 獲取所有已註冊的類別名稱
     */
    public static getAllClassNames(): string[] {
        return [
            ...this.dynamicClasses.keys()
        ];
    }

    /**
     * 檢查類別是否已註冊
     */
    public static isClassRegistered(className: string): boolean {
        return this.dynamicClasses.has(className);
    }

    /**
     * 清除動態註冊的類別（用於測試或重新載入）
     */
    public static clearDynamicClasses(): void {
        this.dynamicClasses.clear();
        console.log('🧹 清除了所有動態註冊的武器類別');
    }

}
