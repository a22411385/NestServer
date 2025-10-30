import { Room, Client } from "colyseus";
import { GameRoomState as GameRoomState, GameCoreState, UnitType, MapData } from "@/Colyseus/Schema/GameState";

import { GameManager } from "@/Game/Managers/GameManager";
import { EnemySystem } from "@/Game/Systems/Battle/EnemySystem";
import { MessageHandler } from "@/Colyseus/Handlers/MessageHandler";
import { ServerHero } from "@/Colyseus/Schema/Unit/Hero";
import { ServerGameUnit } from "@/Colyseus/Schema/Unit/GameUnit";
import { ServerBullet } from "@/Colyseus/Schema/Bullet";

import { MovementSystem } from "@/Game/Systems/Battle/MovemnetSystem";
import { UnitManager } from "../../Game/Managers/UnitManager";

import { MiddleRoom } from "./MiddleRoom";
import { LobbyPlayer, LobbyRoomInfo } from "../Schema/LobbyState";
import { LobbyRoomBus } from "./LobbyRoom";
import { DamageSystem } from "../../Game/Systems/Battle/DamageSystem";
import { BulletSystem } from "@/Game/Systems/Battle/BulletSystem";
import { DropSystem } from "@/Game/Systems/Items/DropSystem"; // 🆕 添加掉落系統

// 🆕 引入新的系統
import { CombatSystem } from "@/Game/Systems/Battle/CombatSystem";
import { StatusEffectSystem } from "@/Game/Systems/Battle/StatusEffectSystem";
import { WeaponInstanceManager } from "@/Game/Managers/WeaponInstanceManager";
import { WeaponFactory } from "@/Game/Factories/WeaponFactory";

// 🆕 引入統一類型定義
import { GameRoomOptions } from "@/Types";
import { PlayerManager } from "@/Game/Managers/PlayerManager";

export class GameRoom extends MiddleRoom<GameRoomState> {

    //先寫死
    public mapWidth: number = 2000;
    public mapHeight: number = 2000;

    maxClients = 6;
    autoDispose = true;
    // 管理器實例
    public gameManager: GameManager;

    public playerManager: PlayerManager;
    public enemySystem: EnemySystem;
    public messageHandler: MessageHandler;
    public movementSystem: MovementSystem;
    public unitManager: UnitManager;
    public damageSystem: DamageSystem;
    public bulletSystem: BulletSystem; // 🆕 添加子彈系統
    public combatSystem: CombatSystem; // 🆕 戰鬥系統
    public statusEffectSystem: StatusEffectSystem; // 🆕 狀態效果系統

    public dropSystem: DropSystem; // 🆕 掉落系統

    public roomInfo: LobbyRoomInfo;
    private lastItemCleanup: number = 0; // 上次物品清理時間


    /**
    * 初始化所有管理器
    */
    public async initializeManagers(): Promise<void> {


        this.playerManager = new PlayerManager(this);

        this.enemySystem = new EnemySystem(this);
        this.messageHandler = new MessageHandler(this);
        this.movementSystem = new MovementSystem(this);
        this.unitManager = new UnitManager(this);
        this.damageSystem = new DamageSystem(this); // 初始化傷害系統
        this.bulletSystem = new BulletSystem(this); // 🆕 初始化子彈系統
        this.combatSystem = new CombatSystem(this); // 🆕 初始化戰鬥系統
        this.statusEffectSystem = new StatusEffectSystem(this); // 🆕 初始化狀態效果系統

        this.dropSystem = new DropSystem(this); // 🆕 初始化掉落系統
        this.dropSystem.initialize(); // 🆕 初始化掉落系統配置

        this.gameManager = new GameManager(this);

        this.onMessage("*", (client, type, message) =>
            this.messageHandler.MessageHandler(client, type, message));

    }
    get IsPlaying(): boolean {
        return this.gameManager.isPlaying;
    }

