/**
 * 標籤匹配系統
 * POE 風格的標籤匹配和查詢
 */

export class TagMatcher {
    /**
     * 檢查實體是否擁有任一指定標籤
     * @param entityTags - 實體的標籤列表
     * @param requiredTags - 需要匹配的標籤
     * @returns 是否至少擁有一個標籤
     */
    static hasAnyTag(entityTags: string[], requiredTags: string[]): boolean {
        if (!entityTags || entityTags.length === 0) return false;
        if (!requiredTags || requiredTags.length === 0) return true;

        return requiredTags.some(tag => entityTags.includes(tag));
    }

    /**
     * 檢查實體是否擁有所有指定標籤
     * @param entityTags - 實體的標籤列表
     * @param requiredTags - 需要匹配的標籤
     * @returns 是否擁有所有標籤
     */
    static hasAllTags(entityTags: string[], requiredTags: string[]): boolean {
        if (!requiredTags || requiredTags.length === 0) return true;
        if (!entityTags || entityTags.length === 0) return false;

        return requiredTags.every(tag => entityTags.includes(tag));
    }

    /**
     * 從逗號分隔的字符串解析標籤列表
     * @param tagsString - 標籤字符串 "fire,elemental,ailment"
     * @returns 標籤數組
     */
    static parseTags(tagsString: string): string[] {
        if (!tagsString || tagsString.trim() === '') return [];

        return tagsString
            .split(',')
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0);
    }

    /**
     * 計算標籤匹配度
     * @param entityTags - 實體標籤
     * @param requiredTags - 需求標籤
     * @returns 匹配度分數 (0-1)
     */
    static calculateMatchScore(entityTags: string[], requiredTags: string[]): number {
        if (!requiredTags || requiredTags.length === 0) return 1;
        if (!entityTags || entityTags.length === 0) return 0;

        const matchCount = requiredTags.filter(tag => entityTags.includes(tag)).length;
        return matchCount / requiredTags.length;
    }

    /**
     * 過濾具有指定標籤的項目
     * @param items - 項目列表
     * @param tags - 標籤列表
     * @param matchMode - 匹配模式 ('any' | 'all')
     */
    static filterByTags<T extends { tags: string[] }>(
        items: T[],
        tags: string[],
        matchMode: 'any' | 'all' = 'any'
    ): T[] {
        if (!tags || tags.length === 0) return items;

        return items.filter(item => {
            return matchMode === 'any'
                ? this.hasAnyTag(item.tags, tags)
                : this.hasAllTags(item.tags, tags);
        });
    }
}

/**
 * 標籤工具類
 */
export class TagUtils {
    /**
     * 合併多個標籤列表
     */
    static mergeTags(...tagLists: string[][]): string[] {
        const merged = new Set<string>();

        for (const tags of tagLists) {
            if (tags) {
                tags.forEach(tag => merged.add(tag.toLowerCase()));
            }
        }

        return Array.from(merged);
    }

    /**
     * 從字符串列表創建標籤集合
     */
    static createTagSet(...tagStrings: string[]): Set<string> {
        const tags = new Set<string>();

        for (const str of tagStrings) {
            if (str) {
                TagMatcher.parseTags(str).forEach(tag => tags.add(tag));
            }
        }

        return tags;
    }
}
