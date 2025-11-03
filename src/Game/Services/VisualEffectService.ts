/**
 * 視覺效果服務
 * 
 * 負責管理所有視覺效果定義，提供標籤匹配和查詢功能
 * 從 Google Sheets 載入視覺效果配置
 * 
 * @example
 * ```typescript
 * const service = VisualEffectService.getInstance();
 * await service.initialize();
 * 
 * // 根據標籤匹配視覺效果
 * const effects = service.matchEffectsByTags(['fire', 'explosive']);
 * // 返回: ['fire_explosion']
 * 
 * // 獲取效果配置
 * const config = service.getEffect('fire_explosion');
 * ```
 */

import { GoogleSheetCache } from '@/Tasks/GoogleSheetCache';
import { VisualEffectDefinition } from '@/Types';

export class VisualEffectService {
    private static instance: VisualEffectService;

    /** 所有視覺效果定義（effectId -> definition） */
    private effectDefinitions: Map<string, VisualEffectDefinition> = new Map();

    /** 標籤索引（tag -> effectId[]）用於快速查找 */
    private tagIndex: Map<string, string[]> = new Map();

    /** 效果類型索引（effectType -> effectId[]） */
    private typeIndex: Map<string, string[]> = new Map();

    private constructor() { }

    public static getInstance(): VisualEffectService {
        if (!VisualEffectService.instance) {
            VisualEffectService.instance = new VisualEffectService();
        }
        return VisualEffectService.instance;
    }

    /**
     * 初始化服務，從 GoogleSheetCache 載入視覺效果定義
     */
    public async initialize(): Promise<void> {
        console.log('🎨 初始化 VisualEffectService...');

        const cache = GoogleSheetCache.getInstance();
        const cacheData = cache.getData();

        if (!cacheData || !cacheData.VisualEffectDefinitions || cacheData.VisualEffectDefinitions.length === 0) {
            console.warn('⚠️ 未找到視覺效果定義');
            return;
        }

        // 載入視覺效果定義
        for (const effect of cacheData.VisualEffectDefinitions) {
            this.effectDefinitions.set(effect.effectId, effect);

            // 建立標籤索引
            if (effect.tags) {
                const tags = effect.tags.split(',').map((t: string) => t.trim());
                for (const tag of tags) {
                    if (!this.tagIndex.has(tag)) {
                        this.tagIndex.set(tag, []);
                    }
                    this.tagIndex.get(tag)!.push(effect.effectId);
                }
            }

            // 建立類型索引
            if (!this.typeIndex.has(effect.effectType)) {
                this.typeIndex.set(effect.effectType, []);
            }
            this.typeIndex.get(effect.effectType)!.push(effect.effectId);
        }

        console.log(`✅ VisualEffectService 初始化完成: ${this.effectDefinitions.size} 個視覺效果`);
        console.log(`   - 標籤索引: ${this.tagIndex.size} 個標籤`);
        console.log(`   - 類型索引: ${this.typeIndex.size} 個類型`);
    }

    /**
     * 獲取視覺效果定義
     */
    public getEffect(effectId: string): VisualEffectDefinition | undefined {
        return this.effectDefinitions.get(effectId);
    }

    /**
     * 獲取所有視覺效果定義
     */
    public getAllEffects(): VisualEffectDefinition[] {
        return Array.from(this.effectDefinitions.values());
    }

    /**
     * 根據標籤匹配視覺效果
     * 
     * 匹配規則：
     * 1. 計算每個效果與輸入標籤的匹配度（匹配標籤數量）
     * 2. 優先返回匹配度最高的效果
     * 3. 相同匹配度時，優先返回標籤數量較少的（更精確）
     * 
     * @param inputTags 輸入標籤列表
     * @param effectType 效果類型過濾（可選）
     * @returns 匹配的效果 ID 列表（按匹配度降序排列）
     * 
     * @example
     * ```typescript
     * // 匹配火焰爆炸效果
     * matchEffectsByTags(['fire', 'explosive']) // -> ['fire_explosion']
     * 
     * // 匹配投射物類型的火焰效果
     * matchEffectsByTags(['fire', 'projectile'], 'projectile') // -> ['fire_projectile']
     * 
     * // 匹配冰凍效果（元素 + 狀態）
     * matchEffectsByTags(['ice', 'freeze']) // -> ['freeze_aura']
     * ```
     */
    public matchEffectsByTags(
        inputTags: string[],
        effectType?: string
    ): string[] {
        if (!inputTags || inputTags.length === 0) {
            return [];
        }

        // 計算每個效果的匹配度
        const matches: Array<{
            effectId: string;
            matchScore: number;  // 匹配的標籤數量
            totalTags: number;   // 效果的總標籤數量
        }> = [];

        for (const [effectId, effect] of this.effectDefinitions) {
            // 類型過濾
            if (effectType && effect.effectType !== effectType) {
                continue;
            }

            // 沒有標籤的效果跳過
            if (!effect.tags) {
                continue;
            }

            const effectTags = effect.tags.split(',').map((t: string) => t.trim());

            // 計算匹配的標籤數量
            let matchCount = 0;
            for (const tag of effectTags) {
                if (inputTags.includes(tag)) {
                    matchCount++;
                }
            }

            // 只保留至少有一個標籤匹配的效果
            if (matchCount > 0) {
                matches.push({
                    effectId,
                    matchScore: matchCount,
                    totalTags: effectTags.length
                });
            }
        }

        // 排序：
        // 1. 匹配度高的優先
        // 2. 匹配度相同時，總標籤少的優先（更精確）
        matches.sort((a, b) => {
            if (a.matchScore !== b.matchScore) {
                return b.matchScore - a.matchScore; // 匹配度降序
            }
            return a.totalTags - b.totalTags; // 標籤數量升序
        });

        return matches.map(m => m.effectId);
    }

