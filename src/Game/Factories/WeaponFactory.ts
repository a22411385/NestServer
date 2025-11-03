import { WeaponBasic } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { WeaponType } from "@/Types";
import { WeaponConfigDefinition } from "@/Types/Equipment/WeaponPropertyTypes";
import { WeaponConfigManager } from "./WeaponConfig";
import { MeleeWeapon, ProjectileWeapon } from "@/Colyseus/Schema/Weapon/Baisc";

/**
 * 武器工廠 - 負責創建各種武器實例
 * 🆕 完全基於配置驅動，武器類別無需構造函數參數
 */

export class WeaponFactory {
    // 🆕 動態武器類別映射，從配置中載入
    private static isInitialized = false;

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
            await WeaponConfigManager.initialize();
            console.log("🎮 武器配置系統已初始化");

            this.isInitialized = true;
            console.log('✅ 武器工廠初始化完成');

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

        const config = WeaponConfigManager.getConfig(weaponId);
        if (!config) {
            console.warn(`❌ 未找到武器配置: ${weaponId}`);
            return null;
        }
        try {
            // 🆕 創建武器實例（無參數構造函數）
            const weapon = config.classModule == WeaponType.MELEE_WEAPON ? new MeleeWeapon() : new ProjectileWeapon();

            // 🆕 從配置初始化武器
            weapon.initializeFromConfig(weaponId);

            console.log(`✅ 成功創建武器: ${config.name} (${weaponId})`);
            return weapon;

        } catch (error) {
            console.error(`❌ 創建武器時發生錯誤: ${weaponId}`, error);
            return null;
        }
    }

    /**
     * 🆕 根據類型獲取武器ID列表
     */
    public static getWeaponIdsByType(weaponType: string): string[] {
        const weaponConfigs = WeaponConfigManager.getAllConfigs();
        return Object.values(weaponConfigs)
            .filter(config => config.classModule === weaponType)
            .map(config => config.id);
    }

    /**
     * 🆕 獲取所有可用的武器ID
     */
    public static getAvailableWeaponIds(): string[] {
        const weaponConfigs = WeaponConfigManager.getAllConfigs();
        return Object.values(weaponConfigs)
            .filter(config => config.enabled !== false)
            .map(config => config.id);
    }

    /**
     * 獲取所有可用武器的資訊
     */
    public static getAllWeapons(): WeaponConfigDefinition[] {
        const weaponConfigs = WeaponConfigManager.getAllConfigs();
        return Object.values(weaponConfigs).filter(config => config.enabled !== false);
    }

    /**
     * 檢查武器是否存在
     */
    public static weaponExists(weaponId: string): boolean {
        return WeaponConfigManager.getConfig(weaponId) !== null;
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
     * 🆕 驗證配置完整性
     */
    public static validateConfiguration(): { valid: boolean; issues: string[] } {
        const issues: string[] = [];
        const allConfigs = WeaponConfigManager.getAllConfigs();

        for (const config of Object.values(allConfigs)) {
            // 檢查必要欄位
            if (!config.id) issues.push(`武器缺少 ID: ${JSON.stringify(config)}`);
            if (!config.name) issues.push(`武器 ${config.id} 缺少名稱`);
            if (!config.classModule) issues.push(`武器 ${config.id} 缺少 classModule`);

            // 檢查數值欄位
            if (typeof config.baseDamage !== 'number') issues.push(`武器 ${config.id} 的 baseDamage 無效`);
            if (typeof config.attackSpeed !== 'number') issues.push(`武器 ${config.id} 的 attackSpeed 無效`);
            if (typeof config.attackRange !== 'number') issues.push(`武器 ${config.id} 的 attackRange 無效`);
        }

        return {
            valid: issues.length === 0,
            issues
        };
    }
}
