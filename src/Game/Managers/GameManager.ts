import { Delayed } from "colyseus";
import { RoomStateType, GameRoomState } from "../../Colyseus/Schema/GameState";
import { delay } from "../../Util/Utils";
import { GameRoom } from "../../Colyseus/Rooms/GameRoom";
import { BattleSystem } from "../Systems/BattleSystem";
import { MovementSystem } from "../Systems/MovemnetSystem";
import { LobbyRoomBus } from "../../Colyseus/Rooms/LobbyRoom";
import { UnitType } from "../../Colyseus/Schema/GameState";
import { WeaponInstanceManager } from "./WeaponInstanceManager";

const RoundTimeSetting = {
    prepare: 3,
    battle: 30,
    rest: 10
}

const ONE_TICK_TIME = 100;
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

    private battleSystem: BattleSystem;
    private movementSystem: MovementSystem;
    private gameTime: number = 0;

    constructor(room: GameRoom) {
        this.room = room;
        this.state = room.state;
        this.battleSystem = room.battleSystem;
        this.movementSystem = room.movementSystem;

        // 🆕 初始化武器實例管理器
        WeaponInstanceManager.initialize();
        console.log("🔧 武器實例管理器已初始化");
    }

    public setRoomState(state: RoomStateType) {
        this.state.state = state;
        LobbyRoomBus.emit("roomStateChanged", { roomId: this.room.roomId, state });
    }

    /**
     * 設置 BattleSystem 引用
     */
    public setBattleSystem(battleSystem: any): void {
        this.battleSystem = battleSystem;
    }

    /**
     * 開始遊戲
     */
    public startGame(): void {
        console.log(`🎮 Game started in room ${this.room.roomId}`);
        this.setRoomState("playing");
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
        }

        console.log(`✅ Game started - Wave: ${this.state.gameCore.waveNumber}, Heroes: ${this.state.getAllHeroes().size}`);
    }

    /**
     * 配置 WaveManager 流程
     */
    private setupWaveManagerFlow(): void {
        if (!this.battleSystem || !this.battleSystem.getWaveManager()) {
            console.warn('⚠️ BattleSystem or WaveManager not available');
            return;
        }

        const waveManager = this.battleSystem.getWaveManager();

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
                this.broadcastBattleLog(message, validCategory);
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
        for (const [id, unit] of this.state.gameCore.allUnits) {
            if (unit.type === UnitType.enemy) {
                enemiesToRemove.push(id);
            }
        }

        enemiesToRemove.forEach(id => {
            this.state.gameCore.allUnits.delete(id);
        });

        // 清理所有子彈
        this.state.gameCore.bullets.clear();

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
        if (this.battleSystem) {
            const waveManager = this.battleSystem.getWaveManager();
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
     * 廣播戰報 - 暫時性方法，應該由外部 MessageHandler 處理
     */
    private broadcastBattleLog(message: string, category: 'damage' | 'death' | 'kill' | 'heal' | 'event' = 'event'): void {
        console.log(`🎯 [${category}] ${message}`);
        this.room.broadcast("battleLog", {
            message,
            category,
            timestamp: Date.now()
        });
    }

    /**
     * 強制結束遊戲（由於玩家全部死亡）
     */
    forceEndGame(): void {
        this.endGame("allPlayersDead");
    }
}
