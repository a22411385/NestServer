import { Room, Client } from "colyseus";
import { GameRoomState as GameRoomState, GameCoreState, UnitType, MapData } from "@/Colyseus/Schema/GameState";

// 引入新的管理器和系統
import { PlayerManager } from "@/Colyseus/Managers/PlayerManager";
import { GameManager } from "@/Colyseus/Managers/GameManager";
import { BattleSystem } from "@/Colyseus/Systems/BattleSystem";
import { MessageHandler } from "@/Colyseus/Handlers/MessageHandler";
import { Hero } from "@/Colyseus/Schema/Unit/Hero";
import { MovementSystem } from "@/Colyseus/Systems/MovemnetSystem";
import { UnitManager } from "../Systems/UnitManager";
import { MiddleRoom } from "./MiddleRoom";
import { LobbyPlayer, LobbyRoomInfo } from "../Schema/LobbyState";
import { LobbyRoomBus } from "./LobbyRoom";

export interface GameRoomOptions {
    roomName: string;
    maxPlayers: number;
    hostId: string;
    hostName: string;
    hostCharacterId: number;
    roomType?: "normal" | "test"; // 新增：房間類型
    isPrivate?: boolean;
}

export class GameRoom extends MiddleRoom<GameRoomState> {

    //先寫死
    public mapWidth: number = 2000;
    public mapHeight: number = 2000;

    maxClients = 6;
    autoDispose = true;
    // 管理器實例
    public gameManager: GameManager;

    public playerManager: PlayerManager;
    public battleSystem: BattleSystem;
    public messageHandler: MessageHandler;
    public movementSystem: MovementSystem;
    public unitManager: UnitManager;

    private roomInfo: LobbyRoomInfo;


    /**
    * 初始化所有管理器
    */
    public initializeManagers(): void {

        this.playerManager = new PlayerManager(this);

        this.battleSystem = new BattleSystem(this);
        this.messageHandler = new MessageHandler(this);
        this.movementSystem = new MovementSystem(this);
        this.unitManager = new UnitManager(this);
        this.gameManager = new GameManager(this);

    }
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

            this.state.mapData = new MapData;
            this.state.mapData.width = this.mapWidth;
            this.state.mapData.height = this.mapHeight;
            this.initializeManagers();

            this.roomInfo = new LobbyRoomInfo();
            this.roomInfo.roomId = this.roomId;
            this.roomInfo.roomName = this.state.roomName;
            this.roomInfo.hostName = options.hostName;
            this.roomInfo.currentPlayers = 0;
            this.roomInfo.maxPlayers = this.state.maxPlayers;
            this.roomInfo.isStarted = false;
            this.roomInfo.isPrivate = options.isPrivate || false;

            // 設置消息處理器
            this.messageHandler.setupMessageHandlers();
            LobbyRoomBus.emit("roomCreated", { roomId: this.roomId, roomInfo: this.roomInfo });

            console.log(`GameRoom ${this.roomId} created successfully`);
        } catch (error) {
            console.error('Error creating GameRoom:', error);
            throw error;
        }
    }

    async onJoin(client: Client, options: any, player: LobbyPlayer): Promise<LobbyPlayer> {

        this.playerManager.handlePlayerJoin(client, player);
        this.roomInfo.currentPlayers = this.playerManager.getPlayerCount();
        LobbyRoomBus.emit("roomUpdated", { roomId: this.roomId, roomInfo: this.roomInfo });
        return player;
    }

    onLeave(client: Client, consented: boolean) {
        const newHostId = this.playerManager.handlePlayerLeave(client, consented);

        // 如果房間空了，停止遊戲循環
        if (this.playerManager.getPlayerCount() === 0) {
            this.gameManager.stopGameLoop();
        }
        this.roomInfo.currentPlayers = this.playerManager.getPlayerCount();
        this.roomInfo.hostName = newHostId ? this.playerManager.getPlayerName(newHostId) : "無主機";
        LobbyRoomBus.emit("roomUpdated", { roomId: this.roomId, roomInfo: this.roomInfo });
    }

    onDispose() {
        console.log(`GameRoom ${this.roomId} disposed`);
        this.gameManager.stopGameLoop();
        this.battleSystem.cleanup();
        this.messageHandler.cleanup();
        LobbyRoomBus.emit("roomDeleted", { roomId: this.roomId });
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
