import { Delayed } from "colyseus";
import { GameRoomState } from "../Schema/GameState";
import { delay } from "../../Util/Utils";
import { GameRoom } from "../Rooms/GameRoom";
import { BattleSystem } from "../Systems/BattleSystem";
import { MovementSystem } from "../Systems/MovemnetSystem";

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
    private allUnitSyncPos: Delayed | null = null;
    private moveTick: Delayed | null = null;

    private battleSystem: BattleSystem;
    private movementSystem: MovementSystem;
    private gameTime: number = 0;

    constructor(room: GameRoom) {
        this.room = room;
        this.state = room.state;
        this.battleSystem = room.battleSystem;
        this.movementSystem = room.movementSystem;
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
        this.state.state = "playing";

        // 初始化遊戲核心狀態
        this.state.gameCore.waveNumber = 1;
        this.state.gameCore.status = 'prepare';
        this.state.gameCore.aliveHeroes = this.state.players.size;

        // 開始遊戲循環
        this.room.clock.clear();
        this.room.clock.start();

        // 每5秒更新場上所有單位位置
        let system = this.movementSystem;
        //  let fn = this.movementSystem.forceUpdateAllPositions.bind(this);
        this.allUnitSyncPos = this.room.clock.setInterval(() => {

            system.forceUpdateAllPositions();

        }, 5000);

        // 每次移動的單位 - 改進版本（包含速度信息）
        this.moveTick = this.room.clock.setInterval(() => {

            //遊戲每幀推進
            this.room.handleGameTick();

            //單位移動推進
            this.movementSystem.MoveAllUnit();
        }, 5000);

        // 每次移動的單位 - 改進版本（包含速度信息）
        this.moveTick = this.room.clock.setInterval(() => {

            //遊戲每幀推進
            this.room.handleGameTick();

            //單位移動推進
            this.movementSystem.MoveAllUnit();
            /*
              // const enrichedMoveData: Record<string, { vx: number, vy: number, speed: number }> = {};

            if (Object.keys(this.moveData).length > 0) {
                // 🎯 首先更新服務端位置（使用與客戶端相同的邏輯）

                // 🔧 為每個移動數據添加速度信息
                this.setUnitMoveVector(this.moveData);
                for (const [unitId, velocity] of Object.entries(this.moveData)) {
                    const speed = this.getUnitSpeed(unitId);
                    enrichedMoveData[unitId] = {
                        vx: velocity.vx,
                        vy: velocity.vy,
                        speed: speed
                    };


                    const unit = this.state.allUnits.get(unitId);

                    if (unit) {
                        //console.log(`🎯 unit ${unitId} velocity: (${unit.vx.toFixed(2)}, ${unit.vy.toFixed(2)})`);
                        unit.vx = velocity.vx;
                        unit.vy = velocity.vy;
                        unit.speed = speed; // 更新單位速度
                    }
                }

                this.moveData = {};

            }


            this.room.broadcast('move-tick', {
                frameId: this.serverFrame,
                moveData: enrichedMoveData
            });*/
            this.state.gameCore.gameframe++;
        }, ONE_TICK_TIME);

        if (!this.state.isTestMode)
            // Waves 流程
            this.gameFlow();

        console.log(`✅ Game started - Wave: ${this.state.gameCore.waveNumber}, Heroes: ${this.state.getAllHeroes().size}`);
    }

    /**
     * 遊戲主流程
     */
    private async gameFlow(): Promise<void> {
        while (this.state.state === 'playing') {
            // 檢查是否所有玩家都死亡 - 這個檢查由外部處理

            // 波次開始準備
            this.broadcastBattleLog(`第 ${this.state.gameCore.waveNumber} 波準備中...`, 'event');
            this.state.gameCore.status = 'prepare';
            await delay(3);

            // 波次開始
            this.broadcastBattleLog(`第 ${this.state.gameCore.waveNumber} 波開始！殭屍來襲！`, 'event');
            this.state.gameCore.status = 'battle';

            // 通知外部開始生成敵人 (每秒生成一隻)
            if (this.battleSystem) {
                this.battleSystem.startEnemySpawning();
            }

            // 每波30秒
            await delay(30);

            // 通知外部停止生成敵人
            if (this.battleSystem) {
                this.battleSystem.stopEnemySpawning();
            }

            // 波次結束
            this.broadcastBattleLog(`第 ${this.state.gameCore.waveNumber} 波結束，進入休整時間`, 'event');
            this.state.gameCore.status = 'rest';

            // 清除場上所有敵人
            this.state.removeAllEnemy();

            // 修整時間10秒
            await delay(10);

            this.state.gameCore.waveNumber++;
            if (this.state.gameCore.waveNumber > 50) {
                this.broadcastBattleLog("恭喜！您成功完成了所有 50 波挑戰！", 'event');
                this.endGame("waveComplete");
                return;
            }
        }
    }


    /**
     * 結束遊戲
     */
    private endGame(reason: "allPlayersDead" | "waveComplete"): void {
        console.log(`Game ended: ${reason}`);
        this.state.state = 'waiting';
        this.state.gameCore.status = 'prepare';

        const finalWave = this.state.gameCore.waveNumber;
        const survivedTime = this.gameTime;

        this.state.gameCore.waveNumber = 0;

        // 停止所有計時器
        this.stopGameLoop();

        // 廣播遊戲結束
        this.room.broadcast("gameOver", {
            reason: reason,
            finalWave: finalWave,
            survivedTime: survivedTime
        });
    }

    /**
     * 停止遊戲循環
     */
    public stopGameLoop(): void {
        // 停止所有計時器
        if (this.gameLoop) {
            this.gameLoop.clear();
            this.gameLoop = null;
        }
        if (this.allUnitSyncPos) {
            this.allUnitSyncPos.clear();
            this.allUnitSyncPos = null;
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
