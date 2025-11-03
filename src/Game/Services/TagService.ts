/**
 * 標籤服務 - 提供標籤查詢和驗證功能
 * 從 GoogleSheetCache 載入 TagDefinitions
 */

import { TagDefinition, TagCategory } from '@/Types/Equipment/WeaponPropertyTypes';
import { GoogleSheetCache } from '@/Tasks/GoogleSheetCache';

export class TagService {
    private static instance: TagService;
    private tagDefinitions: Map<string, TagDefinition> = new Map();
    private tagsByCategory: Map<TagCategory, string[]> = new Map();
    private isInitialized: boolean = false;

    private constructor() { }

    /**
     * 獲取單例
     */
    public static getInstance(): TagService {
        if (!TagService.instance) {
            TagService.instance = new TagService();
        }
        return TagService.instance;
    }

    /**
     * 初始化標籤服務
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            const cache = GoogleSheetCache.getInstance();
            const cachedData = cache.getData();

            if (!cachedData || !cachedData.TagDefinitions) {
                console.warn('⚠️ TagDefinitions 資料為空，TagService 將使用空資料');
                this.isInitialized = true;
                return;
            }

            // 建立標籤映射
            cachedData.TagDefinitions.forEach(tag => {
                if (tag.enabled) {
                    this.tagDefinitions.set(tag.id, tag);
                }
            });

            // 按 category 分組
            this.buildCategoryIndex();

            console.log(`🏷️ TagService 初始化完成: ${this.tagDefinitions.size} 個標籤`);
            this.isInitialized = true;

        } catch (error) {
            console.error('❌ TagService 初始化失敗:', error);
            this.isInitialized = true; // 即使失敗也標記為已初始化，避免重複嘗試
        }
    }

    /**
     * 建立按 category 分組的索引
     */
    private buildCategoryIndex(): void {
        this.tagsByCategory.clear();

        this.tagDefinitions.forEach(tag => {
            if (!this.tagsByCategory.has(tag.category)) {
                this.tagsByCategory.set(tag.category, []);
            }
            this.tagsByCategory.get(tag.category)!.push(tag.id);
        });
    }

    /**
     * 獲取指定 category 的所有標籤 ID
     */
    public getTagsByCategory(category: TagCategory): string[] {
        return this.tagsByCategory.get(category) || [];
    }

    /**
     * 檢查標籤是否屬於指定 category
     */
    public isTagInCategory(tagId: string, category: TagCategory): boolean {
        const tag = this.tagDefinitions.get(tagId);
        return tag?.category === category;
    }

    /**
     * 獲取標籤定義
     */
    public getTagDefinition(tagId: string): TagDefinition | undefined {
        return this.tagDefinitions.get(tagId);
    }

    /**
     * 獲取標籤的完整路徑（包含父級）
     */
    public getTagPath(tagId: string): string[] {
        const path: string[] = [];
        let current = this.tagDefinitions.get(tagId);

        while (current) {
            path.unshift(current.id);
            if (!current.parent) break;
            current = this.tagDefinitions.get(current.parent);
        }

        return path;
    }

    /**
     * 檢查標籤是否屬於某個父級標籤族系
     */
    public isTagInFamily(tagId: string, familyId: string): boolean {
        const path = this.getTagPath(tagId);
        return path.includes(familyId);
    }

    /**
     * 驗證標籤是否存在且啟用
     */
    public isValidTag(tagId: string): boolean {
        return this.tagDefinitions.has(tagId);
    }

    /**
     * 驗證標籤列表
     */
    public validateTags(tags: string[]): { valid: boolean; invalidTags: string[] } {
        const invalidTags = tags.filter(tag => !this.isValidTag(tag));
        return {
            valid: invalidTags.length === 0,
            invalidTags
        };
    }

    /**
     * 從標籤列表中篩選指定 category 的標籤
     */
    public filterTagsByCategory(tags: string[], category: TagCategory): string[] {
        return tags.filter(tag => this.isTagInCategory(tag, category));
    }

    /**
     * 檢查服務是否已初始化
     */
    public isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * 獲取所有標籤數量
     */
    public getTagCount(): number {
        return this.tagDefinitions.size;
    }

    /**
     * 重新載入標籤定義（用於熱更新）
     */
    public async reload(): Promise<void> {
        this.isInitialized = false;
        this.tagDefinitions.clear();
        this.tagsByCategory.clear();
        await this.initialize();
    }
}
