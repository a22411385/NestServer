

import { Schema, type, MapSchema } from "@colyseus/schema";
import { ServerGameUnit, StatusEffect, Vector2 } from "./Unit/GameUnit";
import { ServerEnemy } from "./Unit/Enemy";
import { ServerHero } from "./Unit/Hero";

export type RoomStateType = "waiting" | 'playing';
export type gameFlowStatus = "prepare" | 'battle' | 'rest' | 'settlement' | 'test_mode';
export type roomType = "normal" | "test";
export enum UnitType {
    enemy,
    hero,
    summor,
    building,
    npc,
    boss
}
// --- Item (道具) Schema ---
export class Item extends Schema {
    @type("string") id: string = "";
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("string") itemType: string = "exp"; // exp, heal, buff ...
    @type("number") value: number = 1;
}


export class GamePlayer extends Schema {
    @type("string") id: string = "";
    @type("string") name: string = "";
    @type("number") characterId: number = 1;
    @type("boolean") isReady: boolean = false;
    @type("boolean") isHost: boolean = false;
    @type("number") exp: number = 0;
}


export class GameCoreState extends Schema {
    // 遊戲設置
    @type("number") waveNumber: number = 1;
    @type('string') status: gameFlowStatus = 'prepare'
    @type("number") aliveHeroes: number = 0; // 存活英雄數量
    @type("number") roundTime: number = 0; // 遊戲幀數
    @type({ map: Item }) items = new MapSchema<Item>();

    //這裡只同步場上所有單位的存活
    @type({ map: ServerGameUnit }) allUnits = new MapSchema<ServerGameUnit>();

    // 遊戲狀態管理方法
    isGameActive(): boolean {
        return this.status === 'battle';
    }

    isGamePreparing(): boolean {
        return this.status === 'prepare';
    }

    isGameResting(): boolean {
        return this.status === 'rest';
    }

    isGameFinished(): boolean {
        return this.status === 'settlement';
    }

    // 進入下一波
    nextWave(): void {
        this.waveNumber++;
    }

    // 重置遊戲核心狀態
    resetGame(): void {
        this.waveNumber = 1;
        this.status = 'prepare';
        this.aliveHeroes = 0;
    }
}

// 地圖數據
export class MapData extends Schema {
    @type("string") id: string = "";
    @type("string") name: string = "原型";
    @type("number") width: number = 2000;
    @type("number") height: number = 2000;
    @type({ map: "string" }) tiles = new MapSchema<string>();

}

export class GameRoomState extends Schema {
    // === 核心狀態（高頻同步）===
    @type({ map: GamePlayer }) players = new MapSchema<GamePlayer>();
    //@type({ map: Hero }) heroes = new MapSchema<Hero>(); // 玩家操作單位
    @type(GameCoreState) gameCore: GameCoreState = new GameCoreState();

    // === 重要實體（中頻同步）===

    // === 房間基本資訊 ===
    @type("string") roomName: string = "";
    @type("number") maxPlayers: number = 6;
    @type("string") state: RoomStateType = "waiting";
    @type("string") roomType: roomType = "normal"; // 新增：房間類型

    // === 地圖數據 ===
    @type(MapData) mapData: MapData = new MapData();

    // === 測試房模式相關 ===
    @type("boolean") isTestMode: boolean = false; // 測試模式標記

    get allUnits() {
        return this.gameCore.allUnits;
    }

    // 添加完整單位的方法
    addUnit(unit: ServerGameUnit): void {
        this.allUnits.set(unit.id, unit);
    }

    // 移除單位
    removeUnit(unitId: string): void {
        this.allUnits.delete(unitId);
    }

    // 移除敵人
    removeEnemy(enemyId: string): void {
        this.allUnits.delete(enemyId);
    }

    // 清除所有敵人類型的單位
    removeAllEnemy(): void {
        const toRemove: string[] = [];
        for (const [unitId, unit] of this.allUnits) {
            if (unit.type === UnitType.enemy) {
                toRemove.push(unitId);
            }
        }
        for (const unitId of toRemove) {
            this.allUnits.delete(unitId);
        }
    }

    // 添加敵人 (便利方法)
    addEnemy(enemy: ServerEnemy): void {
        enemy.type = UnitType.enemy;
        this.addUnit(enemy);
    }

    // 添加英雄 (便利方法)
    addHero(hero: ServerHero): void {
        hero.type = UnitType.hero;
        this.addUnit(hero);
    }

    // 獲取完整敵人資料（伺服器端用）
    getEnemy(enemyId: string): ServerEnemy | undefined {
        const unit = this.allUnits.get(enemyId);
        return (unit && unit.type === UnitType.enemy) ? unit as ServerEnemy : undefined;
    }

    // 獲取英雄資料
    getHero(heroId: string): ServerHero | undefined {
        const unit = this.allUnits.get("hero_" + heroId);
        return (unit && unit.type === UnitType.hero) ? unit as ServerHero : undefined;
    }

