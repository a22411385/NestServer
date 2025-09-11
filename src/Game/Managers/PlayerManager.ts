import { Client, Room } from "colyseus";
import { GameRoomState, GamePlayer, UnitType } from "../../Colyseus/Schema/GameState";
import { IdGenerator } from "../../Util/IdGenerator";
import { ServerHero } from "../../Colyseus/Schema/Unit/Hero";
import { Vector2 } from "../../Colyseus/Schema/Unit/GameUnit";
import { LobbyPlayer } from "../../Colyseus/Schema/LobbyState";

/**
 * 玩家管理器 - 負責處理玩家的生命週期、狀態管理和 Hero 單位管理
 */
export class PlayerManager {
    private room: Room<GameRoomState>;
    private state: GameRoomState;

    constructor(room: Room<GameRoomState>) {
        this.room = room;
        this.state = room.state;
    }

    public getPlayerName(playerId: string): string {
        const player = this.state.players.get(playerId);
        return player ? player.name : "未知玩家";
    }
    /**
     * 處理玩家加入房間
     */
    handlePlayerJoin(client: Client, lobbyPlayer: LobbyPlayer): void {
        console.log(`Player ${client.sessionId} joined room ${lobbyPlayer.name}`);

        try {
            // 驗證輸入參數
            const playerName = lobbyPlayer.name || `Player${client.sessionId.substring(0, 6)}`;
            const characterId = Number(lobbyPlayer.characterId) || 1;

            const player = new GamePlayer();
            player.id = client.sessionId;
            player.name = String(playerName);
            player.characterId = Number(characterId);
            player.isReady = false;
            player.isHost = this.state.players.size === 0; // 第一個加入的是主機

            this.state.players.set(client.sessionId, player);
            console.log(`Player ${client.sessionId} successfully added to Schema`);

            // 發送歡迎消息
            client.send("gameWelcome", {
                playerId: client.sessionId,
            });

            // 通知其他玩家有新玩家加入
            this.room.broadcast("playerJoined", {
                playerId: client.sessionId,
                playerName: player.name,
                characterId: player.characterId,
            }, { except: client });

            console.log(`Player ${client.sessionId} successfully joined room ${this.room.roomId}`);
        } catch (error) {
            console.error('Error in handlePlayerJoin:', error);
            client.send("error", { message: "Failed to join room" });
        }
    }

    /**
     * 處理玩家離開房間
     */
    handlePlayerLeave(client: Client, consented: boolean): string | null {
        console.log(`Player ${client.sessionId} left room ${this.room.roomId}`);

        const player = this.state.players.get(client.sessionId);
        if (!player) return null;

        let newHostId: string | null = null;

        // 如果離開的是主機，指定新主機
        if (player.isHost && this.state.players.size > 1) {
            newHostId = this.assignNewHost(client.sessionId);
        }

        // 移除玩家
        this.state.players.delete(client.sessionId);

        // 通知其他玩家
        this.room.broadcast("playerLeft", {
            playerId: client.sessionId,
            playerName: player.name,
        });

        return newHostId;
    }

    /**
     * 切換玩家準備狀態
     */
    togglePlayerReady(client: Client): boolean {
        const player = this.state.players.get(client.sessionId);
        if (!player) return false;

        console.log(`Player ${player.name} toggleReady`);
        player.isReady = !player.isReady;


        this.state.players.set(client.sessionId, player);

        // 檢查是否所有玩家都準備好了
        const allReady = this.getAllPlayersReady();

        return allReady;
    }

    /**
     * 檢查玩家是否為主機
     */
    isPlayerHost(client: Client): boolean {
        const player = this.state.players.get(client.sessionId);
        return player ? player.isHost : false;
    }

    /**
     * 檢查是否所有玩家都準備好
     */
    getAllPlayersReady(): boolean {
        if (this.state.players.size === 0) return false;

        for (const [_, player] of this.state.players) {
            if (!player.isReady) return false;
        }
        return true;
    }

    /**
     * 指定新主機
     */
    private assignNewHost(leavingPlayerId: string): string | null {
        for (const [playerId, player] of this.state.players) {
            if (playerId !== leavingPlayerId) {
                player.isHost = true;
                this.room.broadcast("newHost", { newHostId: playerId });
                return playerId;
            }
        }
        return null;
    }

