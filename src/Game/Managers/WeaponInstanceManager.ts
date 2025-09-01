import { WeaponBasic } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { WeaponData } from "../../Colyseus/Schema/Weapon/WeaponData";
import { WeaponFactory } from "../Factories/WeaponFactory";

/**
 * 武器實例管理器 - 負責武器實例的創建、緩存和清理
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
     * 獲取或創建武器實例
     */
    public static getOrCreateInstance(weaponData: WeaponData): WeaponBasic | null {
        const cacheKey = this.generateCacheKey(weaponData);

        // 更新使用時間
        this.lastUsed.set(cacheKey, Date.now());

        // 檢查緩存
        if (this.instances.has(cacheKey)) {
            const instance = this.instances.get(cacheKey)!;
            this.updateInstanceFromData(instance, weaponData);
            return instance;
        }

        // 創建新實例
        const instance = WeaponFactory.createWeapon(weaponData.weaponId);
        if (!instance) {
            console.warn(`無法創建武器實例: ${weaponData.weaponId}`);
            return null;
        }

        // 應用武器數據
        this.applyWeaponData(instance, weaponData);

        // 緩存實例
        this.instances.set(cacheKey, instance);

        console.log(`🔧 創建武器實例: ${weaponData.weaponId} (緩存鍵: ${cacheKey})`);
        return instance;
    }

    /**
     * 生成緩存鍵
     */
    private static generateCacheKey(weaponData: WeaponData): string {
        return `${weaponData.weaponId}_lv${weaponData.level}_enh${weaponData.enhanceLevel}_dur${Math.floor(weaponData.durability / 10)}`;
    }

    /**
     * 應用武器數據到實例
     */
    private static applyWeaponData(instance: WeaponBasic, data: WeaponData): void {
        // 基礎屬性加成（根據等級）
        const levelMultiplier = 1 + (data.level - 1) * 0.1; // 每級+10%
        instance.baseDamage = Math.floor(instance.baseDamage * levelMultiplier);
        instance.attackRange = Math.floor(instance.attackRange * levelMultiplier);

        // 強化加成
        instance.baseDamage += data.enhanceLevel * 5; // 每強化級別+5攻擊力
        instance.attackRange += Math.floor(data.enhanceLevel / 3); // 每3強化級別+1射程

        // 耐久度影響（耐久度低於50%時攻擊力下降）
        if (data.durability < 50) {
            const durabilityPenalty = (50 - data.durability) / 50; // 0-1
            instance.baseDamage = Math.floor(instance.baseDamage * (1 - durabilityPenalty * 0.3)); // 最多-30%攻擊力
        }

        // 設置武器的數據引用（如果需要的話）
        (instance as any).weaponData = data;
    }

    /**
     * 更新現有實例的屬性
     */
    private static updateInstanceFromData(instance: WeaponBasic, data: WeaponData): void {
        // 檢查是否需要重新應用數據（比如強化等級變了）
        const currentData = (instance as any).weaponData as WeaponData;

        if (!currentData ||
            currentData.level !== data.level ||
            currentData.enhanceLevel !== data.enhanceLevel ||
            Math.abs(currentData.durability - data.durability) > 10) {

            // 重新計算屬性
            const baseInstance = WeaponFactory.createWeapon(data.weaponId);
            if (baseInstance) {
                // 復制基礎屬性
                instance.baseDamage = baseInstance.baseDamage;
                instance.attackRange = baseInstance.attackRange;
                instance.attackSpeed = baseInstance.attackSpeed;

                // 重新應用數據
                this.applyWeaponData(instance, data);
            }
        }
    }

    /**
     * 移除特定武器的緩存
     */
    public static invalidateCache(weaponData: WeaponData): void {
        const pattern = `${weaponData.weaponId}_lv${weaponData.level}_enh${weaponData.enhanceLevel}`;

        const keysToDelete: string[] = [];
        for (const key of this.instances.keys()) {
            if (key.startsWith(pattern)) {
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
