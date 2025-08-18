import { MapSchema, type } from "@colyseus/schema";
import { UnitType } from "../GameState";
import { Hero } from "./Hero";
import { GameUnit } from "./GameUnit";
import { Vector2 } from "@/Shared/BattleMathUtils";

// 殭屍 - 伺服器端完整版本
export class Enemy extends GameUnit {

    @type("number") damage: number = 10; // 攻擊傷害
    @type("number") expReward: number = 1; // 擊殺獎勵經驗值
    @type("number") lv: number = 1; // 敵人等級

    // AI 狀態 - 不同步，僅伺服器端使用
    private aiState: string = "chase"; // AI 狀態: chase, attack, idle
    private lastAttackTime: number = 0; // 上次攻擊時間
    private attackCooldown: number = 1000; // 攻擊冷卻 (ms)

    // 效能優化屬性 (不需要同步)
    private lastAIUpdateTime: number = 0; // 上次AI更新時間
    private aiUpdateInterval: number = 200; // AI更新間隔 (ms) - 5 FPS
    private targetCache: Hero | null = null; // 快取目標
    private targetCacheTime: number = 0; // 目標快取時間

    constructor() {
        super();
        this.hp = 20;
        this.maxHp = 20;
        this.speed = 50; // 每秒移動50像素
        this.radius = 15;
        this.type = UnitType.enemy;
        this.owner = 'enemy'
    }

    // 尋找最近的目標 - 優化版本使用快取
    findNearestTarget(targets: MapSchema<Hero>): Hero | null {
        const currentTime = Date.now();

        // 如果快取的目標仍然有效且未過期，直接返回
        if (this.targetCache &&
            !this.targetCache.isDead &&
            currentTime - this.targetCacheTime < 500) { // 0.5秒快取
            return this.targetCache;
        }

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

        // 更新快取
        this.targetCache = nearestTarget;
        this.targetCacheTime = currentTime;

        return nearestTarget;
    }

    // 獲取到目標的距離
    getDistanceTo(target: GameUnit): number {
        const dx = target.position.x - this.position.x;
        const dy = target.position.y - this.position.y;
        return Math.hypot(dx, dy);
    }

    // AI 更新邏輯 - 優化版本
    updateAI(targets: MapSchema<Hero>, deltaTime: number, currentTime: number): Vector2 {
        let moveVector = { x: 0, y: 0 };
        if (this.isDead) return moveVector;

        // 減少不必要的計算頻率
        const shouldUpdateAI = currentTime - this.lastAIUpdateTime >= this.aiUpdateInterval;
        if (!shouldUpdateAI && this.aiState !== "attack") return moveVector;

        const target = this.findNearestTarget(targets);
        if (!target) {
            this.aiState = "idle";
            return moveVector;
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
            moveVector = this.chaseTarget(target, deltaTime);
        }

        this.lastAIUpdateTime = currentTime;
        return moveVector;
    }

    // 追蹤目標
    private chaseTarget(target: GameUnit, deltaTime: number): Vector2 {
        // 移動邏輯由外部實現，這裡只設置方向向量
        const dx = target.position.x - this.position.x;
        const dy = target.position.y - this.position.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 0) {
            this.vx = dx / distance; // 正規化向量
            this.vy = dy / distance;
        } else {
            this.vx = 0;
            this.vy = 0;
        }
        return { x: this.vx, y: this.vy };

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
    initializeByType(lv: number): void {
        this.lv = lv;
        switch (lv) {
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

    // 獲取AI狀態（供伺服器端調試用）
    getAIState(): string {
        return this.aiState;
    }

    // 設置AI狀態（供伺服器端使用）
    setAIState(state: string): void {
        this.aiState = state;
    }

    // 檢查是否可以攻擊
    canAttack(currentTime: number): boolean {
        return currentTime - this.lastAttackTime >= this.attackCooldown;
    }

    // 設置最後攻擊時間
    setLastAttackTime(time: number): void {
        this.lastAttackTime = time;
    }
}
