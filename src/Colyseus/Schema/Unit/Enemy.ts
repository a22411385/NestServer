import { MapSchema, type } from "@colyseus/schema";
import { UnitType } from "../GameState";
import { ServerHero } from "./Hero";
import { ServerGameUnit } from "./GameUnit";
import { Vector2, BattleMathUtils } from "@/Shared/BattleMathUtils";

// 殭屍 - 伺服器端完整版本
export class ServerEnemy extends ServerGameUnit {

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
    private targetCache: ServerHero | null = null; // 快取目標
    private targetCacheTime: number = 0; // 目標快取時間

    // 碰撞檢測相關
    private collisionCheckDistance: number = 40; // 碰撞檢測距離
    private alternativeRoutes: Vector2[] = []; // 替代路線選項
    private lastCollisionTime: number = 0; // 上次碰撞時間
    private allowOverlapTime: number = 0; // 允許重疊的時間（攻擊用）
    private overlapDuration: number = 500; // 重疊持續時間（毫秒）
    private cachedAllUnits: MapSchema<ServerGameUnit> | undefined; // 快取所有單位

    constructor() {
        super();
        this.hp = 20;
        this.maxHp = 20;
        this.moveSpeed = 50; // 每秒移動50像素
        this.radius = 15;
        this.collisionWidth = 24;
        this.collisionHeight = 30;
        this.type = UnitType.enemy;
        this.owner = 'enemy'
    }

