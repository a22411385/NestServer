import { Room, Client } from "colyseus";
import { GameRoomState, UnitType } from "../Schema/GameState";
import { PlayerManager } from "../Managers/PlayerManager";
import { GameManager } from "../Managers/GameManager";
import { BattleSystem } from "../Systems/BattleSystem";
import { Hero } from "../Schema/Unit/Hero";
import { GameRoom } from "../Rooms/GameRoom";

/**
 * 消息處理器 - 統一處理所有 Colyseus 客戶端消息和廣播
 */
export class MessageHandler {
    private room: GameRoom;
    private state: GameRoomState;

    constructor(room: GameRoom) {
        this.room = room;
        this.state = room.state;
    }

    /**
     * 設置所有消息處理器
     */
    setupMessageHandlers(): void {
        const playerManager = this.room.playerManager;
        const gameManager = this.room.gameManager;
        const battleSystem = this.room.battleSystem;

        // 玩家準備/取消準備
        this.room.onMessage("toggleReady", (client, message) => {
            if (gameManager.isPlaying) return;
            playerManager.togglePlayerReady(client);

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
                for (const [, unit] of this.state.allUnits) {
                    if (unit.type == UnitType.hero) {
                        let hero = unit as Hero
                        this.sendBattleLog(`${hero.name} 加入戰場 (Lv.${hero.level}, HP:${hero.hp}/${hero.maxHp})`, 'event');
                    }
                }
                gameManager.startGame();


            } else {
                client.send("error", { message: "Not all players are ready" });
            }
        });

        // 玩家移動向量（新的基於速度的移動系統）
        this.room.onMessage("playerMoveVector", (client, message) => {
            if (!gameManager.isPlaying) return;
            this.room.movementSystem.handlePlayerMoveVector(client, message.vx, message.vy);
        });

        // 玩家攻擊
        this.room.onMessage("playerAttack", (client, message) => {
            if (!gameManager.isPlaying && !this.state.isTestMode) return;
            battleSystem.handlePlayerAttack(client, message.targetX, message.targetY);
        });

        this.room.onMessage('updateGameState', (client, message) => {
            if (!gameManager.isPlaying) return;
            client.send('updateGameState', {
                state: this.room.state.gameCore,
                position: this.room.movementSystem.getAllUnitPositions()
            });
        });

        // === 測試房專用指令 ===
        this.setupTestRoomCommands(battleSystem, playerManager);
    }

    /**
     * 設置測試房專用指令
     */
    private setupTestRoomCommands(battleSystem: any, playerManager: any): void {
        // 只有測試房才啟用這些指令
        if (!this.state.isTestMode) return;

        // 生成單隻怪物
        this.room.onMessage("testSpawnEnemy", (client, message) => {
            if (!playerManager.isPlayerHost(client)) {
                client.send("error", { message: "只有房主可以控制測試功能" });
                return;
            }

            const spawnX = message.x || 500;
            const spawnY = message.y || 400;
            const enemyType = message.type || 1;

            const enemyId = battleSystem.spawnSingleEnemy(spawnX, spawnY, enemyType);
            this.sendBattleLog(`測試生成敵人 ${enemyId} 於 (${spawnX}, ${spawnY})`, 'event');
        });

        // 清除所有怪物
        this.room.onMessage("testClearEnemies", (client, message) => {
            if (!playerManager.isPlayerHost(client)) {
                client.send("error", { message: "只有房主可以控制測試功能" });
                return;
            }

            this.state.removeAllEnemy();
            this.sendBattleLog(`清除了場上敵人`, 'event');
        });

        // 重置所有狀態
        this.room.onMessage("testResetAll", (client, message) => {
            if (!playerManager.isPlayerHost(client)) {
                client.send("error", { message: "只有房主可以控制測試功能" });
                return;
            }

            // 重置敵人
            this.state.removeAllEnemy();

            // 重置所有玩家Hero到初始狀態
            for (let [uid, unit] of this.state.allUnits) {
                if (unit.type == UnitType.hero) {
                    let hero = unit as Hero;
                    hero.x = 100;
                    hero.y = 100;
                    hero.hp = hero.maxHp;
                    hero.invincibleRemaining = 0;
                }

            }

            this.sendBattleLog("已重置所有測試狀態", 'event');
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
     * 通知新主機
     */
    notifyNewHost(newHostId: string): void {
        this.room.broadcast("newHost", { newHostId: newHostId });
    }

    /**
     * 清理消息處理器
     */
    cleanup(): void {
        // 清理任何需要釋放的資源
    }
}
