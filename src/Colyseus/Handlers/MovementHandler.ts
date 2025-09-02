import { Client } from "colyseus";
import { BaseMessageHandler } from "./Base/BaseMessageHandler";
import { PermissionLevel } from "@/Types";

/**
 * 移動消息處理器
 * 處理玩家移動相關的消息
 */
export class MovementHandler extends BaseMessageHandler {
    private supportedTypes = [
        "playerMoveVector",
        "playerFacingDirection",
        "playerStop",
        "playerDash"
    ];

    getPermissionLevel(): PermissionLevel {
        return PermissionLevel.USER;
    }

    canHandle(type: string): boolean {
        return this.supportedTypes.includes(type);
    }

    getSupportedTypes(): string[] {
        return [...this.supportedTypes];
    }

    async handle(client: Client, message: any): Promise<void> {
        const { type, data } = message;

        // 檢查遊戲是否在進行中
        if (!this.checkGamePlaying()) {
            this.sendError(client, "遊戲未開始");
            return;
        }

        try {
            switch (type) {
                case "playerMoveVector":
                    this.handlePlayerMoveVector(client, data);
                    break;
                case "playerFacingDirection":
                    this.handlePlayerFacingDirection(client, data);
                    break;
                case "playerStop":
                    this.handlePlayerStop(client, data);
                    break;
                case "playerDash":
                    this.handlePlayerDash(client, data);
                    break;
                default:
                    throw new Error(`Unsupported movement type: ${type}`);
            }

            this.logHandle(type, client.id, true);
        } catch (error) {
            this.logHandle(type, client.id, false, error.message);
            this.sendError(client, error.message);
        }
    }

    private handlePlayerMoveVector(client: Client, data: { vx: number; vy: number }): void {
        if (!this.validateMessage(data, ['vx', 'vy'])) {
            throw new Error("無效的移動向量數據");
        }

        const { vx, vy } = data;

        // 驗證移動向量範圍
        if (Math.abs(vx) > 1 || Math.abs(vy) > 1) {
            throw new Error("移動向量超出範圍");
        }

        const player = this.state.players.get(client.sessionId);
        if (!player) {
            throw new Error("玩家不存在");
        }

        // 使用MovementSystem處理移動
        this.room.movementSystem.handlePlayerMoveVector(client, vx, vy);
    }

    private handlePlayerFacingDirection(client: Client, data: any): void {
        if (!this.validateMessage(data, ['direction'])) {
            throw new Error("無效的面向方向數據");
        }

        const { direction } = data;

        // 驗證方向角度
        if (typeof direction !== 'number' || direction < 0 || direction >= 360) {
            throw new Error("無效的面向方向");
        }

        const player = this.state.players.get(client.sessionId);
        if (!player) {
            throw new Error("玩家不存在");
        }

        // 獲取Hero單位並更新面向
        const hero = this.state.getHero(client.sessionId);
        if (hero) {
            hero.facingDirection = direction;
        }
    }

    private handlePlayerStop(client: Client, data: any): void {
        const player = this.state.players.get(client.sessionId);
        if (!player) {
            throw new Error("玩家不存在");
        }

        // 使用MovementSystem停止移動
        this.room.movementSystem.handlePlayerMoveVector(client, 0, 0);
    }

    private handlePlayerDash(client: Client, data: any): void {
        if (!this.validateMessage(data, ['direction'])) {
            throw new Error("無效的衝刺方向數據");
        }

        const { direction } = data;

        const player = this.state.players.get(client.sessionId);
        if (!player) {
            throw new Error("玩家不存在");
        }

        // 暫時簡化衝刺邏輯，直接發送錯誤 (功能尚未實作)
        throw new Error("衝刺功能尚未實作");
    }
}
