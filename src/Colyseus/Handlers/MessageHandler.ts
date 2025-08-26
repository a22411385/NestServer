import { Room, Client } from "colyseus";
import { GameRoomState, UnitType } from "../Schema/GameState";
import { PlayerManager } from "../Managers/PlayerManager";
import { GameManager } from "../Managers/GameManager";
import { BattleSystem } from "../Systems/BattleSystem";
import { ServerHero } from "../Schema/Unit/Hero";
import { GameRoom } from "../Rooms/GameRoom";
import { Vector2 } from "../Schema/Unit/GameUnit";

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
    async MessageHandler(client: Client, type: string | number, message: any) {
        const playerManager = this.room.playerManager;
        const gameManager = this.room.gameManager;
        const battleSystem = this.room.battleSystem;
        const unitManager = this.room.unitManager;

        try {
            switch (type) {
                // 玩家準備/取消準備
                case "toggleReady":
                    if (gameManager.isPlaying) return;
                    playerManager.togglePlayerReady(client);
                    break;
                case "startGame":
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
                                let hero = unit as ServerHero
                                this.sendBattleLog(`${hero.name} 加入戰場 (Lv.${hero.level}, HP:${hero.hp}/${hero.maxHp})`, 'event');
                            }
                        }
                        gameManager.startGame();
                    } else {
                        client.send("error", { message: "Not all players are ready" });
                    }
                    break;

                // 玩家移動向量
                case "playerMoveVector":
                    if (!gameManager.isPlaying) return;

                    //檢查vx vy是否為合法數值
                    if (typeof message.vx !== "number" || typeof message.vy !== "number") {
                        client.send("error", { message: "Invalid movement vector" });
                        return;
                    }

                    this.room.movementSystem.handlePlayerMoveVector(client, message.vx, message.vy);
                    break;

                // 玩家面向角度（滑鼠/手柄控制）
                case "playerFacingDirection":
                    if (!gameManager.isPlaying) return;
                    this.handlePlayerFacingDirection(client, message.facingDirection);
                    break;
                case "updateGameState":
                    if (!gameManager.isPlaying) return;
                    client.send('updateGameState', {
                        state: this.room.state.gameCore,
                        position: this.room.movementSystem.getAllUnitPositions()
                    });
                    break;

                case "allocate_stat":
                    unitManager.handleStatAllocation(client, message);
                    break;

                case "reset_stats":
                    unitManager.handleStatReset(client);
                    break;

                // 波次控制命令
                case "start_wave":
                    if (!playerManager.isPlayerHost(client)) {
                        client.send("error", { message: "Only host can control waves" });
                        return;
                    }
                    const waveNumber = message.waveNumber || undefined;
                    const started = battleSystem.startNewWave(waveNumber);
                    if (started) {
                        this.sendBattleLog(`波次 ${battleSystem.getWaveManager().getCurrentWaveNumber()} 開始！`, 'event');
                    } else {
                        this.sendBattleLog('無法開始新波次', 'event');
                    }
                    break;

                case "wave_status":
                    const waveStats = battleSystem.getWaveManager().getWaveStats();
                    client.send("wave_status", waveStats);
                    break;

                // 同步狀態檢查
                case "sync_check":
                    if (!playerManager.isPlayerHost(client)) {
                        client.send("error", { message: "Only host can check sync status" });
                        return;
                    }

                    if (battleSystem?.getWaveManager()) {
                        // 導入同步檢查工具（需要在頂部導入）
                        // GameStateSync.checkSync(this.state.gameCore, battleSystem.getWaveManager());

                        const syncReport = {
                            gameCore: {
                                wave: this.state.gameCore.waveNumber,
                                stage: this.state.gameCore.status,
                                timeRemaining: this.state.gameCore.roundTime
                            },
                            waveManager: battleSystem.getWaveManager().getWaveStats(),
                            timestamp: Date.now()
                        };

                        console.log("🔄 Sync check requested:", syncReport);
                        client.send("sync_report", syncReport);
                    }
                    break;

                // 🆕 敵人行為調試
                case "enemy_debug":
                    const enemies: any[] = [];
                    const coordinationStats = battleSystem ?
                        battleSystem.getEnemyCoordination()?.getCoordinationStats(
                            Array.from(this.state.allUnits.values())
                                .filter(unit => unit.type === UnitType.enemy && !unit.isDead) as any[]
                        ) : null;

                    for (const [, unit] of this.state.allUnits) {
                        if (unit.type === UnitType.enemy && !unit.isDead) {
                            const enemy = unit as any;
                            enemies.push({
                                id: enemy.id,
                                position: { x: enemy.position.x, y: enemy.position.y },
                                stuckCounter: enemy.stuckCounter || 0,
                                groupPriority: enemy.groupPriority || 0,
                                aiState: enemy.getAIState?.() || 'unknown',
                                hp: enemy.hp,
                                maxHp: enemy.maxHp
                            });
                        }
                    }

                    client.send('enemy_debug_response', {
                        enemies: enemies,
                        coordinationStats: coordinationStats,
                        timestamp: Date.now()
                    });
                    break;

                default:
                    // 未知的消息類型
                    console.warn(`Unknown message type: ${type}`);
                    break;
            }
        } catch (error) {
            console.error(`Error handling message ${type}:`, error);
            client.send("error", { message: "Server error occurred" });
        }
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
                    let hero = unit as ServerHero;
                    hero.position = new Vector2(100, 100);
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
     * 處理玩家面向角度（滑鼠/手柄控制）
     */
    private handlePlayerFacingDirection(client: Client, facingDirection: number): void {
        const hero = this.state.getHero(client.sessionId);
        if (hero) {
            hero.facingDirection = facingDirection;
        }
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