    // 獲取所有敵人（伺服器端用）
    getAllEnemies(): Map<string, ServerEnemy> {
        const enemies = new Map<string, ServerEnemy>();
        for (const [unitId, unit] of this.allUnits) {
            if (unit.type === UnitType.enemy) {
                enemies.set(unitId, unit as ServerEnemy);
            }
        }
        return enemies;
    }

    // 獲取所有英雄
    getAllHeroes(): Map<string, ServerHero> {
        const heroes = new Map<string, ServerHero>();
        for (const [unitId, unit] of this.allUnits) {
            if (unit.type === UnitType.hero) {
                heroes.set(unitId, unit as ServerHero);
            }
        }
        return heroes;
    }


    // 清理死亡的敵人
    cleanupDeadEnemies(): { killedEnemies: string[], totalExp: number } {
        const killedEnemies: string[] = [];
        let totalExp = 0;

        for (const [unitId, unit] of this.allUnits) {
            if (unit.type === UnitType.enemy && unit.isDead) {
                const enemy = unit as ServerEnemy;
                killedEnemies.push(unitId);
                totalExp += enemy.expReward;
                this.removeEnemy(unitId);
            }
        }

        return { killedEnemies, totalExp };
    }

    // 獲取敵人數量
    getEnemyCount(): number {
        return this.allUnits.size;
    }

    // 獲取存活敵人數量
    getAliveEnemyCount(): number {
        let count = 0;
        for (const [, unit] of this.allUnits) {
            if (unit.type === UnitType.enemy && !unit.isDead) {
                count++;
            }
        }
        return count;
    }

    // 房間狀態管理方法
    isWaiting(): boolean {
        return this.state === "waiting";
    }

    isPlaying(): boolean {
        return this.state === "playing";
    }

    // 檢查所有玩家是否準備好
    areAllPlayersReady(): boolean {
        if (this.players.size === 0) return false;

        for (const [, player] of this.players) {
            if (!player.isReady) return false;
        }
        return true;
    }

    // 更新存活英雄數量
    updateAliveHeroes(): number {
        let aliveCount = 0;
        for (const [, unit] of this.allUnits) {
            if (unit.type === UnitType.hero && !unit.isDead) {
                aliveCount++;
            }
        }
        this.gameCore.aliveHeroes = aliveCount;
        return aliveCount;
    }

    // 檢查遊戲是否結束（所有英雄死亡）
    isGameOver(): boolean {
        return this.updateAliveHeroes() === 0;
    }

    // 重置遊戲狀態
    resetGameState(): void {
        this.allUnits.clear();
        this.gameCore.items.clear();
        this.gameCore.resetGame();

        // 重置玩家準備狀態
        for (const [, player] of this.players) {
            player.isReady = false;
        }

        this.state = "waiting";
    }

    // 開始新遊戲
    startNewGame(): void {
        this.state = "playing";
        this.gameCore.status = "prepare";
        this.gameCore.resetGame();
    }
}

// 單位工廠
export class UnitFactory {
    static createHero(id: string, name: string, x: number = 0, y: number = 0): ServerHero {
        const hero = new ServerHero();
        hero.id = id;
        hero.name = name;
        hero.position = new Vector2(x, y);
        hero.reset();
        return hero;
    }

    static createEnemy(type: number = 1, x: number = 0, y: number = 0): ServerEnemy {
        const enemy = new ServerEnemy();
        enemy.id = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        enemy.position = new Vector2(x, y);
        enemy.initializeByType(type);
        return enemy;
    }

    static createStatusEffect(id: string, type: string, duration: number, value: number): StatusEffect {
        const effect = new StatusEffect();
        effect.id = id;
        effect.type = type;
        effect.duration = duration;
        effect.value = value;
        return effect;
    }

    // 在地圖邊緣隨機生成敵人
    static spawnEnemyAtMapEdge(type: number = 1, mapSize: number = 1000): ServerEnemy {
        const edge = Math.floor(Math.random() * 4);
        let x = 0, y = 0;

        switch (edge) {
            case 0: // 上邊
                x = Math.random() * mapSize;
                y = 0;
                break;
            case 1: // 下邊
                x = Math.random() * mapSize;
                y = mapSize;
                break;
            case 2: // 左邊
                x = 0;
                y = Math.random() * mapSize;
                break;
            case 3: // 右邊
                x = mapSize;
                y = Math.random() * mapSize;
                break;
        }

        return this.createEnemy(type, x, y);
    }

    // 在指定範圍內隨機生成英雄
    static spawnHeroInArea(id: string, name: string, mapSize: number = 1000): ServerHero {
        const x = Math.random() * mapSize;
        const y = Math.random() * mapSize;
        return this.createHero(id, name, x, y);
    }
}
