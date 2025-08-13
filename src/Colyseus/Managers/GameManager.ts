import { Room, Delayed } from "colyseus";
import { GameRoomState } from "../Schema/GameState";
import { delay } from "../../Util/Utils";

const ONE_TICK_TIME = 100;
/**
 * 🎯 服務端移動配置 - 與客戶端保持一致
 */
const MOVEMENT_CONFIG = {
    MOVEMENT_SCALE: 10,        // 移動縮放係數，與客戶端保持一致
    FIXED_DELTA: 1 / 60        // 固定 delta time (60 FPS)
};

// 移動向量介面
interface MoveVector {
    vx: number;
    vy: number;
}

/**
 * 遊戲管理器 - 負責遊戲流程控制、波次管理和遊戲狀態
 */
export class GameManager {

    private room: Room<GameRoomState>;
    private state: GameRoomState;
    private gameLoop: Delayed | null = null;
    private allUnitSyncPos: Delayed | null = null;
    private moveTick: Delayed | null = null;
    private moveData: Record<string, MoveVector> = {};
    private battleSystem: any = null; // 會在初始化時設置
    private serverFrame = 0;

    constructor(room: Room<GameRoomState>) {
        this.room = room;
        this.state = room.state;
    }


    /**
     * 設置 BattleSystem 引用
     */
    public setBattleSystem(battleSystem: any): void {
        this.battleSystem = battleSystem;
    }

    /**
 * 添加單位移動數據到下次同步
 */
    public addMoveData(unitId: string, velocity: MoveVector): void {
        this.moveData[unitId] = velocity;
    }
    /**
     * 開始遊戲
     */
    public startGame(): void {
        console.log(`🎮 Game started in room ${this.room.roomId}`);
        this.state.state = "playing";

        // 初始化遊戲核心狀態
        this.state.gameCore.waveNumber = 1;
        this.state.gameCore.gameTime = 0;
        this.state.gameCore.status = 'prepare';
        this.state.gameCore.aliveHeroes = this.state.players.size;

        // 開始遊戲循環
        this.room.clock.clear();
        this.room.clock.start();

        // 每5秒更新場上所有單位位置
        this.allUnitSyncPos = this.room.clock.setInterval(() => {
            const allPositions = this.getAllUnitPositions();
            this.room.broadcast('syncPosition', allPositions);

        }, 5000);

        // 每次移動的單位 - 改進版本（包含速度信息）
        this.moveTick = this.room.clock.setInterval(() => {
            (this.room as any).handleGameTick();
            const enrichedMoveData: Record<string, { vx: number, vy: number, speed: number }> = {};

            if (Object.keys(this.moveData).length > 0) {
                // 🎯 首先更新服務端位置（使用與客戶端相同的邏輯）

                // 🔧 為每個移動數據添加速度信息
                this.updateServerPositions(this.moveData);
                for (const [unitId, velocity] of Object.entries(this.moveData)) {
                    const speed = this.getUnitSpeed(unitId);
                    enrichedMoveData[unitId] = {
                        vx: velocity.vx,
                        vy: velocity.vy,
                        speed: speed
                    };
                }
                this.moveData = {};

            }



            this.room.broadcast('move-tick', {
                frameId: this.serverFrame,
                moveData: enrichedMoveData
            });
            this.serverFrame++;
        }, ONE_TICK_TIME);

        if (!this.state.isTestMode)
            // Waves 流程
            this.gameFlow();

        console.log(`✅ Game started - Wave: ${this.state.gameCore.waveNumber}, Heroes: ${this.state.heroes.size}`);
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
        const survivedTime = this.state.gameCore.gameTime;

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
        this.state.gameCore.gameTime += dt;
        return { deltaTime: dt, currentTime };
    }
    /**
     * 獲取所有單位的位置（用於強制同步）
     */
    private getAllUnitPositions(): Record<string, { x: number, y: number }> {
        const positions: Record<string, { x: number, y: number }> = {};

        // 收集所有Heroes位置 - 🔧 使用hero.id而不是heroId
        for (const [heroId, hero] of this.state.heroes) {
            positions[hero.id] = { x: hero.x, y: hero.y };
        }

        // 收集所有Enemies位置 - 🔧 使用enemy.id而不是enemyId
        for (const [enemyId, enemy] of this.state.enemySnapshots) {
            if (!enemy.isDead) {
                positions[enemy.id] = { x: enemy.x, y: enemy.y };
            }
        }

        return positions;
    }

