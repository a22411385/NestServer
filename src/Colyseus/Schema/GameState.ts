

import { Schema, type, MapSchema } from "@colyseus/schema";
import { ServerGameUnit } from "./Unit/GameUnit";
import { ServerEnemy } from "./Unit/Enemy";
import { ServerHero } from "./Unit/Hero";
import { ServerBullet } from "./Bullet";

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
    @type("number") roundTime: number = 0; // 遊戲

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
    //  @type({ map: "string" }) tiles = new MapSchema<string>();

}

export class GameRoomState extends Schema {
    // === 核心狀態（高頻同步）===
    @type({ map: GamePlayer }) players = new MapSchema<GamePlayer>();
    //@type({ map: Hero }) heroes = new MapSchema<Hero>(); // 玩家操作單位
    @type(GameCoreState) gameCore: GameCoreState = new GameCoreState();


    // 這裡只同步場上所有單位的存活
    @type({ map: ServerGameUnit }) allUnits = new MapSchema<ServerGameUnit>();

    // 子彈系統 - Vampire Survivors 風格
    @type({ map: ServerBullet }) bullets = new MapSchema<ServerBullet>();

    // === 重要實體（中頻同步）===

    // === 房間基本資訊 ===
    @type("string") roomName: string = "";
    @type("number") maxPlayers: number = 6;
    @type("string") state: RoomStateType = "waiting";
    @type("string") roomType: roomType = "normal"; // 新增：房間類型

    // === 地圖數據 ===
    @type(MapData) mapData: MapData = new MapData();

    // === 測試房模式相關 ===
    @type("boolean") isTestMode: boolean = true; // 測試模式標記


    addBullet(bullet: ServerBullet): void {
        this.bullets.set(bullet.id, bullet);
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

    // 🎯 系統清理單位（不觸發擊殺獎勵）
    // 用於波次結束、遊戲重置等系統清理場景
    removeUnitBySystem(unitId: string): void {
        const unit = this.allUnits.get(unitId);
        if (unit) {
            // 不設置 killedBy，表示是系統移除
            unit.killedBy = "";
            unit.isDead = true;
            this.allUnits.delete(unitId);
            console.log(`🧹 系統清理單位: ${unit.name || unitId}`);
        }
    }

    // 清除所有敵人類型的單位（系統清理，不觸發獎勵）
    removeAllEnemy(): void {
        const toRemove: string[] = [];
        for (const [unitId, unit] of this.allUnits) {
            if (unit.type === UnitType.enemy) {
                // 標記為系統清理
                unit.killedBy = "";
                toRemove.push(unitId);
            }
        }
        for (const unitId of toRemove) {
            this.allUnits.delete(unitId);
        }

        if (toRemove.length > 0) {
            console.log(`🧹 系統清理了 ${toRemove.length} 個敵人（不觸發獎勵）`);
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

    // 獲取敵人數量
    getEnemyCount(): number {
        return this.allUnits.size;
    }
}
