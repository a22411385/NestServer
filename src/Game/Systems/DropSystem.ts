import { GameRoom } from "../../Colyseus/Rooms/GameRoom";
import { ServerGameUnit } from "../../Colyseus/Schema/Unit/GameUnit";
import { ServerEnemy } from "../../Colyseus/Schema/Unit/Enemy";
import { ServerItem, ItemType } from "../../Colyseus/Schema/Item/ServerItem";
import { Vector2 } from "../../Colyseus/Schema/Unit/GameUnit";
import { IdGenerator } from "../../Util/IdGenerator";

/**
 * 掉落表項目
 */
export interface DropTableEntry {
    itemType: 'exp' | 'gold' | 'material' | 'weapon';
    chance: number; // 0-1 的掉落機率
    minValue?: number;
    maxValue?: number;
    specificId?: string; // 用於材料ID或武器ID
    rarity?: string; // 用於武器稀有度
}

/**
 * 基於敵人等級的掉落表
 */
export interface EnemyDropTable {
    [enemyLevel: number]: DropTableEntry[];
}

/**
 * 物品掉落系統管理器
 * 負責處理怪物死亡時的物品掉落邏輯
 */
export class DropSystem {
    private room: GameRoom;
    private dropTable: EnemyDropTable;

    constructor(room: GameRoom) {
        this.room = room;
        this.initializeDropTable();
    }

    /**
     * 初始化掉落表
     */
    private initializeDropTable(): void {
        this.dropTable = {
            // 1級敵人掉落表
            1: [
                { itemType: 'exp', chance: 1.0, minValue: 8, maxValue: 12 },
                { itemType: 'gold', chance: 0.7, minValue: 3, maxValue: 7 },
                { itemType: 'material', chance: 0.3, specificId: 'zombie_flesh', minValue: 1, maxValue: 2 },
            ],
            // 2級敵人掉落表
            2: [
                { itemType: 'exp', chance: 1.0, minValue: 12, maxValue: 18 },
                { itemType: 'gold', chance: 0.8, minValue: 5, maxValue: 10 },
                { itemType: 'material', chance: 0.4, specificId: 'zombie_flesh', minValue: 1, maxValue: 3 },
                { itemType: 'material', chance: 0.2, specificId: 'monster_bone', minValue: 1, maxValue: 1 },
            ],
            // 3級敵人掉落表
            3: [
                { itemType: 'exp', chance: 1.0, minValue: 18, maxValue: 25 },
                { itemType: 'gold', chance: 0.9, minValue: 8, maxValue: 15 },
                { itemType: 'material', chance: 0.5, specificId: 'zombie_flesh', minValue: 2, maxValue: 4 },
                { itemType: 'material', chance: 0.3, specificId: 'monster_bone', minValue: 1, maxValue: 2 },
                { itemType: 'weapon', chance: 0.1, rarity: 'common' },
            ],
            // Boss等級掉落表
            4: [
                { itemType: 'exp', chance: 1.0, minValue: 50, maxValue: 80 },
                { itemType: 'gold', chance: 1.0, minValue: 25, maxValue: 50 },
                { itemType: 'material', chance: 0.8, specificId: 'magic_crystal', minValue: 1, maxValue: 3 },
                { itemType: 'weapon', chance: 0.3, rarity: 'uncommon' },
                { itemType: 'weapon', chance: 0.1, rarity: 'rare' },
            ]
        };
    }

    /**
     * 處理敵人死亡掉落
     */
    public handleEnemyDeath(enemy: ServerEnemy, killer: ServerGameUnit): void {
        console.log(`🎁 處理敵人 ${enemy.name} 的掉落物品...`);

        const enemyLevel = enemy.lv || 1;
        const dropEntries = this.dropTable[enemyLevel] || this.dropTable[1];

        // 在敵人死亡位置周圍隨機散佈物品
        const dropPosition = this.getRandomDropPosition(enemy.position);

        for (const entry of dropEntries) {
            if (Math.random() <= entry.chance) {
                this.createDropItem(entry, dropPosition);
            }
        }

        console.log(`✅ 敵人 ${enemy.name} 掉落處理完成`);
    }

