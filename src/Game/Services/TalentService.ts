import { GoogleSheetCache } from "../../Tasks/GoogleSheetCache";
import { TalentConfig, TalentEffect, TalentCategory, TalentPropertyType } from "../../Types/Game/TalentTypes";

/**
 * 天賦服務 - 負責天賦資料管理和配置載入
 * 類似 WeaponPropertyService 的架構設計
 */
export class TalentService {
    private static instance: TalentService;
    private talentConfigs: Map<string, TalentConfig> = new Map();
    private talentEffects: Map<string, TalentEffect[]> = new Map();
    private categoryTalents: Map<TalentCategory, TalentConfig[]> = new Map();
    private isInitialized: boolean = false;

    private constructor() { }

    public static getInstance(): TalentService {
        if (!TalentService.instance) {
            TalentService.instance = new TalentService();
        }
        return TalentService.instance;
    }

    /**
     * 初始化天賦系統 - 從 Google Sheets 載入資料
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            console.log('🌟 初始化天賦系統...');

            const cachedData = GoogleSheetCache.getInstance().getData();
            if (!cachedData) {
                throw new Error('Google Sheets 資料未載入');
            }

            // 載入天賦配置
            if (cachedData.TalentConfigs) {
                this.loadTalentConfigs(cachedData.TalentConfigs);
            }

            // 載入天賦效果
            if (cachedData.TalentEffects) {
                this.loadTalentEffects(cachedData.TalentEffects);
            }

            // 建立分類索引
            this.buildCategoryIndex();

            this.isInitialized = true;
            console.log(`✅ 天賦系統初始化完成 - 載入 ${this.talentConfigs.size} 個天賦`);
        } catch (error) {
            console.error('❌ 天賦系統初始化失敗:', error);
            throw error;
        }
    }

    /**
     * 載入天賦配置資料
     */
    private loadTalentConfigs(configs: TalentConfig[]): void {
        for (const config of configs) {
            if (config.is_active) {
                this.talentConfigs.set(config.id, config);
            }
        }
        console.log(`🔧 載入 ${this.talentConfigs.size} 個天賦配置`);
    }

    /**
     * 載入天賦效果資料
     */
    private loadTalentEffects(effects: TalentEffect[]): void {
        for (const effect of effects) {
            const talentId = effect.talent_id;
            if (!this.talentEffects.has(talentId)) {
                this.talentEffects.set(talentId, []);
            }
            this.talentEffects.get(talentId)!.push(effect);
        }
        console.log(`🔧 載入 ${effects.length} 個天賦效果`);
    }

    /**
     * 建立分類索引
     */
    private buildCategoryIndex(): void {
        for (const config of this.talentConfigs.values()) {
            const category = config.category;
            if (!this.categoryTalents.has(category)) {
                this.categoryTalents.set(category, []);
            }
            this.categoryTalents.get(category)!.push(config);
        }

        // 對每個分類的天賦進行排序（根據 position_x, position_y）
        for (const talents of this.categoryTalents.values()) {
            talents.sort((a, b) => {
                if (a.position_y !== b.position_y) {
                    return a.position_y - b.position_y;
                }
                return a.position_x - b.position_x;
            });
        }
    }

    /**
     * 獲取天賦配置
     */
    public getTalentConfig(talentId: string): TalentConfig | null {
        return this.talentConfigs.get(talentId) || null;
    }

    /**
     * 獲取天賦效果列表
     */
    public getTalentEffects(talentId: string): TalentEffect[] {
        return this.talentEffects.get(talentId) || [];
    }

    /**
     * 獲取指定分類的所有天賦
     */
    public getTalentsByCategory(category: TalentCategory): TalentConfig[] {
        return this.categoryTalents.get(category) || [];
    }

    /**
     * 獲取所有天賦分類
     */
    public getAllCategories(): TalentCategory[] {
        return Array.from(this.categoryTalents.keys());
    }

    /**
     * 驗證天賦前置需求
     */
    public validatePrerequisites(talentId: string, allocatedTalents: Record<string, number>): boolean {
        const config = this.getTalentConfig(talentId);
        if (!config) return false;

        if (!config.prerequisites || config.prerequisites.trim() === '') {
            return true;
        }

        // 解析逗號分隔的前置天賦ID
        const prerequisiteIds = config.prerequisites.split(',').map(id => id.trim()).filter(id => id.length > 0);

        // 檢查每個前置天賦是否已點滿
        for (const prerequisiteId of prerequisiteIds) {
            const prerequisiteConfig = this.getTalentConfig(prerequisiteId);
            if (!prerequisiteConfig) return false;

            const allocatedPoints = allocatedTalents[prerequisiteId] || 0;
            if (allocatedPoints < prerequisiteConfig.max_points) {
                return false;
            }
        }

        return true;
    }

    /**
     * 計算天賦效果數值
     */
    public calculateTalentValue(talentId: string, points: number): Map<TalentPropertyType, number> {
        const effects = this.getTalentEffects(talentId);
        const values = new Map<TalentPropertyType, number>();

        for (const effect of effects) {
            const totalValue = effect.base_value + (effect.per_point_value * points);
            values.set(effect.property_name, totalValue);
        }

        return values;
    }

    /**
     * 獲取系統統計
     */
    public getStats(): {
        talentsCount: number;
        effectsCount: number;
        categoriesCount: number;
        isInitialized: boolean;
    } {
        return {
            talentsCount: this.talentConfigs.size,
            effectsCount: Array.from(this.talentEffects.values()).reduce((sum, effects) => sum + effects.length, 0),
            categoriesCount: this.categoryTalents.size,
            isInitialized: this.isInitialized
        };
    }

    /**
     * 重新載入資料
     */
    public async reload(): Promise<void> {
        this.isInitialized = false;
        this.talentConfigs.clear();
        this.talentEffects.clear();
        this.categoryTalents.clear();
        await this.initialize();
    }
}

// 導出便利方法
const talentService = TalentService.getInstance();

/**
 * 初始化天賦系統
 */
export async function initializeTalentSystem(): Promise<void> {
    await talentService.initialize();
}

/**
 * 獲取天賦配置
 */
export function getTalentConfig(talentId: string): TalentConfig | null {
    return talentService.getTalentConfig(talentId);
}

/**
 * 獲取天賦效果
 */
export function getTalentEffects(talentId: string): TalentEffect[] {
    return talentService.getTalentEffects(talentId);
}
