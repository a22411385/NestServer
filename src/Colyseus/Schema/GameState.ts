

import { Schema, type, MapSchema } from "@colyseus/schema";
import { Enemy } from "./Unit/Enemy";
export type gameStateTag = "waiting" | 'playing' | 'finished' | 'pedding' | 'testing';
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
// 技能基底
export class Skill extends Schema {
    @type("string") id: string = "";
    @type("string") name: string = "";
    @type("number") cooldown: number = 0; // 冷卻時間 (ms)
    @type("number") remainingCooldown: number = 0; // 剩餘冷卻時間
    @type("number") damage: number = 0; // 技能傷害
    @type("number") range: number = 100; // 技能範圍
}

// 狀態效果
export class StatusEffect extends Schema {
    @type("string") id: string = "";
    @type("string") type: string = ""; // buff, debuff, heal, damage
    @type("number") duration: number = 0; // 持續時間 (ms)
    @type("number") value: number = 0; // 效果數值
}

// 單位基底
export class GameUnit extends Schema {
    @type("string") id: string = "";
    @type("string") type: UnitType = UnitType.enemy;

    @type("number") hp: number = 10;
    @type("number") maxHp: number = 10;
    @type("number") radius: number = 20; // 體積/碰撞半徑

    @type("boolean") isDead: boolean = false;
    @type({ map: Skill }) skills = new MapSchema<Skill>();
    @type({ map: StatusEffect }) statusEffects = new MapSchema<StatusEffect>();

    x: number = 0;
    y: number = 0;

    speed: number = 1; // 移動速度
    vx: number = 0; // X 軸速度向量
    vy: number = 0; // Y 軸速度向量

    // 加血方法
    heal(amount: number): number {
        const oldHp = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        return this.hp - oldHp; // 返回實際恢復的血量
    }

    // 扣血方法
    takeDamage(amount: number): boolean {
        this.hp = Math.max(0, this.hp - amount);
        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true;
            return true; // 返回是否死亡
        }
        return false;
    }

    // 檢查是否在範圍內
    isInRange(target: GameUnit, range: number): boolean {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.hypot(dx, dy);
        return distance <= range;
    }

    // 添加狀態效果
    addStatusEffect(effect: StatusEffect): void {
        this.statusEffects.set(effect.id, effect);
    }

    // 移除狀態效果
    removeStatusEffect(effectId: string): void {
        this.statusEffects.delete(effectId);
    }

    // 重置狀態
    reset(): void {
        this.hp = this.maxHp;
        this.isDead = false;
        this.statusEffects.clear();

        // 重置技能冷卻
        for (const [, skill] of this.skills) {
            skill.remainingCooldown = 0;
        }
    }
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
    @type("number") gameTime: number = 0;
    @type('string') status: gameFlowStatus = 'prepare'
    @type("number") aliveHeroes: number = 0; // 存活英雄數量

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

        this.gameTime = 0;
        this.status = 'prepare';
        this.aliveHeroes = 0;
    }
}

// --- Item (道具) Schema ---
export class Item extends Schema {
    @type("string") id: string = "";
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("string") itemType: string = "exp"; // exp, heal, buff ...
    @type("number") value: number = 1;
}

export class GameRoomState extends Schema {
    // === 核心狀態（高頻同步）===
    @type({ map: GamePlayer }) players = new MapSchema<GamePlayer>();
    //@type({ map: Hero }) heroes = new MapSchema<Hero>(); // 玩家操作單位
    @type(GameCoreState) gameCore: GameCoreState = new GameCoreState();
    @type({ map: GameUnit }) allUnits = new MapSchema<GameUnit>();
    // === 重要實體（中頻同步）===
    @type({ map: Item }) items = new MapSchema<Item>();

    // === 大量實體（低頻同步）===
    //  @type({ map: EnemySnapshot }) enemySnapshots = new MapSchema<EnemySnapshot>();

    // === 房間基本資訊 ===
    @type("string") roomName: string = "";
    @type("number") maxPlayers: number = 6;
    @type("string") state: gameStateTag = "waiting";
    @type("string") roomType: roomType = "normal"; // 新增：房間類型

    // === 測試房模式相關 ===
    @type("boolean") isTestMode: boolean = false; // 測試模式標記
    @type("boolean") playerInvincible: boolean = false; // 玩家無敵狀態

    // 添加完整敵人的方法
    addUnit(unit: GameUnit): void {
        this.allUnits.set(unit.id, unit);
    }

    // 移除敵人
    removeUnit(unit: GameUnit): void {
        this.allUnits.set(unit.id, unit);
    }

    //清除UnitType.enemy的元素
    removeAllEnemy(): void {

    }

    // 獲取完整敵人資料（伺服器端用）
    getEnemy(unit: GameUnit): Enemy | undefined {
        return this.allUnits.get(unit.id) as Enemy;
    }

    // 獲取所有敵人（伺服器端用）
    getAllEnemies(): Map<string, Enemy> {

    }


    // 清理死亡的敵人
    cleanupDeadEnemies(): { killedEnemies: string[], totalExp: number } {
        const killedEnemies: string[] = [];
        let totalExp = 0;

        for (const [enemyId, enemy] of this.allUnits) {
            if (enemy.isDead) {
                killedEnemies.push(enemyId);
                totalExp += enemy.expReward;
                this.removeEnemy(enemyId);
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
        for (const [, enemy] of this.fullEnemies) {
            if (!enemy.isDead) count++;
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

    isFinished(): boolean {
        return this.state === "finished";
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
        for (const [, hero] of this.heroes) {
            if (!hero.isDead) {
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
        this.fullEnemies.clear();
        this.enemySnapshots.clear();
        this.items.clear();
        this.heroes.clear();
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
    static createHero(id: string, name: string, x: number = 0, y: number = 0): Hero {
        const hero = new Hero();
        hero.id = id;
        hero.name = name;
        hero.x = x;
        hero.y = y;
        hero.reset();
        return hero;
    }

    static createEnemy(type: number = 1, x: number = 0, y: number = 0): Enemy {
        const enemy = new Enemy();
        enemy.id = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        enemy.x = x;
        enemy.y = y;
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
    static spawnEnemyAtMapEdge(type: number = 1, mapSize: number = 1000): Enemy {
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
    static spawnHeroInArea(id: string, name: string, mapSize: number = 1000): Hero {
        const x = Math.random() * mapSize;
        const y = Math.random() * mapSize;
        return this.createHero(id, name, x, y);
    }
}
