/**
 * 統一ID生成器 - 確保所有單位ID的系統化和唯一性
 */
export class IdGenerator {
    private static heroCounter: number = 0;
    private static enemyCounter: number = 0;
    private static itemCounter: number = 0;

    /**
     * 生成Hero ID - 使用客戶端sessionId作為基礎
     */
    static generateHeroId(sessionId: string): string {
        return `hero_${sessionId}`;
    }

    /**
     * 生成Enemy ID - 系統化的敵人ID
     */
    static generateEnemyId(type: number = 1): string {
        this.enemyCounter++;
        return `enemy_${type}_${this.enemyCounter}_${Date.now()}`;
    }

    /**
     * 生成測試Enemy ID - 用於測試模式
     */
    static generateTestEnemyId(type: number = 1): string {
        this.enemyCounter++;
        return `test_enemy_${type}_${this.enemyCounter}_${Date.now()}`;
    }

    /**
     * 生成Item ID - 系統化的道具ID
     */
    static generateItemId(itemType: string = 'generic'): string {
        this.itemCounter++;
        return `item_${itemType}_${this.itemCounter}_${Date.now()}`;
    }

    /**
     * 解析ID類型
     */
    static parseIdType(id: string): 'hero' | 'enemy' | 'item' | 'unknown' {
        if (id.startsWith('hero_')) return 'hero';
        if (id.startsWith('enemy_') || id.startsWith('test_enemy_')) return 'enemy';
        if (id.startsWith('item_')) return 'item';
        return 'unknown';
    }

    /**
     * 從Hero ID提取SessionId
     */
    static extractSessionIdFromHeroId(heroId: string): string {
        if (heroId.startsWith('hero_')) {
            return heroId.substring(5); // 移除 'hero_' 前綴
        }
        return heroId; // 如果不是標準格式，直接返回
    }

    /**
     * 檢查ID是否有效
     */
    static isValidId(id: string): boolean {
        return Boolean(id) && id.length > 0 && this.parseIdType(id) !== 'unknown';
    }

    /**
     * 重置計數器（用於測試或重啟）
     */
    static resetCounters(): void {
        this.heroCounter = 0;
        this.enemyCounter = 0;
        this.itemCounter = 0;
    }
}
