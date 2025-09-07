import { Client } from "colyseus";
import { GameRoom } from "../../Rooms/GameRoom";
import { GameRoomState } from "../../Schema/GameState";
import { IMessageHandler, MessageData, PermissionLevel } from "@/Types";

export interface MessageHandleResult {
    success: boolean;
    error?: string;
    data?: any;
}

/**
 * 基礎消息處理器抽象類
 */
export abstract class BaseMessageHandler implements IMessageHandler {
    protected room: GameRoom;
    protected state: GameRoomState;

    constructor(room: GameRoom) {
        this.room = room;
        this.state = room.state;
    }

    /**
     * 處理消息 - 子類實現
     */
    abstract handle(client: Client, message: MessageData): Promise<void> | void;

    /**
     * 檢查是否能處理此類型消息 - 子類實現
     */
    abstract canHandle(type: string): boolean;

    /**
     * 獲取權限等級 - 子類實現
     */
    abstract getPermissionLevel(): PermissionLevel;

    /**
     * 獲取支援的消息類型 - 子類實現
     */
    abstract getSupportedTypes(): string[];

    /**
     * 檢查用戶權限
     */
    protected checkPermissions(client: Client): boolean {
        const level = this.getPermissionLevel();

        switch (level) {
            case PermissionLevel.HOST:
                return this.room.playerManager.isPlayerHost(client);
            case PermissionLevel.ADMIN:
                return this.room.playerManager.isPlayerHost(client); // 目前等同於HOST
            case PermissionLevel.TEST:
                return this.state.isTestMode && this.room.playerManager.isPlayerHost(client);
            case PermissionLevel.USER:
            default:
                return true;
        }
    }

    /**
     * 檢查遊戲是否在進行中
     */
    protected checkGamePlaying(): boolean {
        return this.room.gameManager.isPlaying;
    }

    /**
     * 發送錯誤消息
     */
    protected sendError(client: Client, message: string): void {
        client.send("error", { message });
    }

    /**
     * 發送成功回應
     */
    protected sendSuccess(client: Client, data?: any): void {
        client.send("success", { data });
    }

    /**
     * 記錄處理日誌
     */
    protected logHandle(type: string, clientId: string, success: boolean, error?: string): void {
        const status = success ? '✅' : '❌';
        const errorMsg = error ? ` - ${error}` : '';
        if (this.constructor.name != "MovementHandler")
            console.log(`${status} [${this.constructor.name}] ${type} from ${clientId}${errorMsg}`);
    }

    /**
     * 驗證消息格式
     */
    protected validateMessage(message: any, requiredFields: string[] = []): boolean {
        if (!message || typeof message !== 'object') {
            return false;
        }

        for (const field of requiredFields) {
            if (!(field in message)) {
                return false;
            }
        }

        return true;
    }
}
