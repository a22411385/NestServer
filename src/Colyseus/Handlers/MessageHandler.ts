import { Room, Client } from "colyseus";
import { GameRoomState } from "../../Shared/Schema/GameState";

/**
 * 消息處理器 - 統一處理所有 Colyseus 客戶端消息和廣播
 */
export class MessageHandler {
    private room: Room<GameRoomState>;
    private state: GameRoomState;

    constructor(room: Room<GameRoomState>) {
        this.room = room;
        this.state = room.state;
    }

    /**
     * 設置所有消息處理器
     */
    setupMessageHandlers(
        playerManager: any,
        gameManager: any,
        battleSystem: any
    ): void {
        // 玩家準備/取消準備
        this.room.onMessage("toggleReady", (client, message) => {
            if (gameManager.isPlaying) return;

            const allReady = playerManager.togglePlayerReady(client);

            // 檢查是否所有玩家都準備好了
            if (allReady && playerManager.getPlayerCount() >= 1) {
                this.room.broadcast("allPlayersReady", {});
            }
        });

        // 開始遊戲（只有主機可以）
        this.room.onMessage("startGame", (client, message) => {
            if (!playerManager.isPlayerHost(client)) {
                client.send("error", { message: "Only host can start the game" });
                return;
            }

            if (playerManager.getAllPlayersReady() && playerManager.getPlayerCount() >= 1) {
                // 初始化 Hero 單位
                playerManager.initializeAllHeroes();

                // 發送遊戲開始戰報
                this.sendBattleLog(`遊戲開始！共有 ${playerManager.getPlayerCount()} 名玩家參與戰鬥`, 'event');

                // 發送玩家初始化戰報
                for (const [, hero] of this.state.heroes) {
                    this.sendBattleLog(`${hero.name} 加入戰場 (Lv.${hero.level}, HP:${hero.hp}/${hero.maxHp})`, 'event');
                }

                // 開始遊戲
                gameManager.startGame();
            } else {
                client.send("error", { message: "Not all players are ready" });
            }
        });

        // 玩家移動向量（新的基於速度的移動系統）
        this.room.onMessage("playerMoveVector", (client, message) => {
            if (!gameManager.isPlaying) return;
            battleSystem.handlePlayerMoveVector(client, message.vx, message.vy);
        });

        // 玩家移動（舊版本，保留向後兼容）
        this.room.onMessage("playerMove", (client, message) => {
            if (!gameManager.isPlaying) return;
            battleSystem.handlePlayerMove(client, message.x, message.y);
        });

        // 玩家攻擊
        this.room.onMessage("playerAttack", (client, message) => {
            if (!gameManager.isPlaying) return;
            battleSystem.handlePlayerAttack(client, message.targetX, message.targetY);
        });
    }

    /**
     * 統一戰報系統
     */
    sendBattleLog(message: string, category: 'damage' | 'death' | 'kill' | 'heal' | 'event' = 'event'): void {
        console.log(`🎯 [${category}] ${message}`);
        this.room.broadcast("battleLog", {
            message,
            category,
            timestamp: Date.now()
        });
    }

    /**
     * 廣播錯誤消息
     */
    broadcastError(message: string, targetClient?: Client): void {
        if (targetClient) {
            targetClient.send("error", { message });
        } else {
            this.room.broadcast("error", { message });
        }
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
     * 通知其他玩家有新玩家加入
     */
    notifyPlayerJoined(client: Client, playerName: string, characterId: number): void {
        this.room.broadcast("playerJoined", {
            playerId: client.sessionId,
            playerName: playerName,
            characterId: characterId,
        }, { except: client });
    }

    /**
     * 通知其他玩家有玩家離開
     */
    notifyPlayerLeft(playerId: string, playerName: string): void {
        this.room.broadcast("playerLeft", {
            playerId: playerId,
            playerName: playerName,
        });
    }

    /**
     * 通知新主機
     */
    notifyNewHost(newHostId: string): void {
        this.room.broadcast("newHost", { newHostId: newHostId });
    }

    /**
     * 通知玩家準備狀態改變
     */
    notifyPlayerReadyChanged(playerId: string, isReady: boolean): void {
        this.room.broadcast("playerReadyChanged", {
            playerId: playerId,
            isReady: isReady,
        });
    }

    /**
     * 清理消息處理器
     */
    cleanup(): void {
        // 清理任何需要釋放的資源
    }
}
