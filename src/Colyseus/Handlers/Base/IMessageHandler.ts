import { Client } from "colyseus";
import { IMessageHandler, PermissionLevel } from "@/Types";

// IMessageHandler interface 已移動到 Types 資料夾
// PermissionLevel enum 已移動到 Types 資料夾

/**
 * 消息處理結果
 */
export interface MessageHandleResult {
    success: boolean;
    error?: string;
    data?: any;
}