    /**
     * 創建掉落物品
     */
    private createDropItem(entry: DropTableEntry, basePosition: Vector2): void {
        const itemId = IdGenerator.generateItemId();
        const position = this.getRandomDropPosition(basePosition);

        let dropItem: ServerItem;

        switch (entry.itemType) {
            case 'exp':
                const expValue = this.getRandomValue(entry.minValue || 10, entry.maxValue || 10);
                dropItem = ServerItem.createExp(position.x, position.y, expValue);
                break;

            case 'gold':
                const goldValue = this.getRandomValue(entry.minValue || 5, entry.maxValue || 5);
                dropItem = ServerItem.createGold(position.x, position.y, goldValue);
                break;

            case 'material':
                const materialValue = this.getRandomValue(entry.minValue || 1, entry.maxValue || 1);
                dropItem = ServerItem.createMaterial(position.x, position.y, entry.specificId || 'zombie_flesh', materialValue);
                break;

            case 'weapon':
                const weaponId = this.getRandomWeaponId();
                const rarity = entry.rarity || 'common';
                dropItem = ServerItem.createWeapon(position.x, position.y, weaponId, rarity);
                break;

            default:
                console.warn(`未知的物品類型: ${entry.itemType}`);
                return;
        }

        dropItem.id = itemId;

        // 添加到遊戲世界
        this.room.state.gameCore.mapItems.push(dropItem);

        console.log(`📦 創建掉落物品: ${dropItem.itemType} 在位置 (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`);
    }

    /**
     * 獲取隨機掉落位置（在原位置周圍散佈）
     */
    private getRandomDropPosition(basePosition: Vector2): Vector2 {
        const scatterRadius = 50; // 散佈半徑
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * scatterRadius;

        return new Vector2(
            basePosition.x + Math.cos(angle) * distance,
            basePosition.y + Math.sin(angle) * distance
        );
    }

    /**
     * 獲取隨機數值
     */
    private getRandomValue(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * 獲取隨機武器ID（暫時簡化）
     */
    private getRandomWeaponId(): string {
        const weaponIds = [
            'baseball_bat',
            'pistol',
            'assault_rifle',
            'shotgun',
            'sniper_rifle'
        ];
        return weaponIds[Math.floor(Math.random() * weaponIds.length)];
    }

    /**
     * 清理過期物品
     */
    public cleanupExpiredItems(): void {
        const expiredItems: number[] = [];

        for (let i = 0; i < this.room.state.gameCore.mapItems.length; i++) {
            const item = this.room.state.gameCore.mapItems[i];
            if (item.isExpired()) {
                expiredItems.push(i);
            }
        }

        // 從後往前刪除，避免索引混亂
        for (let i = expiredItems.length - 1; i >= 0; i--) {
            const index = expiredItems[i];
            const item = this.room.state.gameCore.mapItems[index];
            console.log(`🗑️ 清理過期物品: ${item.itemType}`);
            this.room.state.gameCore.mapItems.splice(index, 1);
        }

        if (expiredItems.length > 0) {
            console.log(`🧹 清理了 ${expiredItems.length} 個過期物品`);
        }
    }

    /**
     * 清理系統資源
     */
    public cleanup(): void {
        console.log('🧹 DropSystem 已清理');
    }

    /**
     * 🆕 測試用：直接創建指定類型的物品
     */
    public createTestDropItem(itemType: string, position: { x: number, y: number }, value: number = 10): void {
        const itemId = IdGenerator.generateItemId();

        let dropItem: ServerItem;

        switch (itemType) {
            case 'exp':
                dropItem = ServerItem.createExp(position.x, position.y, value);
                break;
            case 'gold':
                dropItem = ServerItem.createGold(position.x, position.y, value);
                break;
            case 'material':
                dropItem = ServerItem.createMaterial(position.x, position.y, 'zombie_flesh', value);
                break;
            case 'weapon':
                dropItem = ServerItem.createWeapon(position.x, position.y, 'baseball_bat', 'common');
                break;
            default:
                console.warn(`未知的測試物品類型: ${itemType}`);
                return;
        }

        dropItem.id = itemId;

        // 添加到遊戲世界
        this.room.state.gameCore.mapItems.push(dropItem);

        console.log(`🧪 測試創建掉落物品: ${dropItem.itemType} 在位置 (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`);
    }
}
