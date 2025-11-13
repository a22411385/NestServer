import { Delayed } from "colyseus";
import { RoomStateType, GameRoomState } from "../../Colyseus/Schema/GameState";
import { GameRoom } from "../../Colyseus/Rooms/GameRoom";
import { EnemySystem } from "../Systems/Battle/EnemySystem";
import { MovementSystem } from "../Systems/Battle/MovemnetSystem";
import { LobbyRoomBus } from "../../Colyseus/Rooms/LobbyRoom";
import { UnitType } from "../../Colyseus/Schema/GameState";
import { WeaponInstanceManager } from "./WeaponInstanceManager";
import { PlayerManager } from "./PlayerManager";

const RoundTimeSetting = {
    prepare: 3,
    battle: 30,
    rest: 10
}

const ONE_TICK_TIME = 133;
/**
 * 🎯 服務端移動配置 - 與客戶端保持一致
 */

/**
 * 遊戲管理器 - 負責遊戲流程控制、波次管理和遊戲狀態
 */
export class GameManager {

    private room: GameRoom;
    private state: GameRoomState;
    private gameLoop: Delayed | null = null;
    private roundTime: Delayed | null = null;
    private moveTick: Delayed | null = null;

    private enemySystem: EnemySystem;
    private movementSystem: MovementSystem;
    private playerManager: PlayerManager; // 🆕 添加 PlayerManager 引用
    private gameTime: number = 0;

    constructor(room: GameRoom) {
        this.room = room;
        this.state = room.state;
        this.enemySystem = room.enemySystem;
        this.movementSystem = room.movementSystem;
        this.playerManager = room.playerManager; // 🆕 獲取 PlayerManager 引用

        // 🆕 初始化武器實例管理器
        WeaponInstanceManager.initialize();
        console.log("🔧 武器實例管理器已初始化");
    }

    public setRoomState(state: RoomStateType) {
        this.state.state = state;
        LobbyRoomBus.emit("roomStateChanged", { roomId: this.room.roomId, state });
    }

    /**
     * 設置 EnemySystem 引用
     */
    public setEnemySystem(enemySystem: any): void {
        this.enemySystem = enemySystem;
    }

    /**
     * 開始遊戲
     */
    public startGame(): void {
        console.log(`🎮 Game started in room ${this.room.roomId}`);
        this.setRoomState("playing");

        // 🆕 初始化所有玩家的 Hero 單位
        this.playerManager.initializeAllHeroes();

        // 初始化遊戲核心狀態
        this.state.gameCore.waveNumber = 1;
        this.state.gameCore.status = 'prepare';
        this.state.gameCore.aliveHeroes = this.state.players.size;

        // 開始遊戲循環
        this.room.clock.clear();
        this.room.clock.start();
        this.roundTime = this.room.clock.setInterval(() => {

            if (this.state.gameCore.roundTime > 0)
                this.state.gameCore.roundTime--;

        }, 1000)
        this.moveTick = this.room.clock.setInterval(() => {

            //遊戲每幀推進
            this.room.handleGameTick();

            //單位移動推進
            this.movementSystem.MoveAllUnit();

        }, ONE_TICK_TIME);

        if (!this.state.isTestMode) {
            // 配置並啟動 WaveManager 的遊戲流程
            this.setupWaveManagerFlow();
        } else {
            // 🆕 測試模式：生成木樁殭屍
            this.spawnTestDummies();
        }

        console.log(`✅ Game started - Wave: ${this.state.gameCore.waveNumber}, Heroes: ${this.state.getAllHeroes().size}`);
    }

    /**
     * 🆕 測試模式：生成木樁殭屍
     */
    private spawnTestDummies(): void {
        // 從環境變量讀取配置
        const testDummyHP = parseInt(process.env.TEST_DUMMY_HP || '999999');
        const testDummyCount = 2

        // 在玩家前方生成木樁
        const heroes = Array.from(this.state.getAllHeroes().values());
        if (heroes.length === 0) {
            console.warn('⚠️ 沒有玩家，無法生成測試木樁');
            return;
        }

        const firstHero = heroes[0];
        const heroX = firstHero.position.x;
        const heroY = firstHero.position.y;

        // 在英雄右側500距離處生成木樁，垂直排列
        for (let i = 0; i < testDummyCount; i++) {
            const offsetX = 500; // 距離英雄500像素
            const offsetY = (i - Math.floor(testDummyCount / 2)) * 50; // 垂直間隔100px

            const dummyX = heroX + offsetX;
            const dummyY = heroY + offsetY;

            console.log(`🎯 木樁 ${i}: 英雄位置(${heroX}, ${heroY}) + 偏移(${offsetX}, ${offsetY}) = 計算位置(${dummyX}, ${dummyY})`);

            this.enemySystem.spawnTestDummy(dummyX, dummyY, testDummyHP);
        }

        console.log(`✅ 已生成 ${testDummyCount} 個測試木樁 (HP=${testDummyHP})`);
    }

