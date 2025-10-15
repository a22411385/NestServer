import { randomBytes } from 'crypto';

/**
 * 統一的唯一識別碼生成服務
 * 確保整個系統使用一致的 ID 生成策略
 */
export class UniqueIdGenerator {
    private static counter: number = 0;
    // private static machineId: string = this.generateMachineId();

    /**
     * 生成武器唯一ID
     * 格式: weapon_{timestamp}_{machineId}_{counter}
     */
    public static generateWeaponId(): string {
        const timestamp = Date.now().toString(36);
        const counter = (++this.counter).toString(36).padStart(3, '0');
        return `weapon_${timestamp}_${counter}`;
    }

    /**
     * 生成玩家唯一ID
     * 格式: player_{timestamp}_{machineId}_{counter}
     */
    public static generatePlayerId(): string {
        const timestamp = Date.now().toString(36);
        const counter = (++this.counter).toString(36).padStart(3, '0');
        return `player_${timestamp}_${counter}`;
    }

    /**
     * 生成單位唯一ID
     * 格式: unit_{timestamp}_{machineId}_{counter}
     */
    public static generateUnitId(): string {
        const timestamp = Date.now().toString(36);
        const counter = (++this.counter).toString(36).padStart(3, '0');
        return `unit_${timestamp}_${counter}`;
    }

    /**
     * 生成房間唯一ID
     * 格式: room_{timestamp}_{machineId}_{counter}
     */
    public static generateRoomId(): string {
        const timestamp = Date.now().toString(36);
        const counter = (++this.counter).toString(36).padStart(3, '0');
        return `room_${timestamp}_${counter}`;
    }

    /**
     * 生成物品唯一ID
     * 格式: item_{type}_{timestamp}_{machineId}_{counter}
     */
    public static generateItemId(itemType: string = 'generic'): string {
        const timestamp = Date.now().toString(36);
        const counter = (++this.counter).toString(36).padStart(3, '0');
        return `item_${itemType}_${timestamp}_${counter}`;
    }

    /**
     * 生成子彈唯一ID
     * 格式: bullet_{timestamp}_{machineId}_{counter}
     */
    public static generateBulletId(): string {
        const timestamp = Date.now().toString(36);
        const counter = (++this.counter).toString(36).padStart(3, '0');
        return `bullet_${timestamp}_${counter}`;
    }

    /**
     * 生成安全的隨機種子
     * 用於需要穩定隨機性的場景（如武器屬性生成）
     */
    public static generateSecureSeed(): number {
        try {
            // 使用加密隨機數生成種子
            const buffer = randomBytes(4);
            return buffer.readUInt32BE(0);
        } catch (error) {
            // 後備方案：組合時間戳、計數器和隨機數
            const timestamp = Date.now() & 0xFFFFFFFF;
            const counter = (++this.counter) & 0xFFFF;
            const random = Math.floor(Math.random() * 0xFFFF);
            return (timestamp ^ (counter << 16) ^ random) >>> 0; // 無符號32位
        }
    }

    /**
     * 驗證ID格式是否正確
     */
    public static validateId(id: string, prefix: string): boolean {
        const pattern = new RegExp(`^${prefix}_[0-9a-z]+_[0-9a-f]{4}_[0-9a-z]{3,}$`);
        return pattern.test(id);
    }

    /**
     * 從ID中提取時間戳
     */
    public static extractTimestamp(id: string): number | null {
        try {
            const parts = id.split('_');
            if (parts.length >= 2) {
                return parseInt(parts[1], 36);
            }
        } catch (error) {
            console.warn(`無法解析ID時間戳: ${id}`);
        }
        return null;
    }

    /**
     * 重置計數器（用於測試）
     */
    public static resetCounter(): void {
        this.counter = 0;
    }

}
