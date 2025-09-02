import { Client } from "colyseus";

/**
 * 消息處理器接口
 */
export interface IMessageHandler {
    /**
     * 處理消息
     */
    handle(client: Client, message: any): Promise<void> | void;

    /**
     * 檢查是否能處理此類型消息
     */
    canHandle(type: string): boolean;

    /**
     * 獲取權限等級
     */
    getPermissionLevel(): PermissionLevel;

    /**
     * 獲取支援的消息類型
     */
    getSupportedTypes(): string[];
}

/**
 * 權限等級枚舉
 */
export enum PermissionLevel {
    USER = 'user',
    HOST = 'host',
    ADMIN = 'admin',
    TEST = 'test'
}

/**
 * 消息處理結果
 */
export interface MessageHandleResult {
    success: boolean;
    error?: string;
    data?: any;
}
