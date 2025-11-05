import { GoogleSheetCache } from '@/Tasks/GoogleSheetCache';
import { AttributeCategory, WeaponStatConfig } from '@/Types/Equipment/WeaponTypes';

/**
 * 🎯 屬性映射服務 - 配置驅動版本
 * 
 * 用途：
 * - 提供屬性ID到武器Stats欄位的映射
 * - ✅ 從 Google Sheets (WeaponStatConfigs) 動態加載配置
 * 
 * 優勢：
 * ✅ 配置驅動，不再硬編碼
 * ✅ 支援熱更新
 * ✅ 類別分類管理
 * ✅ 統一使用 WeaponStatConfigs 表
 */

export class AttributeMappingService {
    private mappings: Map<string, WeaponStatConfig> = new Map();
    /**
     * 🔧 從配置數組初始化映射表
     */
    public initializeFromConfig(configs: WeaponStatConfig[]): void {
        this.mappings.clear();

        for (const config of configs) {
            // ✅ GoogleSheetCache 已統一處理 enabled 欄位為布林值
            if (!config.enabled) continue;

            // 存儲主映射
            this.mappings.set(config.attributeId, config);
        }

        console.log(`✅ AttributeMappingService 初始化完成: ${this.mappings.size} 個屬性映射`);
    }

    /**
     * 🔍 根據屬性ID獲取對應的statKey
     */
    public getStatKey(attributeId: string): string | null {
        const mapping = this.mappings.get(attributeId);
        return mapping?.statName || null;
    }

    /**
     * 📋 獲取所有映射配置
     */
    public getAllMappings(): WeaponStatConfig[] {
        return Array.from(this.mappings.values());
    }

    /**
     * 🔍 根據類別獲取映射
     */
    public getMappingsByCategory(category: AttributeCategory): WeaponStatConfig[] {
        return Array.from(this.mappings.values()).filter(
            (mapping) => mapping.category === category
        );
    }

    /**
     * ✅ 驗證屬性ID是否存在
     */
    public isValidAttributeId(attributeId: string): boolean {
        return this.mappings.has(attributeId);
    }
}