    /**
     * 初始化所有玩家的 Hero 單位
     */
    initializeAllHeroes(): void {
        for (const [playerId, player] of this.state.players) {

            const hero = new ServerHero
            // 🔧 使用統一的ID生成系統
            hero.id = IdGenerator.generateHeroId(playerId);
            hero.name = player.name;
            hero.owner = playerId;
            hero.position = new Vector2(0, 0);

            hero.hp = hero.maxHp;
            hero.invincibleRemaining = 0;

            // 🗡️ 給英雄添加所有可用武器到背包（供測試使用）
            console.log(`🎮 正在為 ${hero.name} 添加測試武器...`);

            // 所有可用武器列表
            const availableWeapons = [
                'baseball_bat',      // 球棒 - 近戰
                'fireball',          // 火球 - 投射物
                'iceball',           // 冰球 - 投射物
                'lightning_bolt',    // 閃電箭 - 投射物
                'poison_dagger',     // 毒刃 - 近戰
                'war_hammer',        // 戰錘 - 近戰
                'magic_missile',     // 魔法飛彈 - 投射物
                'healing_staff',     // 治療法杖 - 支援
                'shadow_blade',      // 暗影刃 - 近戰
                //'explosive_arrow'    // 爆裂箭 - 投射物
            ];

            // 添加所有武器到背包
            const addedWeapons: string[] = [];
            for (const weaponId of availableWeapons) {
                try {
                    const weaponUniqueId = hero.addWeaponToInventory(weaponId);
                    addedWeapons.push(weaponUniqueId);
                    console.log(`  ✅ 添加武器: ${weaponId} (${weaponUniqueId})`);
                } catch (error) {
                    console.warn(`  ❌ 添加武器失敗: ${weaponId}`, error);
                }
            }

            // 默認裝備前兩個武器（球棒和火球）
            if (addedWeapons.length >= 2) {
                hero.equipWeaponById(addedWeapons[0]); // 球棒
                hero.equipWeaponById(addedWeapons[1]); // 火球
                console.log(`  🔧 默認裝備: ${availableWeapons[0]} 和 ${availableWeapons[1]}`);
            }

            console.log(`🎒 ${hero.name} 背包武器數量: ${hero.weaponInventory.length}`);

            this.state.allUnits.set(hero.id, hero);

            console.log(`👤 Initialized hero with ID: ${hero.id} for player: ${playerId}`);
            console.log(`⚾ Equipped baseball bat for hero: ${hero.name}`);
        }
    }

    /**
     * 檢查所有玩家是否死亡
     */
    checkAllPlayersDead(): boolean {
        let heroCount = 0;
        let aliveCount = 0;

        for (const [, unit] of this.state.allUnits) {
            if (unit.type == UnitType.hero) {
                heroCount++;
                if (!unit.isDead && unit.hp > 0) {
                    aliveCount++;
                }
            }
        }

        //console.log(`🔍 英雄狀態檢查: ${aliveCount}/${heroCount} 存活`);

        return heroCount > 0 && aliveCount === 0; // 有英雄存在且沒有存活的英雄
    }

    /**
     * 更新所有 Hero 的無敵時間
     */
    updateHeroesInvincible(deltaTime: number): void {
        for (const [, hero] of this.state.allUnits) {
            if (hero.type == UnitType.hero)
                (hero as ServerHero).updateInvincible(deltaTime);
        }
    }

    /**
     * 檢查並處理玩家死亡
     */
    checkAndHandlePlayerDeaths(): { anyPlayerDied: boolean; allDead: boolean } {
        let anyPlayerDied = false;

        for (const [, hero] of this.state.allUnits) {
            if (hero.type == UnitType.hero) {
                if (hero.hp <= 0 && !hero.isDead) {
                    hero.isDead = true;
                    anyPlayerDied = true;

                    // 這裡可以由外部傳入戰報回調
                    console.log(`${(hero as ServerHero).name} 被殭屍群殺死了！`);
                    this.room.broadcast("heroDied", { heroId: hero.id });
                }
            }
        }

        // 檢查是否所有玩家都死亡
        const allDead = this.checkAllPlayersDead();

        if (allDead) {
            console.log("🏁 所有英雄已死亡，遊戲應該結束！");
        }

        return { anyPlayerDied, allDead };
    }

    /**
     * 獲取玩家數量
     */
    getPlayerCount(): number {
        return this.state.players.size;
    }

    /**
     * 獲取存活的 Hero 數量
     */
    getAliveHeroCount(): number {
        let count = 0;
        for (const [, hero] of this.state.allUnits) {
            if (hero.type == UnitType.hero && !hero.isDead && hero.hp > 0) count++;
        }
        return count;
    }

    /**
     * 重置所有玩家準備狀態
     */
    resetAllPlayersReady(): void {
        for (const [_, player] of this.state.players) {
            player.isReady = false;
        }
    }
}
