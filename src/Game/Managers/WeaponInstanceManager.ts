import { WeaponBasic } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { WeaponData } from "../../Colyseus/Schema/Weapon/WeaponData";
import { WeaponFactory } from "../Factories/WeaponFactory";
import { WeaponDataService } from "../Services/WeaponDataService";
import { WeaponPropertyService } from "../Services/WeaponPropertyService";
import { WeaponQuality } from "../../Types/Equipment/WeaponPropertyTypes";

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
    public static async initialize(): Promise<void> {
        if (!this.cleanupInterval) {
            // 初始化屬性系統
            try {
                await WeaponPropertyService.getInstance().initialize();
                console.log('✅ WeaponPropertyService 初始化完成');
            } catch (error) {
                console.warn('⚠️ WeaponPropertyService 初始化失敗，將使用舊系統:', error);
            }

            // 每5分鐘清理一次未使用的實例
            this.cleanupInterval = setInterval(() => {
                this.cleanupUnusedInstances();
            }, 5 * 60 * 1000);

            console.log('✅ 武器實例管理器初始化完成');
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
     * 創建新武器實例 - 協調 Factory 和新屬性系統
     */
    private static createNewInstance(weaponData: WeaponData): WeaponBasic | null {
        // 1. 使用 WeaponFactory 創建基礎實例
        const instance = WeaponFactory.createWeapon(weaponData.weaponId);
        if (!instance) {
            console.warn(`無法創建武器實例: ${weaponData.weaponId}`);
            return null;
        }

        // 2. 確定武器品質（從 weaponData 或根據等級計算）
        const quality = this.determineWeaponQuality(weaponData);

        // 3. 使用新屬性系統生成屬性
        const propertyService = WeaponPropertyService.getInstance();

        try {
            const properties = propertyService.generateWeaponProperties(
                weaponData.weaponId,
                quality,
                this.generateSeed(weaponData) // 使用穩定的種子確保屬性一致性
            );

            // 4. 應用屬性到實例
            if (properties.length > 0) {
                instance.applyProperties(properties);
            }
        } catch (error) {
            console.warn(`⚠️ 應用屬性失敗 ${weaponData.weaponId}:`, error);
            // 繼續使用舊系統作為後備
        }
        return instance;
    }

    /**
     * 根據武器數據確定品質等級
     */
    private static determineWeaponQuality(weaponData: WeaponData): WeaponQuality {
        // 使用穩定種子確保相同武器總是生成相同品質
        const seed = this.generateSeed(weaponData);
        const seededRandom = this.createSeededRandom(seed);

        // 基礎品質機率：[54,30,10,5,1] 對應 [普通,魔法,稀有,史詩,傳奇]
        let baseProbability = seededRandom() * 100;

        // 強化等級影響品質機率（每級+2%機率提升品質）
        const enhanceBonus = weaponData.enhanceLevel * 2;
        const levelBonus = Math.max(0, weaponData.level - 1) * 1; // 等級影響較小

        // 調整機率（減少隨機數，提升品質機率）
        baseProbability -= (enhanceBonus + levelBonus);

        // 確保機率在合理範圍內
        baseProbability = Math.max(0, Math.min(100, baseProbability));

        // 根據調整後的機率確定品質
        if (baseProbability < 54) return WeaponQuality.NORMAL;     // 54%
        if (baseProbability < 84) return WeaponQuality.MAGIC;      // 30% 
        if (baseProbability < 94) return WeaponQuality.RARE;       // 10%
        if (baseProbability < 99) return WeaponQuality.EPIC;       // 5%
        return WeaponQuality.LEGENDARY;                            // 1%
    }

    /**
     * 創建基於種子的穩定隨機數生成器
     */
    private static createSeededRandom(seed: number): () => number {
        let currentSeed = seed;
        return () => {
            currentSeed = (currentSeed * 9301 + 49297) % 233280;
            return currentSeed / 233280;
        };
    }

    /**
     * 生成穩定的種子確保同一武器數據總是產生相同的隨機屬性
     */
    private static generateSeed(weaponData: WeaponData): number {
        let seed = 0;
        const str = `${weaponData.weaponId}_${weaponData.level}_${weaponData.enhanceLevel}_${weaponData.uniqueId || ''}`;
        for (let i = 0; i < str.length; i++) {
            seed = ((seed << 5) - seed + str.charCodeAt(i)) & 0xffffffff;
        }
        return Math.abs(seed);
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