    /**
     * 根據單一標籤查找效果
     */
    public getEffectsByTag(tag: string): string[] {
        return this.tagIndex.get(tag) || [];
    }

    /**
     * 根據效果類型查找效果
     */
    public getEffectsByType(effectType: string): string[] {
        return this.typeIndex.get(effectType) || [];
    }

    /**
     * 檢查效果是否包含指定標籤
     */
    public hasTag(effectId: string, tag: string): boolean {
        const effect = this.getEffect(effectId);
        if (!effect || !effect.tags) {
            return false;
        }
        const tags = effect.tags.split(',').map((t: string) => t.trim());
        return tags.includes(tag);
    }

    /**
     * 獲取效果的所有標籤
     */
    public getEffectTags(effectId: string): string[] {
        const effect = this.getEffect(effectId);
        if (!effect || !effect.tags) {
            return [];
        }
        return effect.tags.split(',').map(t => t.trim());
    }

    /**
     * 🎯 智能匹配視覺效果（推薦方法）
     * 
     * 根據輸入標籤和效果類型，智能選擇最合適的視覺效果
     * 
     * 匹配策略：
     * 1. 如果有完全匹配的效果（所有標籤都匹配），優先返回
     * 2. 否則返回部分匹配度最高的效果
     * 3. 如果沒有匹配，返回該類型的預設效果（如 basic_projectile）
     * 
     * @param inputTags 輸入標籤列表
     * @param effectType 效果類型（projectile, particle, trail 等）
     * @returns 最匹配的效果 ID，或 undefined
     * 
     * @example
     * ```typescript
     * // 火焰投射物
     * smartMatch(['fire', 'projectile'], 'projectile') // -> 'fire_projectile'
     * 
     * // 火焰爆炸
     * smartMatch(['fire', 'explosive'], 'particle') // -> 'fire_explosion'
     * 
     * // 找不到火焰近戰效果，返回基礎效果
     * smartMatch(['fire', 'melee'], 'motion') // -> 'basic_slash' (如果存在)
     * 
     * // 沒有標籤，返回該類型的預設效果
     * smartMatch([], 'projectile') // -> 'basic_projectile'
     * ```
     */
    public smartMatch(
        inputTags: string[],
        effectType: string
    ): string | undefined {
        // 如果沒有標籤，返回預設效果
        if (!inputTags || inputTags.length === 0) {
            return this.getDefaultEffect(effectType);
        }

        // 嘗試匹配
        const matches = this.matchEffectsByTags(inputTags, effectType);

        if (matches.length > 0) {
            // 返回最佳匹配
            return matches[0];
        }

        // 沒有匹配，返回預設效果
        return this.getDefaultEffect(effectType);
    }

    /**
     * 獲取效果類型的預設效果
     */
    private getDefaultEffect(effectType: string): string | undefined {
        // 預設效果映射
        const defaults: Record<string, string> = {
            'projectile': 'basic_projectile',
            'particle': 'hit_spark',
            'motion': 'knockback_impact',
            'impact': 'hit_spark',
            'trail': 'fire_trail',  // 如果沒有更好的，用火焰拖尾
            'area': 'healing_aura'  // 如果沒有更好的，用治療光環
        };

        const defaultId = defaults[effectType];
        if (defaultId && this.effectDefinitions.has(defaultId)) {
            return defaultId;
        }

        // 如果預設效果不存在，返回該類型的第一個效果
        const typeEffects = this.getEffectsByType(effectType);
        return typeEffects.length > 0 ? typeEffects[0] : undefined;
    }

    /**
     * 驗證所有視覺效果的標籤是否正確定義
     * 
     * @returns 驗證結果
     */
    public validateEffects(): {
        valid: boolean;
        invalidEffects: Array<{ effectId: string; issues: string[] }>;
    } {
        const invalidEffects: Array<{ effectId: string; issues: string[] }> = [];

        for (const [effectId, effect] of this.effectDefinitions) {
            const issues: string[] = [];

            // 檢查是否有標籤
            if (!effect.tags || effect.tags.trim() === '') {
                issues.push('缺少標籤（tags 欄位為空）');
            }

            // 檢查必要欄位
            if (!effect.primaryColor || effect.primaryColor.trim() === '') {
                issues.push('缺少主要顏色（primaryColor）');
            }

            if (effect.size === undefined || effect.size < 0) {
                issues.push('無效的大小（size）');
            }

            if (issues.length > 0) {
                invalidEffects.push({ effectId, issues });
            }
        }

        return {
            valid: invalidEffects.length === 0,
            invalidEffects
        };
    }

    /**
     * 獲取統計資訊
     */
    public getStats() {
        return {
            totalEffects: this.effectDefinitions.size,
            totalTags: this.tagIndex.size,
            effectTypes: Array.from(this.typeIndex.keys()),
            effectsByType: Object.fromEntries(
                Array.from(this.typeIndex.entries()).map(([type, ids]) => [type, ids.length])
            ),
            topTags: Array.from(this.tagIndex.entries())
                .sort((a, b) => b[1].length - a[1].length)
                .slice(0, 10)
                .map(([tag, ids]) => ({ tag, count: ids.length }))
        };
    }
}