    /**
     * 配置 WaveManager 流程
     */
    private setupWaveManagerFlow(): void {
        if (!this.enemySystem || !this.enemySystem.getWaveManager()) {
            console.warn('⚠️ EnemySystem or WaveManager not available');
            return;
        }

        const waveManager = this.enemySystem.getWaveManager();

        // 設置流程配置
        waveManager.setFlowConfig({
            prepareTime: RoundTimeSetting.prepare,
            battleTime: RoundTimeSetting.battle,
            restTime: RoundTimeSetting.rest,
            maxWaves: 50
        });

        // 設置回調函數
        waveManager.setCallbacks({
            updateGameCore: (status: string, roundTime: number, waveNumber: number) => {
                this.state.gameCore.status = status as any; // 類型轉換
                this.state.gameCore.roundTime = roundTime;
                this.state.gameCore.waveNumber = waveNumber;
            },
            broadcastLog: (message: string, category?: string) => {
                const validCategory = (category === 'damage' || category === 'death' ||
                    category === 'kill' || category === 'heal' ||
                    category === 'event') ? category : 'event';
                // 🔧 使用統一的戰鬥日誌系統
                this.room.combatSystem.getBattleLogSystem().sendBattleLog(message, validCategory);
            },
            endGame: (reason: string) => {
                this.endGame(reason === "waveComplete" ? "waveComplete" : "allPlayersDead");
            },
            removeAllEnemies: () => {
                this.state.removeAllEnemy();
            }
        });

        // 啟動遊戲流程
        console.log('🚀 Starting WaveManager game flow');
        waveManager.gameFlow().catch((error) => {
            console.error('❌ WaveManager flow error:', error);
            this.endGame("allPlayersDead");
        });
    }
    /**
     * 結束遊戲
     */
    private endGame(reason: "allPlayersDead" | "waveComplete"): void {

        this.stopGameLoop();
        console.log(`Game ended: ${reason}`);
        this.setRoomState("waiting");
        this.state.gameCore.status = 'prepare';

        const finalWave = this.state.gameCore.waveNumber;
        const survivedTime = this.gameTime;

        // 清理遊戲狀態
        this.cleanupGameState();

        this.state.gameCore.waveNumber = 0;

        // 廣播遊戲結束
        this.room.broadcast("gameOver", {
            reason: reason,
            finalWave: finalWave,
            survivedTime: survivedTime
        });
    }

    /**
     * 清理遊戲狀態
     */
    private cleanupGameState(): void {
        console.log('🧹 Cleaning up game state...');

        // 清理所有敵人
        const enemiesToRemove = [];
        for (const [id, unit] of this.state.allUnits) {
            if (unit.type === UnitType.enemy) {
                enemiesToRemove.push(id);
            }
        }

        enemiesToRemove.forEach(id => {
            this.state.allUnits.delete(id);
        });

        // 清理所有子彈
        this.state.bullets.clear();

        // 重置英雄狀態
        for (const [, hero] of this.state.getAllHeroes()) {
            hero.isDead = false;
            hero.hp = hero.maxHp; // 恢復滿血
        }

        console.log(`🧹 Cleanup complete: removed ${enemiesToRemove.length} enemies`);
    }

    /**
     * 停止遊戲循環
     */
    public stopGameLoop(): void {
        // 停止 WaveManager
        if (this.enemySystem) {
            const waveManager = this.enemySystem.getWaveManager();
            if (waveManager) {
                console.log('🛑 Stopping WaveManager...');
                waveManager.stopGameFlow();
            }
        }

        // 停止所有計時器
        if (this.gameLoop) {
            this.gameLoop.clear();
            this.gameLoop = null;
        }
        if (this.roundTime) {
            this.roundTime.clear();
            this.roundTime = null;
        }
        if (this.moveTick) {
            this.moveTick.clear();
            this.moveTick = null;
        }

        this.room.clock.stop();
        this.room.clock.clear();
    }

    /**
     * 遊戲每幀更新
     */
    public updateGameTick(): { deltaTime: number; currentTime: number } {
        const dt = ONE_TICK_TIME; // ms per tick (6 FPS)
        const currentTime = Date.now();
        // 更新遊戲時間
        this.gameTime += dt;
        return { deltaTime: dt, currentTime };
    }


    /**
     * 檢查遊戲是否正在進行
     */
    get isPlaying(): boolean {
        return this.state.state === 'playing';
    }

    /**
     * 獲取當前波數
     */
    getCurrentWave(): number {
        return this.state.gameCore.waveNumber;
    }

    /**
     * 獲取遊戲時間
     */
    getGameTime(): number {
        return this.gameTime;
    }

    /**
     * 獲取遊戲狀態
     */
    getGameStatus(): string {
        return this.state.gameCore.status;
    }

    /**
     * 強制結束遊戲（由於玩家全部死亡）
     */
    forceEndGame(): void {
        this.endGame("allPlayersDead");
    }
}
