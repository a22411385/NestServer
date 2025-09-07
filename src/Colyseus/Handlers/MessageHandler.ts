import { Client } from "colyseus";
import { GameRoom } from "../Rooms/GameRoom";
import { IMessageHandler } from "@/Types";
import { GameControlHandler } from "./GameControlHandler";
import { MovementHandler } from "./MovementHandler";
import { WaveControlHandler } from "./WaveControlHandler";
import { DebugHandler } from "./DebugHandler";
import { EquipmentHandler } from "./EquipmentHandler"; // 🆕 引入裝備處理器
import { CharacterHandler } from "./CharacterHandler"; // 🆕 引入角色處理器
import { ItemPickupHandler } from "./ItemPickupHandler"; // 🆕 引入物品撿取處理器

/**
 * 主要消息處理器 - 使用路由模式分發消息到專門的處理器
 */
export class MessageHandler {
    private handlers: IMessageHandler[] = [];

    constructor(private room: GameRoom) {
        this.initializeHandlers();
    }

    /**
     * 初始化所有消息處理器
     */
    private initializeHandlers(): void {
        this.handlers = [
            new GameControlHandler(this.room),
            new MovementHandler(this.room),
            new WaveControlHandler(this.room),

            new DebugHandler(this.room),
            new EquipmentHandler(this.room), // 🆕 添加裝備處理器
            new CharacterHandler(this.room), // 🆕 添加角色處理器
            new ItemPickupHandler(this.room) // 🆕 添加物品撿取處理器
        ];

        // 記錄已註冊的處理器
        console.log("📋 消息處理器初始化完成:");
        this.handlers.forEach(handler => {
            const types = handler.getSupportedTypes();
            console.log(`  - ${handler.constructor.name}: [${types.join(', ')}]`);
        });
    }

    /**
     * 處理客戶端消息
     */
    async handle(client: Client, message: any): Promise<void> {
        const { type } = message;

        if (!type) {
            console.warn(`❌ 收到無效消息 (缺少 type): ${JSON.stringify(message)}`);
            client.send("error", { message: "消息格式錯誤" });
            return;
        }

        console.log(`📨 收到消息 [${type}] 從客戶端 ${client.id}`);

        // 尋找能處理此類型消息的處理器
        const handler = this.findHandler(type);

        if (!handler) {
            console.warn(`❌ 未找到處理器 for message type: ${type}`);
            client.send("error", { message: `不支持的消息類型: ${type}` });
            return;
        }

        // 委託給專門的處理器
        try {
            await handler.handle(client, message);
        } catch (error) {
            console.error(`❌ 處理消息 [${type}] 時出錯:`, error);
            client.send("error", {
                message: error.message || "處理消息時發生錯誤"
            });
        }
    }

    /**
     * 尋找能處理指定類型消息的處理器
     */
    private findHandler(type: string): IMessageHandler | null {
        return this.handlers.find(handler => handler.canHandle(type)) || null;
    }

    /**
     * 獲取所有支援的消息類型
     */
    getSupportedTypes(): { [handlerName: string]: string[] } {
        const result: { [handlerName: string]: string[] } = {};

        this.handlers.forEach(handler => {
            result[handler.constructor.name] = handler.getSupportedTypes();
        });

        return result;
    }

    /**
     * 添加自定義處理器
     */
    addHandler(handler: IMessageHandler): void {
        this.handlers.push(handler);
        console.log(`➕ 添加處理器: ${handler.constructor.name}`);
    }

    /**
     * 移除處理器
     */
    removeHandler(handlerClass: new (...args: any[]) => IMessageHandler): boolean {
        const index = this.handlers.findIndex(h => h instanceof handlerClass);
        if (index !== -1) {
            const removed = this.handlers.splice(index, 1)[0];
            console.log(`➖ 移除處理器: ${removed.constructor.name}`);
            return true;
        }
        return false;
    }

    /**
     * 處理舊版消息格式 (保持向後兼容)
     */
    async MessageHandler(client: Client, type: string | number, message: any): Promise<void> {
        // 轉換為新格式
        const newMessage = {
            type: type.toString(),
            data: message,
        };

        await this.handle(client, newMessage);
    }

    /**
     * 發送戰鬥日誌 (向後兼容方法)
     */
    sendBattleLog(message: string, category: 'damage' | 'death' | 'kill' | 'heal' | 'event' = 'event'): void {
        console.warn('⚠️ MessageHandler.sendBattleLog() 已棄用，請使用 combatSystem.getBattleLogSystem().sendBattleLog()');
        this.room.combatSystem.getBattleLogSystem().sendBattleLog(message, category);
    }

    /**
     * 廣播系統消息
     */
    broadcastSystemMessage(type: string, data: any): void {
        this.room.broadcast(type, data);
    }

    /**
     * 廣播玩家事件
     */
    broadcastPlayerEvent(eventType: string, playerId: string, data?: any): void {
        this.room.broadcast(eventType, {
            playerId,
            ...data
        });
    }

    /**
     * 廣播戰鬥事件
     */
    broadcastCombatEvent(eventType: string, data: any): void {
        this.room.broadcast(eventType, data);
    }

    /**
     * 發送歡迎消息給特定客戶端
     */
    sendWelcomeMessage(client: Client, playerId: string): void {
        client.send("gameWelcome", {
            playerId: playerId,
        });
    }

    /**
     * 通知新主機
     */
    notifyNewHost(newHostId: string): void {
        this.room.broadcast("newHost", { newHostId: newHostId });
    }

    /**
     * 清理消息處理器
     */
    cleanup(): void {
        console.log("🧹 清理 MessageHandler 資源");
        // 清理任何需要釋放的資源
        this.handlers.length = 0;
    }
}

/**
 * 創建消息處理函數 (保持向後兼容)
 */
export function createMessageHandler(room: GameRoom) {
    const handler = new MessageHandler(room);

    return function (client: Client, message: any) {
        handler.handle(client, message).catch(error => {
            console.error("MessageHandler 處理錯誤:", error);
        });
    };
}
