import { Client } from "colyseus";
import { BaseMessageHandler } from "./Base/BaseMessageHandler";
import { PermissionLevel } from "@/Types";

/**
 * 測試命令消息處理器
 * 處理測試模式下的特殊命令
 */
export class TestCommandHandler extends BaseMessageHandler {
    private supportedTypes = [
        "testSpawnEnemy",
        "testKillAllEnemies",
        "testSetPlayerHealth",
        "testGiveItem",
        "testSetPlayerLevel",
        "testToggleGodMode",
        "testTeleportPlayer"
    ];

    getPermissionLevel(): PermissionLevel {
        return PermissionLevel.TEST;
    }

    canHandle(type: string): boolean {
        return this.supportedTypes.includes(type);
    }

    getSupportedTypes(): string[] {
        return [...this.supportedTypes];
    }

    async handle(client: Client, message: any): Promise<void> {
        const { type, data } = message;

        // 檢查測試模式和權限
        if (!this.checkPermissions(client)) {
            this.sendError(client, "測試模式未啟用或權限不足");
            return;
        }

        try {
            switch (type) {
                case "testSpawnEnemy":
                    this.handleTestSpawnEnemy(client, data);
                    break;
                case "testKillAllEnemies":
                    this.handleTestKillAllEnemies(client, data);
                    break;
                case "testSetPlayerHealth":
                    this.handleTestSetPlayerHealth(client, data);
                    break;
                case "testGiveItem":
                    this.handleTestGiveItem(client, data);
                    break;
                case "testSetPlayerLevel":
                    this.handleTestSetPlayerLevel(client, data);
                    break;
                case "testToggleGodMode":
                    this.handleTestToggleGodMode(client, data);
                    break;
                case "testTeleportPlayer":
                    this.handleTestTeleportPlayer(client, data);
                    break;
                default:
                    throw new Error(`Unsupported test command type: ${type}`);
            }

            this.logHandle(type, client.id, true);
        } catch (error) {
            this.logHandle(type, client.id, false, error.message);
            this.sendError(client, error.message);
        }
    }

    private handleTestSpawnEnemy(client: Client, data: any): void {
        if (!this.validateMessage(data, ['enemyType', 'x', 'y'])) {
            throw new Error("無效的敵人生成數據");
        }

        const { enemyType, x, y, count = 1 } = data;

        for (let i = 0; i < count; i++) {
            this.room.enemySystem.spawnSingleEnemy(
                enemyType,
                x + (i * 50), // 稍微分散位置
                y + (i * 50)
            );
        }

        this.sendSuccess(client, {
            message: `生成了 ${count} 個 ${enemyType} 敵人`,
            spawned: { enemyType, count, position: { x, y } }
        });
    }

    private handleTestKillAllEnemies(client: Client, data: any): void {
        // 從allUnits中計算敵人數量
        let enemyCount = 0;
        for (const [id, unit] of this.state.gameCore.allUnits) {
            if (unit.type === 0) { // UnitType.enemy = 0
                enemyCount++;
            }
        }

        // 清除所有敵人
        this.room.enemySystem.clearAllEnemies();

        this.sendSuccess(client, {
            message: `清除了 ${enemyCount} 個敵人`,
            killedCount: enemyCount
        });
    }

    private handleTestSetPlayerHealth(client: Client, data: any): void {
        if (!this.validateMessage(data, ['playerId', 'health'])) {
            throw new Error("無效的玩家血量數據");
        }

        const { playerId, health } = data;

        if (typeof health !== 'number' || health < 0) {
            throw new Error("無效的血量值");
        }

        const hero = this.state.getHero(playerId);
        if (!hero) {
            throw new Error("玩家英雄不存在");
        }

        hero.hp = health;
        this.sendSuccess(client, {
            message: `設置玩家 ${playerId} 血量為 ${health}`,
            playerId,
            newHealth: health
        });
    } private handleTestGiveItem(client: Client, data: any): void {
        if (!this.validateMessage(data, ['playerId', 'itemId'])) {
            throw new Error("無效的物品給予數據");
        }

        const { playerId, itemId, quantity = 1 } = data;

        const player = this.state.players.get(playerId);
        if (!player) {
            throw new Error("玩家不存在");
        }

        // 這裡需要實作物品給予邏輯
        console.log(`給予玩家 ${playerId} 物品 ${itemId} x${quantity}`);

        this.sendSuccess(client, {
            message: `給予玩家 ${playerId} 物品 ${itemId} x${quantity}`,
            playerId,
            itemId,
            quantity
        });
    }

    private handleTestSetPlayerLevel(client: Client, data: any): void {
        if (!this.validateMessage(data, ['playerId', 'level'])) {
            throw new Error("無效的玩家等級數據");
        }

        const { playerId, level } = data;

        if (typeof level !== 'number' || level < 1) {
            throw new Error("無效的等級值");
        }

        const hero = this.state.getHero(playerId);
        if (!hero) {
            throw new Error("玩家英雄不存在");
        }

        hero.level = level;
        this.sendSuccess(client, {
            message: `設置玩家 ${playerId} 等級為 ${level}`,
            playerId,
            newLevel: level
        });
    }

    private handleTestToggleGodMode(client: Client, data: any): void {
        if (!this.validateMessage(data, ['playerId'])) {
            throw new Error("無效的玩家ID");
        }

        const { playerId } = data;

        const hero = this.state.getHero(playerId);
        if (!hero) {
            throw new Error("玩家英雄不存在");
        }

        // 無敵模式功能尚未實作
        throw new Error("無敵模式功能尚未實作");
    }

    private handleTestTeleportPlayer(client: Client, data: any): void {
        if (!this.validateMessage(data, ['playerId', 'x', 'y'])) {
            throw new Error("無效的傳送數據");
        }

        const { playerId, x, y } = data;

        const hero = this.state.getHero(playerId);
        if (!hero) {
            throw new Error("玩家英雄不存在");
        }

        hero.position.x = x;
        hero.position.y = y;

        this.sendSuccess(client, {
            message: `傳送玩家 ${playerId} 到 (${x}, ${y})`,
            playerId,
            newPosition: { x, y }
        });
    }
}
