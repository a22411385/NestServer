import { Client } from "colyseus";
import { BaseMessageHandler } from "./Base/BaseMessageHandler";
import { PermissionLevel } from "@/Types";

/**
 * 波次控制消息處理器
 * 處理波次管理相關的控制命令
 */
export class WaveControlHandler extends BaseMessageHandler {
    private supportedTypes = [
        "forceNextWave",
        "skipWave",
        "setWaveLevel",
        "pauseWave",
        "resumeWave",
        "clearEnemies"
    ];

    getPermissionLevel(): PermissionLevel {
        return PermissionLevel.HOST;
    }

    canHandle(type: string): boolean {
        return this.supportedTypes.includes(type);
    }

    getSupportedTypes(): string[] {
        return [...this.supportedTypes];
    }

    async handle(client: Client, message: any): Promise<void> {
        const { type, data } = message;

        // 檢查權限
        if (!this.checkPermissions(client)) {
            this.sendError(client, "權限不足，只有房主可以控制波次");
            return;
        }

        // 檢查遊戲狀態
        if (!this.checkGamePlaying()) {
            this.sendError(client, "遊戲未開始");
            return;
        }

        try {
            switch (type) {
                case "forceNextWave":
                    this.handleForceNextWave(client, data);
                    break;
                case "skipWave":
                    this.handleSkipWave(client, data);
                    break;
                case "setWaveLevel":
                    this.handleSetWaveLevel(client, data);
                    break;
                case "pauseWave":
                    this.handlePauseWave(client, data);
                    break;
                case "resumeWave":
                    this.handleResumeWave(client, data);
                    break;
                case "clearEnemies":
                    this.handleClearEnemies(client, data);
                    break;
                default:
                    throw new Error(`Unsupported wave control type: ${type}`);
            }

            this.logHandle(type, client.id, true);
        } catch (error) {
            this.logHandle(type, client.id, false, error.message);
            this.sendError(client, error.message);
        }
    }

    private handleForceNextWave(client: Client, data: any): void {
        const waveManager = this.room.enemySystem.getWaveManager();
        if (!waveManager) {
            throw new Error("波次管理器未初始化");
        }

        // 使用可用的方法強制開始波次
        const started = this.room.enemySystem.startNewWave();
        if (started) {
            this.sendSuccess(client, {
                message: "強制開始下一波",
                currentWave: waveManager.getCurrentWaveNumber()
            });
        } else {
            throw new Error("無法開始新波次");
        }
    }

    private handleSkipWave(client: Client, data: any): void {
        const waveManager = this.room.enemySystem.getWaveManager();
        if (!waveManager) {
            throw new Error("波次管理器未初始化");
        }

        // 暫時使用清除敵人的方式來跳過波次
        this.room.enemySystem.clearAllEnemies();
        this.sendSuccess(client, {
            message: "跳過當前波次",
            currentWave: waveManager.getCurrentWaveNumber()
        });
    }

    private handleSetWaveLevel(client: Client, data: any): void {
        if (!this.validateMessage(data, ['waveLevel'])) {
            throw new Error("無效的波次等級數據");
        }

        const { waveLevel } = data;

        if (typeof waveLevel !== 'number' || waveLevel < 1) {
            throw new Error("無效的波次等級");
        }

        // 設置波次等級功能尚未實作
        throw new Error("設置波次等級功能尚未實作");
    }

    private handlePauseWave(client: Client, data: any): void {
        const waveManager = this.room.enemySystem.getWaveManager();
        if (!waveManager) {
            throw new Error("波次管理器未初始化");
        }

        // 暫停波次功能尚未實作
        throw new Error("暫停波次功能尚未實作");
    }

    private handleResumeWave(client: Client, data: any): void {
        const waveManager = this.room.enemySystem.getWaveManager();
        if (!waveManager) {
            throw new Error("波次管理器未初始化");
        }

        // 恢復波次功能尚未實作
        throw new Error("恢復波次功能尚未實作");
    } private handleClearEnemies(client: Client, data: any): void {
        this.room.enemySystem.clearAllEnemies();
        this.sendSuccess(client, { message: "所有敵人已清除" });
    }
}