    /**
     * 🔧 獲取單位移動速度（從服務端狀態）
     */
    private getUnitSpeed(unitId: string): number {
        // 檢查Heroes
        for (const [heroId, hero] of this.state.heroes) {
            if (heroId === unitId || hero.id === unitId) {
                return hero.speed || 5; // 預設Hero速度
            }
        }

        // 檢查Enemies
        for (const [enemyId, enemy] of this.state.enemySnapshots) {
            if (enemyId === unitId || enemy.id === unitId) {
                return enemy.speed || 3; // 預設Enemy速度
            }
        }

        console.warn(`⚠️ GameManager: No speed found for unit ${unitId}`);
        return 1; // 預設速度
    }

    /**
     * 🎯 更新所有單位位置
     */
    private updateServerPositions(_data: Record<string, MoveVector>): void {
        const deltaTime = MOVEMENT_CONFIG.FIXED_DELTA;

        // 更新所有有移動向量的單位
        for (let i in _data) {
            let hero = this.state.heroes.get(i)
            let unit = this.state.state.get(i)
        }
    }

    /**
     * 🎯 應用移動到服務端單位 - 與客戶端邏輯完全一致
     */
    private applyMovementToServerUnit(unitId: string, velocity: MoveVector, deltaTime: number): void {
        // 獲取單位速度
        const speed = this.getUnitSpeed(unitId);

        // 使用與客戶端相同的移動計算公式
        const moveDistance = speed * MOVEMENT_CONFIG.MOVEMENT_SCALE;
        const deltaX = velocity.vx * moveDistance;
        const deltaY = velocity.vy * moveDistance;

        let updated = false;

        // 更新Heroes位置
        for (const [heroId, hero] of this.state.heroes) {
            if (heroId === unitId || hero.id === unitId) {
                const oldX = hero.x;
                const oldY = hero.y;
                hero.x += deltaX;
                hero.y += deltaY;
                // 確保在世界邊界內
                hero.x = Math.max(-500, Math.min(500, hero.x));
                hero.y = Math.max(-500, Math.min(500, hero.y));
                console.log(`🎯 Server updated Hero ${unitId}: (${oldX.toFixed(1)},${oldY.toFixed(1)}) → (${hero.x.toFixed(1)},${hero.y.toFixed(1)}) delta:(${deltaX.toFixed(2)},${deltaY.toFixed(2)})`);
                updated = true;
                return;
            }
        }

        // 更新Enemies位置
        for (const [enemyId, enemy] of this.state.enemySnapshots) {
            if (enemyId === unitId || enemy.id === unitId) {
                const oldX = enemy.x;
                const oldY = enemy.y;
                enemy.x += deltaX;
                enemy.y += deltaY;
                // 確保在世界邊界內
                enemy.x = Math.max(-500, Math.min(500, enemy.x));
                enemy.y = Math.max(-500, Math.min(500, enemy.y));
                console.log(`🎯 Server updated Enemy ${unitId}: (${oldX.toFixed(1)},${oldY.toFixed(1)}) → (${enemy.x.toFixed(1)},${enemy.y.toFixed(1)}) delta:(${deltaX.toFixed(2)},${deltaY.toFixed(2)})`);
                updated = true;
                return;
            }
        }

        if (!updated) {
            console.warn(`⚠️ Could not find unit ${unitId} to update position`);
        }
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
        return this.state.gameCore.gameTime;
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
