import { Room, Client } from "colyseus";
import { GameRoomState, UnitType } from "../Schema/GameState"
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
        const unitManager = this.room.unitManager;
        const enemySystem = this.room.enemySystem; // 🔧 修正系統引用
        const combatSystem = this.room.combatSystem; // 🔧 添加戰鬥系統引用

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
                        combatSystem.getBattleLogSystem().sendBattleLog(`遊戲開始！共有 ${playerManager.getPlayerCount()} 名玩家參與戰鬥`, 'event');

                        // 發送玩家初始化戰報
                        for (const [, unit] of this.state.allUnits) {
                            if (unit.type == UnitType.hero) {
                                let hero = unit as ServerHero
                                combatSystem.getBattleLogSystem().sendBattleLog(`${hero.name} 加入戰場 (Lv.${hero.level}, HP:${hero.hp}/${hero.maxHp})`, 'event');
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
                    const started = enemySystem.startNewWave(waveNumber);
                    if (started) {
                        // 🔧 使用統一的戰鬥日誌系統
                        combatSystem.getBattleLogSystem().sendBattleLog(`波次 ${enemySystem.getWaveManager().getCurrentWaveNumber()} 開始！`, 'event');
                    } else {
                        combatSystem.getBattleLogSystem().sendBattleLog('無法開始新波次', 'event');
                    }
                    break;

                case "wave_status":
                    const waveStats = enemySystem.getWaveManager().getWaveStats();
                    client.send("wave_status", waveStats);
                    break;

                // 同步狀態檢查
                case "sync_check":
                    if (!playerManager.isPlayerHost(client)) {
                        client.send("error", { message: "Only host can check sync status" });
                        return;
                    }

                    if (enemySystem?.getWaveManager()) {
                        // 導入同步檢查工具（需要在頂部導入）
                        // GameStateSync.checkSync(this.state.gameCore, enemySystem.getWaveManager());

                        const syncReport = {
                            gameCore: {
                                wave: this.state.gameCore.waveNumber,
                                stage: this.state.gameCore.status,
                                timeRemaining: this.state.gameCore.roundTime
                            },
                            waveManager: enemySystem.getWaveManager().getWaveStats(),
                            timestamp: Date.now()
                        };

                        console.log("🔄 Sync check requested:", syncReport);
                        client.send("sync_report", syncReport);
                    }
                    break;

                // 🆕 敵人行為調試
                case "enemy_debug":
                    const enemies: any[] = [];
                    const coordinationStats = enemySystem ?
                        enemySystem.getEnemyCoordination()?.getCoordinationStats(
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

                // 測試命令 - 生成敵人
                case "testSpawnEnemy":
                    if (!this.state.isTestMode) {
                        client.send("error", { message: "測試功能僅在測試模式下可用" });
                        return;
                    }
                    if (!playerManager.isPlayerHost(client)) {
                        client.send("error", { message: "只有房主可以控制測試功能" });
                        return;
                    }
                    this.handleTestSpawnEnemy(client, message);
                    break;

                case "testClearEnemies":
                    if (!this.state.isTestMode) {
                        client.send("error", { message: "測試功能僅在測試模式下可用" });
                        return;
                    }
                    if (!playerManager.isPlayerHost(client)) {
                        client.send("error", { message: "只有房主可以控制測試功能" });
                        return;
                    }
                    this.handleTestClearEnemies(client);
                    break;

                case "testResetAll":
                    if (!this.state.isTestMode) {
                        client.send("error", { message: "測試功能僅在測試模式下可用" });
                        return;
                    }
                    if (!playerManager.isPlayerHost(client)) {
                        client.send("error", { message: "只有房主可以控制測試功能" });
                        return;
                    }
                    this.handleTestResetAll(client);
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
     * 🧪 測試命令處理方法
     */
    private handleTestSpawnEnemy(client: Client, message: any): void {
        const spawnX = message.x || 500;
        const spawnY = message.y || 400;
        const enemyType = message.type || 1;

        const enemyId = this.room.enemySystem.spawnSingleEnemy(spawnX, spawnY, enemyType);
        this.room.combatSystem.getBattleLogSystem().sendBattleLog(
            `測試生成敵人 ${enemyId} 於 (${spawnX}, ${spawnY})`,
            'event'
        );
    }

    private handleTestClearEnemies(client: Client): void {
        this.state.removeAllEnemy();
        this.room.combatSystem.getBattleLogSystem().sendBattleLog(`清除了場上敵人`, 'event');
    }

    private handleTestResetAll(client: Client): void {
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

        this.room.combatSystem.getBattleLogSystem().sendBattleLog("已重置所有測試狀態", 'event');
    }

    /**
     * 🗂️ 消息驗證和路由方法
     */
    private validateMessage(type: string, message: any): boolean {
        // 基本的消息驗證邏輯
        if (!message || typeof message !== 'object') {
            return false;
        }
        return true;
    }

    private isGameCommand(type: string): boolean {
        const gameCommands = ['playerMoveVector', 'playerFacingDirection', 'updateGameState'];
        return gameCommands.includes(type);
    }

    private isAdminCommand(type: string): boolean {
        const adminCommands = ['startGame', 'start_wave', 'sync_check'];
        return adminCommands.includes(type);
    }

    private isTestCommand(type: string): boolean {
        return type.startsWith('test');
    }

    /**
     * 🔧 統一戰報系統 - 🚫 已棄用，請使用 combatSystem.getBattleLogSystem()
     */
    sendBattleLog(message: string, category: 'damage' | 'death' | 'kill' | 'heal' | 'event' = 'event'): void {
        // 重定向到統一的戰鬥日誌系統
        console.warn('⚠️ MessageHandler.sendBattleLog() 已棄用，請使用 combatSystem.getBattleLogSystem().sendBattleLog()');
        this.room.combatSystem.getBattleLogSystem().sendBattleLog(message, category);
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
