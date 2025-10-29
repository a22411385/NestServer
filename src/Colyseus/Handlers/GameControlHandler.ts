import { Client } from "colyseus";
import { BaseMessageHandler } from "./Base/BaseMessageHandler";
import { MessageData, PermissionLevel } from "@/Types";

/**
 * 遊戲控制消息處理器
 * 處理遊戲狀態相關的控制命令
 */
export class GameControlHandler extends BaseMessageHandler {
    private supportedTypes = [
        "toggleReady",
        "startGame",
        "pauseGame",
        "resumeGame",
        "endGame",
        "resetGame"
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

    async handle(client: Client, message: MessageData): Promise<void> {
        const { type, data } = message;

        try {
            switch (type) {
                case "toggleReady":
                    this.handleToggleReady(client, data);
                    break;
                case "startGame":
                    this.handleStartGame(client, data);
                    break;
                case "pauseGame":
                    this.handlePauseGame(client, data);
                    break;
                case "resumeGame":
                    this.handleResumeGame(client, data);
                    break;
                case "endGame":
                    this.handleEndGame(client, data);
                    break;
                case "resetGame":
                    this.handleResetGame(client, data);
                    break;
                default:
                    throw new Error(`Unsupported game control type: ${type}`);
            }

            this.logHandle(type, client.id, true);
        } catch (error) {
            this.logHandle(type, client.id, false, error.message);
            this.sendError(client, error.message);
        }
    }

    private handleToggleReady(client: Client, data: any): void {
        this.room.playerManager.togglePlayerReady(client);
    }

    private handleStartGame(client: Client, data: any): void {
        if (!this.room.playerManager.isPlayerHost(client)) {
            throw new Error("只有房主可以開始遊戲");
        }

        if (this.checkGamePlaying()) {
            throw new Error("遊戲已經在進行中");
        }
        if (!this.room.playerManager.getAllPlayersReady()) {
            throw new Error("並非所有玩家都已準備好");
        }

        this.room.gameManager.startGame();
        this.sendSuccess(client, { message: "遊戲開始" });
    }

    private handlePauseGame(client: Client, data: any): void {
        if (!this.room.playerManager.isPlayerHost(client)) {
            throw new Error("只有房主可以暫停遊戲");
        }

        if (!this.checkGamePlaying()) {
            throw new Error("遊戲未在進行中");
        }

        // 暫停功能尚未實作
        throw new Error("暫停功能尚未實作");
    }

    private handleResumeGame(client: Client, data: any): void {
        if (!this.room.playerManager.isPlayerHost(client)) {
            throw new Error("只有房主可以恢復遊戲");
        }

        // 恢復功能尚未實作
        throw new Error("恢復功能尚未實作");
    }

    private handleEndGame(client: Client, data: any): void {
        if (!this.room.playerManager.isPlayerHost(client)) {
            throw new Error("只有房主可以結束遊戲");
        }

        if (!this.checkGamePlaying()) {
            throw new Error("遊戲未在進行中");
        }

        // 使用gameManager的forceEndGame方法
        this.room.gameManager.forceEndGame();
        this.sendSuccess(client, { message: "遊戲已結束" });
    }

    private handleResetGame(client: Client, data: any): void {
        if (!this.room.playerManager.isPlayerHost(client)) {
            throw new Error("只有房主可以重置遊戲");
        }

        // 重置功能尚未實作 - 現在只是停止遊戲
        this.room.gameManager.stopGameLoop();
        this.sendSuccess(client, { message: "遊戲已重置" });
    }
}
