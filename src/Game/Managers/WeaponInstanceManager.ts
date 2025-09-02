import { WeaponBasic } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { WeaponData } from "../../Colyseus/Schema/Weapon/WeaponData";
import { WeaponFactory } from "../Factories/WeaponFactory";
import { WeaponDataService } from "../Services/WeaponDataService";

/**
 * 武器實例管理器 - 專注於實例的創建、緩存和生命周期管理
 * 不負責業務邏輯計算，將計算委託給 WeaponDataService
 */
export class WeaponInstanceManager {
    private static instances: Map<string, WeaponBasic> = new Map();
    private static lastUsed: Map<string, number> = new Map();
    private static cleanupInterval: NodeJS.Timeout | null = null;

    /**
     * 初始化管理器
     */
    public static initialize(): void {
        if (!this.cleanupInterval) {
            // 每5分鐘清理一次未使用的實例
            this.cleanupInterval = setInterval(() => {
                this.cleanupUnusedInstances();
            }, 5 * 60 * 1000);
        }
    }

    /**
     * 獲取或創建武器實例 - 重構為純管理邏輯
     */
    public static getOrCreateInstance(weaponData: WeaponData): WeaponBasic | null {
        const cacheKey = WeaponDataService.generateStatsKey(weaponData);

        // 更新使用時間
        this.lastUsed.set(cacheKey, Date.now());

        // 檢查緩存
        if (this.instances.has(cacheKey)) {
            return this.instances.get(cacheKey)!;
        }

        // 創建新實例 - 委託給其他組件
        const instance = this.createNewInstance(weaponData);
        if (instance) {
            this.instances.set(cacheKey, instance);
            console.log(`🔧 創建武器實例: ${weaponData.weaponId} (緩存鍵: ${cacheKey})`);
        }

        return instance;
    }

    /**
     * 創建新武器實例 - 協調 Factory 和 Service
     */
    private static createNewInstance(weaponData: WeaponData): WeaponBasic | null {
        // 1. 使用 WeaponFactory 創建基礎實例
        const instance = WeaponFactory.createWeapon(weaponData.weaponId);
        if (!instance) {
            console.warn(`無法創建武器實例: ${weaponData.weaponId}`);
            return null;
        }

        // 2. 使用 WeaponDataService 計算最終屬性
        const finalStats = WeaponDataService.calculateFinalStats(weaponData);

        // 3. 使用 WeaponDataService 應用屬性到實例
        WeaponDataService.applyStatsToInstance(instance, finalStats);

        return instance;
    }

    /**
     * 移除特定武器的緩存 - 使用 Service 的緩存鍵生成
     */
    public static invalidateCache(weaponData: WeaponData): void {
        const exactKey = WeaponDataService.generateStatsKey(weaponData);
        const pattern = `${weaponData.weaponId}_lv${weaponData.level}_enh${weaponData.enhanceLevel}`;

        const keysToDelete: string[] = [];

        // 精確匹配
        if (this.instances.has(exactKey)) {
            keysToDelete.push(exactKey);
        }

        // 模糊匹配（用於清理相關實例）
        for (const key of this.instances.keys()) {
            if (key !== exactKey && key.startsWith(pattern)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => {
            this.instances.delete(key);
            this.lastUsed.delete(key);
        });

        if (keysToDelete.length > 0) {
            console.log(`🧹 清除武器緩存: ${pattern} (${keysToDelete.length} 個實例)`);
        }
    }

    /**
     * 清理未使用的實例
     */
    private static cleanupUnusedInstances(): void {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5分鐘
        const keysToDelete: string[] = [];

        for (const [key, lastUsedTime] of this.lastUsed) {
            if (now - lastUsedTime > maxAge) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => {
            this.instances.delete(key);
            this.lastUsed.delete(key);
        });

        if (keysToDelete.length > 0) {
            console.log(`🧹 自動清理未使用的武器實例: ${keysToDelete.length} 個`);
        }
    }

    /**
     * 獲取緩存統計
     */
    public static getCacheStats(): { totalInstances: number; totalMemory: string } {
        const totalInstances = this.instances.size;
        const avgInstanceSize = 1024; // 假設每個實例約1KB
        const totalMemory = `${(totalInstances * avgInstanceSize / 1024).toFixed(2)} KB`;

        return { totalInstances, totalMemory };
    }

    /**
     * 清空所有緩存
     */
    public static clearAll(): void {
        this.instances.clear();
        this.lastUsed.clear();
        console.log("🧹 清空所有武器實例緩存");
    }

    /**
     * 銷毀管理器
     */
    public static destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.clearAll();
    }
}