    // 尋找最近的目標 - 優化版本使用快取
    findNearestTarget(targets: MapSchema<ServerHero>): ServerHero | null {
        const currentTime = Date.now();

        // 如果快取的目標仍然有效且未過期，直接返回
        if (this.targetCache &&
            !this.targetCache.isDead &&
            currentTime - this.targetCacheTime < 500) { // 0.5秒快取
            return this.targetCache;
        }

        let nearestTarget: ServerHero | null = null;
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
    getDistanceTo(target: ServerGameUnit): number {
        const dx = target.position.x - this.position.x;
        const dy = target.position.y - this.position.y;
        return Math.hypot(dx, dy);
    }

    // AI 更新邏輯 - 優化版本，包含碰撞檢測
    updateAI(targets: MapSchema<ServerHero>, deltaTime: number, currentTime: number, allUnits?: MapSchema<ServerGameUnit>): Vector2 {
        let moveVector = { x: 0, y: 0 };
        if (this.isDead) return moveVector;

        // 儲存所有單位的引用供碰撞檢測使用
        this.cachedAllUnits = allUnits;

        // 清理過期的碰撞狀態
        this.cleanupCollisionState(currentTime);

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

    // 追蹤目標 - 增強版本，包含碰撞檢測
    private chaseTarget(target: ServerGameUnit, deltaTime: number): Vector2 {
        // 基本方向向量（向目標移動）
        const dx = target.position.x - this.position.x;
        const dy = target.position.y - this.position.y;
        const distance = Math.hypot(dx, dy);

        if (distance === 0) {
            return { x: 0, y: 0 };
        }

        // 基本移動方向
        let moveX = dx / distance;
        let moveY = dy / distance;

        // 計算預期的下一個位置
        const nextX = this.position.x + moveX * this.moveSpeed * (deltaTime / 1000);
        const nextY = this.position.y + moveY * this.moveSpeed * (deltaTime / 1000);

        // 檢查與其他單位的碰撞
        const collisionResult = this.checkCollisionWithOthers(nextX, nextY, target);

        if (collisionResult.hasCollision) {
            if (collisionResult.isHeroTarget) {
                // 如果碰撞的是目標英雄，允許重疊進行攻擊
                console.log(`Enemy ${this.id} initiating melee attack on hero ${target.id}`);
                this.allowOverlapTime = Date.now() + this.overlapDuration;
                // 直接向目標移動，忽略碰撞
                this.vx = moveX;
                this.vy = moveY;
            } else {
                // 與其他單位碰撞，尋找替代路線
                const alternativeMove = this.findAlternativeRoute(target, nextX, nextY);
                this.vx = alternativeMove.x;
                this.vy = alternativeMove.y;
            }
        } else {
            // 沒有碰撞，正常移動
            this.vx = moveX;
            this.vy = moveY;
        }

        return { x: this.vx, y: this.vy };
    }

    /**
     * 檢查與其他單位的碰撞
     */
    private checkCollisionWithOthers(nextX: number, nextY: number, target: ServerGameUnit): {
        hasCollision: boolean;
        isHeroTarget: boolean;
        collidingUnits: ServerGameUnit[];
    } {
        const result = {
            hasCollision: false,
            isHeroTarget: false,
            collidingUnits: [] as ServerGameUnit[]
        };

        // 檢查是否在允許重疊時間內（攻擊狀態）
        if (Date.now() < this.allowOverlapTime) {
            return result; // 攻擊狀態下不檢查碰撞
        }

        // 取得所有單位進行碰撞檢測
        const allUnits = this.getAllUnitsForCollision();

        for (const unit of allUnits) {
            if (unit.id === this.id || unit.isDead) continue; // 跳過自己和死亡單位

            // 檢查碰撞
            if (this.checkUnitCollision(nextX, nextY, unit)) {
                result.hasCollision = true;
                result.collidingUnits.push(unit);

                // 檢查是否是目標英雄
                if (unit.id === target.id && unit.type === UnitType.hero) {
                    result.isHeroTarget = true;
                }
            }
        }

        return result;
    }

    /**
     * 檢查與單一單位的碰撞
     */
    private checkUnitCollision(nextX: number, nextY: number, other: ServerGameUnit): boolean {
        const myWidth = this.collisionWidth || this.radius * 2;
        const myHeight = this.collisionHeight || this.radius * 2;
        const otherWidth = other.collisionWidth || other.radius * 2;
        const otherHeight = other.collisionHeight || other.radius * 2;

        return BattleMathUtils.isRectCollide(
            nextX, nextY, myWidth, myHeight,
            other.position.x, other.position.y, otherWidth, otherHeight
        );
    }

    /**
     * 尋找替代路線
     */
    private findAlternativeRoute(target: ServerGameUnit, blockedX: number, blockedY: number): Vector2 {
        const directions = [
            { x: 1, y: 0 },   // 右
            { x: -1, y: 0 },  // 左
            { x: 0, y: 1 },   // 下
            { x: 0, y: -1 },  // 上
            { x: 0.707, y: 0.707 },   // 右下
            { x: -0.707, y: 0.707 },  // 左下
            { x: 0.707, y: -0.707 },  // 右上
            { x: -0.707, y: -0.707 }, // 左上
        ];

        const targetDirection = {
            x: target.position.x - this.position.x,
            y: target.position.y - this.position.y
        };
        const targetDistance = Math.hypot(targetDirection.x, targetDirection.y);

        if (targetDistance > 0) {
            targetDirection.x /= targetDistance;
            targetDirection.y /= targetDistance;
        }

        let bestDirection = { x: 0, y: 0 };
        let bestScore = -Infinity;

        for (const direction of directions) {
            // 計算這個方向的下一個位置
            const testX = this.position.x + direction.x * this.moveSpeed * 0.1; // 小步測試
            const testY = this.position.y + direction.y * this.moveSpeed * 0.1;

            // 檢查這個方向是否會碰撞
            const allUnits = this.getAllUnitsForCollision();
            let hasCollision = false;

            for (const unit of allUnits) {
                if (unit.id === this.id || unit.isDead) continue;
                if (unit.id === target.id && unit.type === UnitType.hero) continue; // 允許與目標英雄碰撞

                if (this.checkUnitCollision(testX, testY, unit)) {
                    hasCollision = true;
                    break;
                }
            }

            if (!hasCollision) {
                // 計算這個方向與目標方向的相似度
                const dotProduct = direction.x * targetDirection.x + direction.y * targetDirection.y;
                const score = dotProduct; // 越接近目標方向分數越高

                if (score > bestScore) {
                    bestScore = score;
                    bestDirection = direction;
                }
            }
        }

        // 如果找不到好的方向，嘗試向後退
        if (bestScore === -Infinity) {
            bestDirection = {
                x: -targetDirection.x * 0.5,
                y: -targetDirection.y * 0.5
            };
        }

        return bestDirection;
    }

    /**
     * 取得所有需要檢查碰撞的單位
     */
    private getAllUnitsForCollision(): ServerGameUnit[] {
        if (!this.cachedAllUnits) {
            return [];
        }

        const units: ServerGameUnit[] = [];
        for (const [unitId, unit] of this.cachedAllUnits) {
            if (!unit.isDead) {
                units.push(unit);
            }
        }
        return units;
    }

    /**
     * 清理過期的碰撞狀態
     */
    private cleanupCollisionState(currentTime: number): void {
        // 重置過期的重疊允許狀態
        if (currentTime > this.allowOverlapTime) {
            this.allowOverlapTime = 0;
        }
    }

    /**
     * 檢查是否在攻擊狀態中（允許與英雄重疊）
     */
    public isInAttackMode(): boolean {
        return Date.now() < this.allowOverlapTime;
    }

    // 嘗試攻擊
    private attemptAttack(target: ServerHero, currentTime: number): boolean {
        if (currentTime - this.lastAttackTime >= this.attackCooldown) {
            this.lastAttackTime = currentTime;

            // 開始攻擊時允許重疊移動
            if (this.getDistanceTo(target) <= this.attackRange) {
                this.allowOverlapTime = currentTime + this.overlapDuration;
                console.log(`Enemy ${this.id} starting attack sequence on hero ${target.id}`);
            }

            return this.attackTarget(target);
        }
        return false;
    }

    // 攻擊目標
    attackTarget(target: ServerGameUnit): boolean {
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
                this.moveSpeed = 50;
                this.damage = 10;
                this.expReward = 1;
                this.attackCooldown = 1000;
                break;
            case 2: // 快速殭屍
                this.hp = this.maxHp = 15;
                this.moveSpeed = 80;
                this.damage = 8;
                this.expReward = 2;
                this.attackCooldown = 800;
                break;
            case 3: // 強壯殭屍
                this.hp = this.maxHp = 40;
                this.moveSpeed = 30;
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
