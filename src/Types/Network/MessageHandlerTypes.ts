/**
 * 網路消息處理相關的類型定義
 */

import { Client } from "colyseus";

/**
 * 權限等級枚舉
 */
export enum PermissionLevel {
    PLAYER = 0,
    MODERATOR = 1,
    ADMIN = 2,
    USER = 'user',
    HOST = 'host',
    TEST = 'test'
}

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
