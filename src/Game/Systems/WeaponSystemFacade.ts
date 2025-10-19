import { WeaponBasic } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { WeaponData, WeaponSchema } from "../../Colyseus/Schema/Weapon/WeaponData";
import { WeaponDataService, FinalWeaponStats } from "../Services/WeaponDataService";
import { WeaponInstanceManager } from "../Managers/WeaponInstanceManager";

/**
 * 武器系統門面 - 提供統一的武器操作接口
 * 
 * 這個類不替代三層架構，而是提供便利的統一訪問點
 * 內部仍然委託給專門的服務類，保持職責分離
 */
export class WeaponSystemFacade {

    /**
     * 🎯 便利方法：獲取完整的武器實例（含計算屬性）
     */
    public static getCompleteWeaponInstance(weaponData: WeaponData): {
        instance: WeaponBasic | null;
        stats: FinalWeaponStats;
    } {
        // 委託給各自的專門服務
        const instance = WeaponInstanceManager.getOrCreateInstance(weaponData);
        const stats = WeaponDataService.calculateFinalStats(weaponData);

        return { instance, stats };
    }

    /**
     * 🎯 便利方法：創建並立即獲取武器
     */
    public static createAndGetWeapon(weaponId: string): {
        data: WeaponSchema;
        instance: WeaponBasic | null;
        stats: FinalWeaponStats;
    } {
        // 1. 創建數據
        const data = new WeaponSchema(weaponId);

        // 2. 獲取實例（委託給管理器）
        const instance = WeaponInstanceManager.getOrCreateInstance(data);

        // 3. 計算屬性（委託給服務）
        const stats = WeaponDataService.calculateFinalStats(data);

        return { data, instance, stats };
    }

    /**
     * 🎯 便利方法：武器升級（組合多個服務的操作）
     */
    public static upgradeWeapon(weaponData: WeaponData, expAmount: number): boolean {
        // 1. 業務邏輯處理（委託給服務）
        const success = WeaponDataService.addExp(weaponData, expAmount);

        if (success) {
            // 2. 清除實例緩存以應用新屬性（委託給管理器）
            WeaponInstanceManager.invalidateCache(weaponData);
        }

        return success;
    }

    /**
     * 🔧 系統管理：初始化所有子系統
     */
    public static initialize(): void {
        WeaponInstanceManager.initialize();
        // 其他初始化...
    }

    /**
     * 🎯 便利方法：獲取武器顯示名稱
     */
    public static getWeaponDisplayName(weaponData: WeaponData): string {
        return WeaponDataService.generateDisplayName(weaponData);
    }

    /**
     * 🎯 便利方法：檢查武器是否可升級
     */
    public static canUpgradeWeapon(weaponData: WeaponData): boolean {
        // 委託給業務邏輯服務
        return WeaponDataService.canLevelUp(weaponData);
    }


    /**
     * 🔧 系統管理：清理所有子系統
     */
    public static cleanup(): void {
        WeaponInstanceManager.destroy();
        // 其他清理...
    }
}