    async onCreate(options: GameRoomOptions) {
        console.log(`GameRoom created: ${options.roomName} by ${options.hostName}, type: ${options.roomType || 'normal'}`);

        try {
            this.state = new GameRoomState();
            this.maxClients = options.maxPlayers;

            // 設置房間資訊
            this.state.roomName = options.roomName;
            this.state.maxPlayers = options.maxPlayers;
            this.state.state = "waiting";
            this.state.roomType = options.roomType || "normal"; // 設置房間類型
            this.state.isTestMode = process.env.TEST_MODE === 'true'; // 設置測試模式

            // 初始化遊戲數據，避免 undefined
            this.state.gameCore = new GameCoreState;

            this.state.mapData = new MapData;
            this.state.mapData.width = this.mapWidth;
            this.state.mapData.height = this.mapHeight;

            this.roomInfo = new LobbyRoomInfo();
            this.roomInfo.roomId = this.roomId;
            this.roomInfo.roomName = this.state.roomName;
            this.roomInfo.hostName = options.hostName;
            this.roomInfo.currentPlayers = 0;
            this.roomInfo.maxPlayers = this.state.maxPlayers;
            this.roomInfo.state = "waiting";
            this.roomInfo.isPrivate = options.isPrivate || false;
            await this.initializeManagers();

            // 設置消息處理器
            //  this.messageHandler.setupMessageHandlers();
            LobbyRoomBus.emit("roomCreated", { roomId: this.roomId, roomInfo: this.roomInfo });

            // 🔧 設置封包過濾：只同步視野範圍內的數據
            this.setupStateFiltering();

            console.log(`GameRoom ${this.roomId} created successfully`);
        } catch (error) {
            console.error('Error creating GameRoom:', error);
            throw error;
        }
    }
    async onAuth(client: Client, options: any): Promise<LobbyPlayer> {
        if (this.state.state == "playing") {
            throw new Error("遊戲已經開始，無法加入");
        }


        return await super.onAuth(client, options);
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
        console.log(`🧹 GameRoom ${this.roomId} 正在銷毀，清理所有資源...`);

        // 清理武器實例管理器
        WeaponInstanceManager.destroy();

        // 原有的清理邏輯
        this.gameManager.stopGameLoop();

        this.bulletSystem.cleanup(); // 🆕 清理子彈系統
        this.messageHandler.cleanup();

        console.log(`🧹 GameRoom ${this.roomId} 資源清理完成`);
        LobbyRoomBus.emit("roomDeleted", { roomId: this.roomId });
    }


    /**
     * 🔧 設置狀態同步過濾（視野範圍）
     * 使用英雄的 visionRange 屬性來決定過濾範圍
     */
    private setupStateFiltering(): void {
        // 過濾單位（allUnits）- 使用英雄的視野範圍
        (this.state.allUnits as any).$filters = {
            onAdd: (instance: ServerGameUnit, key: string) => {
                return (client: Client, value: ServerGameUnit) => {
                    // 自己的英雄永遠同步
                    if (value.id === "hero_" + client.sessionId) {
                        return true;
                    }

                    const hero = this.state.getHero(client.sessionId);
                    if (!hero) return false;

                    // 🔧 使用英雄的視野範圍屬性
                    const visionRange = hero.visionRange || 1500;
                    const dx = value.position.x - hero.position.x;
                    const dy = value.position.y - hero.position.y;
                    const distSq = dx * dx + dy * dy;
                    return distSq <= visionRange * visionRange;
                };
            }
        };

        // 過濾子彈（bullets）- 視野範圍 + 額外緩衝區
        (this.state.bullets as any).$filters = {
            onAdd: (instance: ServerBullet, key: string) => {
                return (client: Client, value: ServerBullet) => {
                    const hero = this.state.getHero(client.sessionId);
                    if (!hero) return false;

                    // 🔧 子彈範圍 = 視野範圍 + 500 緩衝區（避免突然出現）
                    const bulletRange = (hero.visionRange || 1500) + 500;
                    const dx = value.startPositionX - hero.position.x;
                    const dy = value.startPositionY - hero.position.y;
                    const distSq = dx * dx + dy * dy;
                    return distSq <= bulletRange * bulletRange;
                };
            }
        };
        console.log(`✅ 已啟用動態視野過濾系統（基於英雄 visionRange 屬性）`);
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

        // 處理英雄自動攻擊 (Vampire Survivors 風格)
        this.combatSystem.updateHeroAutoAttacks();

        // 🆕 更新狀態效果系統（處理持續傷害、清理過期效果）
        this.statusEffectSystem.update(deltaTime);

        // 更新子彈系統
        this.bulletSystem.updateBullets(deltaTime);

        // 🔧 更新敵人 AI（只設置速度向量）
        this.enemySystem.updateEnemyAI(deltaTime, currentTime);

        // 🔧 攻擊和傷害處理由敵人AI內部處理，不再需要外部傷害報告

        // 檢查玩家死亡
        const deathResult = this.playerManager.checkAndHandlePlayerDeaths();

        if (deathResult.anyPlayerDied) {
            // 發送死亡戰報
            for (const [, hero] of this.state.allUnits) {
                if (hero.type == UnitType.hero && hero.hp <= 0 && hero.isDead) {
                    this.messageHandler.sendBattleLog(`${(hero as ServerHero).name} 被殭屍群殺死了！`, 'death');
                }
            }
        }

        // 檢查是否所有玩家都死亡（每次都檢查，不只是有人剛死亡時）
        if (deathResult.allDead) {
            this.messageHandler.sendBattleLog("所有玩家陣亡，遊戲結束！", 'event');
            this.gameManager.forceEndGame();
            return;
        }

        this.movementSystem.updateUnitMovements(deltaTime);
    }

    /**
     * 更新英雄自動攻擊 - 基於武器系統的 Vampire Survivors 風格
     */
}
