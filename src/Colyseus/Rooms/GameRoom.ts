import { Room, Client } from "colyseus";
import { GameRoomState as GameRoomState, GameCoreState, UnitType } from "../Schema/GameState";

// 引入新的管理器和系統
import { PlayerManager } from "../Managers/PlayerManager";
import { GameManager } from "../Managers/GameManager";
import { BattleSystem } from "../Systems/BattleSystem";
import { MessageHandler } from "../Handlers/MessageHandler";
import { Hero } from "../Schema/Unit/Hero";

export interface GameRoomOptions {
    roomName: string;
    maxPlayers: number;
    hostId: string;
    hostName: string;
    hostCharacterId: number;
    roomType?: "normal" | "test"; // 新增：房間類型
}

export class GameRoom extends Room<GameRoomState> {
    maxClients = 6;
    autoDispose = true;

    // 管理器實例
    private playerManager: PlayerManager;
    private gameManager: GameManager;
    private battleSystem: BattleSystem;
    private messageHandler: MessageHandler;

    get IsPlaying(): boolean {
        return this.gameManager.isPlaying;
    }

    onCreate(options: GameRoomOptions) {
        console.log(`GameRoom created: ${options.roomName} by ${options.hostName}, type: ${options.roomType || 'normal'}`);

        try {
            this.state = new GameRoomState();
            this.maxClients = options.maxPlayers;

            // 設置房間資訊
            this.state.roomName = options.roomName;
            this.state.maxPlayers = options.maxPlayers;
            this.state.state = "waiting";
            this.state.roomType = options.roomType || "normal"; // 設置房間類型
            this.state.isTestMode = options.roomType === "test"; // 設置測試模式

            // 初始化遊戲數據，避免 undefined
            this.state.gameCore = new GameCoreState;

            // 初始化管理器
            this.initializeManagers();

            // 設置消息處理器
            this.setupMessageHandlers();

            console.log(`GameRoom ${this.roomId} created successfully`);
        } catch (error) {
            console.error('Error creating GameRoom:', error);
            throw error;
        }
    }

    onJoin(client: Client, options: any, auth: any) {
        this.playerManager.handlePlayerJoin(client, options);
    }

    onLeave(client: Client, consented: boolean) {
        const newHostId = this.playerManager.handlePlayerLeave(client, consented);

        // 如果房間空了，停止遊戲循環
        if (this.playerManager.getPlayerCount() === 0) {
            this.gameManager.stopGameLoop();
        }
    }

    onDispose() {
        console.log(`GameRoom ${this.roomId} disposed`);
        this.gameManager.stopGameLoop();
        this.battleSystem.cleanup();
        this.messageHandler.cleanup();
    }

    /**
     * 初始化所有管理器
     */
    private initializeManagers(): void {
        this.playerManager = new PlayerManager(this);
        this.gameManager = new GameManager(this);
        this.battleSystem = new BattleSystem(this);
        this.messageHandler = new MessageHandler(this);

        // 設置管理器之間的引用
        this.gameManager.setBattleSystem(this.battleSystem);
        this.battleSystem.setGameManager(this.gameManager);
    }

    /**
     * 設置消息處理器
     */
    private setupMessageHandlers(): void {
        this.messageHandler.setupMessageHandlers(
            this.playerManager,
            this.gameManager,
            this.battleSystem
        );


    }

    /**
     * 處理遊戲 Tick - 整合所有系統更新
     * 公開方法，供 GameManager 調用
     */
    public handleGameTick(): void {
        // 從 GameManager 獲取更新數據
        const { deltaTime, currentTime } = this.gameManager.updateGameTick();

        // 更新 Hero 無敵時間
        this.playerManager.updateHeroesInvincible(deltaTime);

        // 更新敵人 AI 並獲取傷害報告
        const heroHealthChanges = this.battleSystem.updateEnemyAI(deltaTime, currentTime);

        // 處理傷害報告
        this.battleSystem.processDamageReport(heroHealthChanges);

        // 檢查玩家死亡
        const deathResult = this.playerManager.checkAndHandlePlayerDeaths();

        if (deathResult.anyPlayerDied) {
            // 發送死亡戰報
            for (const [, hero] of this.state.gameCore.allUnits) {
                if (hero.type == UnitType.hero && hero.hp <= 0 && hero.isDead) {
                    this.messageHandler.sendBattleLog(`${(hero as Hero).name} 被殭屍群殺死了！`, 'death');
                }
            }

            if (deathResult.allDead) {
                this.messageHandler.sendBattleLog("所有玩家陣亡，遊戲結束！", 'event');
                this.gameManager.forceEndGame();
                return;
            }
        }
    }
}
