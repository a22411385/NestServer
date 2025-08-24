import { Room, Client } from "colyseus";
import { GameRoomState as GameRoomState, GameCoreState, UnitType, MapData } from "@/Colyseus/Schema/GameState";

// 引入新的管理器和系統
import { PlayerManager } from "@/Colyseus/Managers/PlayerManager";
import { GameManager } from "@/Colyseus/Managers/GameManager";
import { BattleSystem } from "@/Colyseus/Systems/BattleSystem";
import { MessageHandler } from "@/Colyseus/Handlers/MessageHandler";
import { ServerHero } from "@/Colyseus/Schema/Unit/Hero";
import { MovementSystem } from "@/Colyseus/Systems/MovemnetSystem";
import { UnitManager } from "../Systems/UnitManager";
import { MiddleRoom } from "./MiddleRoom";
import { LobbyPlayer, LobbyRoomInfo } from "../Schema/LobbyState";
import { LobbyRoomBus } from "./LobbyRoom";
import { ServerBullet } from "@/Colyseus/Schema/Bullet";
import { Vector2 } from "@/Colyseus/Schema/Unit/GameUnit";
import { ServerEnemy } from "../Schema/Unit/Enemy";

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

    public roomInfo: LobbyRoomInfo;


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

        this.onMessage("*", (client, type, message) =>
            this.messageHandler.MessageHandler(client, type, message));

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

            this.roomInfo = new LobbyRoomInfo();
            this.roomInfo.roomId = this.roomId;
            this.roomInfo.roomName = this.state.roomName;
            this.roomInfo.hostName = options.hostName;
            this.roomInfo.currentPlayers = 0;
            this.roomInfo.maxPlayers = this.state.maxPlayers;
            this.roomInfo.state = "waiting";
            this.roomInfo.isPrivate = options.isPrivate || false;
            this.initializeManagers();

            // 設置消息處理器
            //  this.messageHandler.setupMessageHandlers();
            LobbyRoomBus.emit("roomCreated", { roomId: this.roomId, roomInfo: this.roomInfo });


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

        // 處理英雄自動攻擊 (Vampire Survivors 風格)
        this.updateHeroAutoAttacks();

        // 更新子彈系統
        this.updateBullets(deltaTime);

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
                    this.messageHandler.sendBattleLog(`${(hero as ServerHero).name} 被殭屍群殺死了！`, 'death');
                }
            }

            if (deathResult.allDead) {
                this.messageHandler.sendBattleLog("所有玩家陣亡，遊戲結束！", 'event');
                this.gameManager.forceEndGame();
                return;
            }
        }
    }

    /**
     * 更新英雄自動攻擊 - Vampire Survivors 風格
     */
    private updateHeroAutoAttacks(): void {
        // 獲取所有存活的敵人
        const aliveEnemies = this.unitManager.getAllAliveEnemies();

        // 遍歷所有英雄
        for (const [heroId, unit] of this.state.gameCore.allUnits) {
            if (unit.type !== UnitType.hero || unit.isDead) continue;

            const hero = unit as ServerHero;

            // 嘗試自動攻擊
            const attackResult = hero.tryAttack(aliveEnemies);

            // if (attackResult.shouldCreateBullet && attackResult.bulletInfo) {
            //     this.createBullet(attackResult.bulletInfo);
            // }
        }
    }

    /**
     * 創建子彈
     */
    private createBullet(bulletInfo: {
        startPosition: { x: number, y: number },
        direction: { x: number, y: number },
        damage: number,
        //  speed: number,
        // bulletType: string,
        ownerId: string
    }): void {
        const bullet = new ServerBullet();

        // 生成唯一 ID
        const bulletId = `bullet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        bullet.initialize(
            bulletId,
            bulletInfo.ownerId,
            new Vector2(bulletInfo.startPosition.x, bulletInfo.startPosition.y),
            new Vector2(bulletInfo.direction.x, bulletInfo.direction.y),
            bulletInfo.damage,
            //     bulletInfo.speed,
            //  bulletInfo.bulletType
        );

        // 添加到遊戲狀態
        this.state.gameCore.bullets.set(bulletId, bullet);
    }

    /**
     * 更新子彈系統
     */
    private updateBullets(deltaTime: number): void {
        const bulletsToRemove: string[] = [];

        // 遍歷所有子彈
        for (const [bulletId, bullet] of this.state.gameCore.bullets) {
            // 檢查子彈是否應該被移除
            if (bullet.shouldDestroy()) {
                bulletsToRemove.push(bulletId);
                continue;
            }

            // 檢查子彈碰撞
            this.checkBulletCollisions(bullet);
        }

        // 移除過期的子彈
        for (const bulletId of bulletsToRemove) {
            this.state.gameCore.bullets.delete(bulletId);
        }
    }

    /**
     * 檢查子彈碰撞
     */
    private checkBulletCollisions(bullet: any): void {
        const currentPos = bullet.getCurrentPosition();

        // 檢查與敵人的碰撞
        for (const [enemyId, unit] of this.state.gameCore.allUnits) {
            if (unit.type !== UnitType.enemy || unit.isDead) continue;

            const enemy = unit as ServerEnemy; // ServerEnemy
            const distance = Math.hypot(
                currentPos.x - enemy.position.x,
                currentPos.y - enemy.position.y
            );

            // 碰撞檢測 (子彈半徑 + 敵人半徑)
            const collisionDistance = 5 + enemy.radius; // 子彈半徑假設為 5

            if (distance <= collisionDistance) {
                // 造成傷害
                const killed = enemy.takeDamage(bullet.damage);

                // 處理命中
                const shouldContinue = bullet.onHit();

                if (killed) {
                    // 給子彈擁有者經驗值
                    const owner = this.state.gameCore.allUnits.get(bullet.ownerId);
                    if (owner && owner.type === UnitType.hero) {
                        const hero = owner as ServerHero;
                        const leveledUp = hero.addExperience(enemy.expReward);

                        if (leveledUp) {
                            this.messageHandler.sendBattleLog(
                                `${hero.name} 升級到 ${hero.level} 級！`,
                                'event'
                            );
                        }
                    }
                    this.state.gameCore.allUnits.delete(enemyId);
                }

                // 如果子彈不應該繼續存在，標記為命中
                if (!shouldContinue) {
                    bullet.hasHit = true;
                    break;
                }

            }
        }
    }
}
