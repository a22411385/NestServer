

import { Schema, type, MapSchema } from "@colyseus/schema";
export type gameStateTag = "waiting" | 'playing' | 'finished' | 'pedding';
export type gameFlowStatus = "prepare" | 'battle' | 'rest' | 'settlement';

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
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") hp: number = 10;
    @type("number") maxHp: number = 10;
    @type("number") radius: number = 20; // 體積/碰撞半徑
    @type("number") speed: number = 1; // 移動速度
    @type("boolean") isDead: boolean = false;
    @type({ map: Skill }) skills = new MapSchema<Skill>();
    @type({ map: StatusEffect }) statusEffects = new MapSchema<StatusEffect>();

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

    // 移動方法
    moveTo(targetX: number, targetY: number, deltaTime: number): void {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 0) {
            const step = this.speed * (deltaTime / 1000);
            const moveDistance = Math.min(step, distance);

            this.x += (dx / distance) * moveDistance;
            this.y += (dy / distance) * moveDistance;
        }
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

// 殭屍
export class Enemy extends GameUnit {
    @type("number") type: number = 1; // 敵人類型
    @type("number") damage: number = 10; // 攻擊傷害
    @type("number") expReward: number = 1; // 擊殺獎勵經驗值
    @type("string") aiState: string = "chase"; // AI 狀態: chase, attack, idle
    @type("number") lastAttackTime: number = 0; // 上次攻擊時間
    @type("number") attackCooldown: number = 1000; // 攻擊冷卻 (ms)

    constructor() {
        super();
        this.hp = 20;
        this.maxHp = 20;
        this.speed = 50; // 每秒移動50像素
        this.radius = 15;
    }

    // 尋找最近的目標
    findNearestTarget(targets: MapSchema<Hero>): Hero | null {
        let nearestTarget: Hero | null = null;
        let minDistance = Infinity;

        for (const [, target] of targets) {
            if (target.isDead) continue;

            const distance = this.getDistanceTo(target);
            if (distance < minDistance) {
                minDistance = distance;
                nearestTarget = target;
            }
        }

        return nearestTarget;
    }

    // 獲取到目標的距離
    getDistanceTo(target: GameUnit): number {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        return Math.hypot(dx, dy);
    }

    // AI 更新邏輯
    updateAI(targets: MapSchema<Hero>, deltaTime: number, currentTime: number): void {
        if (this.isDead) return;

        const target = this.findNearestTarget(targets);
        if (!target) {
            this.aiState = "idle";
            return;
        }

        const distanceToTarget = this.getDistanceTo(target);
        const attackRange = this.radius + target.radius;

        // 如果在攻擊範圍內
        if (distanceToTarget <= attackRange) {
            this.aiState = "attack";
            this.attemptAttack(target, currentTime);
        } else {
            // 追蹤目標
            this.aiState = "chase";
            this.chaseTarget(target, deltaTime);
        }
    }

    // 追蹤目標
    private chaseTarget(target: GameUnit, deltaTime: number): void {
        this.moveTo(target.x, target.y, deltaTime);
    }

    // 嘗試攻擊
    private attemptAttack(target: Hero, currentTime: number): boolean {
        if (currentTime - this.lastAttackTime >= this.attackCooldown) {
            this.lastAttackTime = currentTime;
            return this.attackTarget(target);
        }
        return false;
    }

    // 攻擊目標
    attackTarget(target: GameUnit): boolean {
        if (this.isInRange(target, this.radius + target.radius)) {
            return target.takeDamage(this.damage);
        }
        return false;
    }

    // 根據類型初始化屬性
    initializeByType(type: number): void {
        this.type = type;
        switch (type) {
            case 1: // 普通殭屍
                this.hp = this.maxHp = 20;
                this.speed = 50;
                this.damage = 10;
                this.expReward = 1;
                this.attackCooldown = 1000;
                break;
            case 2: // 快速殭屍
                this.hp = this.maxHp = 15;
                this.speed = 80;
                this.damage = 8;
                this.expReward = 2;
                this.attackCooldown = 800;
                break;
            case 3: // 強壯殭屍
                this.hp = this.maxHp = 40;
                this.speed = 30;
                this.damage = 15;
                this.expReward = 3;
                this.attackCooldown = 1500;
                break;
        }
    }
}

// 玩家操控的主要單位
export class Hero extends GameUnit {
    @type("string") name: string = '';
    @type("number") invincibleRemaining: number = 0; // 無敵剩餘時間 (ms)
    @type("number") level: number = 1;
    @type("number") exp: number = 0;
    @type("number") attackDamage: number = 15; // 攻擊傷害
    @type("number") attackRange: number = 100; // 攻擊範圍

    constructor() {
        super();
        this.hp = 100;
        this.maxHp = 100;
        this.speed = 100; // 每秒移動100像素
        this.radius = 20;
    }

    // 獲得經驗值
    gainExp(amount: number): boolean {
        this.exp += amount;
        // 簡單升級邏輯：每100經驗值升一級
        const expRequired = this.level * 100;
        if (this.exp >= expRequired) {
            this.levelUp();
            return true;
        }
        return false;
    }

    // 升級
    private levelUp(): void {
        this.level++;
        this.exp = 0; // 重置經驗值

        // 升級時提升屬性
        this.maxHp += 10;
        this.hp = this.maxHp; // 升級時滿血
        this.attackDamage += 5;
        this.attackRange += 5;
    }

    // 攻擊敵人
    attackEnemy(enemy: Enemy): boolean {
        if (this.isInRange(enemy, this.attackRange)) {
            const killed = enemy.takeDamage(this.attackDamage);
            if (killed) {
                this.gainExp(enemy.expReward);
            }
            return killed;
        }
        return false;
    }

    // 覆寫扣血方法，處理無敵時間
    takeDamage(amount: number): boolean {
        if (this.invincibleRemaining > 0) {
            return false; // 無敵期間不受傷害
        }

        const died = super.takeDamage(amount);
        if (!died) {
            this.invincibleRemaining = 1000; // 受傷後1秒無敵
        }
        return died;
    }

    // 更新無敵時間
    updateInvincible(deltaTime: number): void {
        if (this.invincibleRemaining > 0) {
            this.invincibleRemaining = Math.max(0, this.invincibleRemaining - deltaTime);
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
    @type({ map: GamePlayer }) players = new MapSchema<GamePlayer>();
    @type({ map: Hero }) heroes = new MapSchema<Hero>(); // 玩家操作單位
    @type({ map: Enemy }) enemies = new MapSchema<Enemy>();
    @type({ map: Item }) items = new MapSchema<Item>();

    @type("string") roomName: string = "";
    @type("number") maxPlayers: number = 6;
    @type("string") state: gameStateTag = "waiting"

    @type(GameCoreState) gameCore: GameCoreState = new GameCoreState;

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

    // 清理死亡的敵人並獲得經驗值
    cleanupDeadEnemies(): { killedEnemies: string[], totalExp: number } {
        const killedEnemies: string[] = [];
        let totalExp = 0;

        for (const [enemyId, enemy] of this.enemies) {
            if (enemy.isDead) {
                killedEnemies.push(enemyId);
                totalExp += enemy.expReward;
                this.enemies.delete(enemyId);
            }
        }

        return { killedEnemies, totalExp };
    }

    // 重置遊戲狀態
    resetGameState(): void {
        this.enemies.clear();
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
        enemy.initializeByType(type); // 使用新的初始化方法
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
