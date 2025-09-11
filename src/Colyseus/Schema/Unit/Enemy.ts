import { MapSchema, type } from "@colyseus/schema";
import { UnitType } from "../GameState";
import { ServerHero } from "./Hero";
import { ServerGameUnit } from "./GameUnit";
import { Vector2 } from "@/Types";
import { BattleMathUtils } from "@/Util/BattleMathUtils";

// 殭屍 - 伺服器端完整版本
export class ServerEnemy extends ServerGameUnit {

    @type("number") damage: number = 10; // 攻擊傷害
    @type("number") expReward: number = 1; // 擊殺獎勵經驗值
    @type("number") lv: number = 1; // 敵人等級

    @type("number") public attackStartTime: number = 0; // 攻擊開始時間 (用於前端動畫同步)
    @type("boolean") public isAttacking: boolean = false; // 是否正在攻擊

    // AI 狀態 - 不同步，僅伺服器端使用
    private aiState: string = "chase"; // AI 狀態: chase, attack, idle
    private lastAttackTime: number = 0; // 上次攻擊時間

    // 效能優化屬性 (不需要同步)
    private lastAIUpdateTime: number = 0; // 上次AI更新時間
    private aiUpdateInterval: number = 200; // AI更新間隔 (ms) - 5 FPS
    private targetCache: ServerHero | null = null; // 快取目標
    private targetCacheTime: number = 0; // 目標快取時間

    // 🆕 群體行為相關屬性
    private lastMovementAttempt: number = 0;
    private stuckCounter: number = 0;
    private stuckThreshold: number = 5; // 卡住檢測閾值
    private lastPosition: { x: number; y: number } = { x: 0, y: 0 };
    private groupPriority: number = 0; // 群體優先級（用於解決衝突）

    private separationRadius: number = 40; // 分離半徑
    private cachedAllUnitsArray: ServerGameUnit[] = []; // 快取所有單位陣列

    constructor() {
        super();
        this.hp = 50; // 🔧 修復：與 maxHp 一致
        this.maxHp = 50;
        this.moveSpeed = 30; // 每秒移動50像素
        this.scale = 1.0; // 預設縮放為1
        this.type = UnitType.enemy;
        this.owner = 'enemy';

        // 🆕 設置隨機群體優先級（用於打破對稱性）
        this.groupPriority = Math.random();
        this.lastPosition = { x: this.position.x, y: this.position.y };
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

    /**
     * 🆕 群體分離力計算 - 避免敵人聚集
     */
    private calculateSeparationForce(allUnits: ServerGameUnit[]): { x: number; y: number } {
        let separationForce = { x: 0, y: 0 };
        let neighborCount = 0;

        for (const other of allUnits) {
            if (other === this || other.isDead || other.type !== UnitType.enemy) {
                continue;
            }

            const distance = Math.hypot(
                other.position.x - this.position.x,
                other.position.y - this.position.y
            );

            // 🎯 只考慮分離半徑內的其他敵人
            if (distance < this.separationRadius && distance > 0) {
                // 計算遠離其他敵人的力
                const avoidX = (this.position.x - other.position.x) / distance;
                const avoidY = (this.position.y - other.position.y) / distance;

                // 距離越近，分離力越強
                const strength = (this.separationRadius - distance) / this.separationRadius;

                separationForce.x += avoidX * strength;
                separationForce.y += avoidY * strength;
                neighborCount++;
            }
        }

        // 歸一化分離力
        if (neighborCount > 0) {
            separationForce.x /= neighborCount;
            separationForce.y /= neighborCount;

            // 限制分離力的最大強度
            const maxSeparationForce = 0.5;
            const magnitude = Math.hypot(separationForce.x, separationForce.y);
            if (magnitude > maxSeparationForce) {
                separationForce.x = (separationForce.x / magnitude) * maxSeparationForce;
                separationForce.y = (separationForce.y / magnitude) * maxSeparationForce;
            }
        }

        return separationForce;
    }

    /**
     * 🆕 卡住檢測和處理
     */
    private handleStuckDetection(): boolean {
        const currentTime = Date.now();

        // 檢查是否移動了足夠距離
        const distanceMoved = Math.hypot(
            this.position.x - this.lastPosition.x,
            this.position.y - this.lastPosition.y
        );

        // 如果移動距離很小，增加卡住計數器
        if (distanceMoved < 2 && currentTime - this.lastMovementAttempt > 500) {
            this.stuckCounter++;

            if (this.stuckCounter >= this.stuckThreshold) {
                console.log(`🚫 Enemy ${this.id} is stuck, applying unstuck behavior`);
                return this.applyUnstuckBehavior();
            }
        } else {
            // 移動正常，重置計數器
            this.stuckCounter = Math.max(0, this.stuckCounter - 1);
        }

        // 更新位置記錄
        this.lastPosition = { x: this.position.x, y: this.position.y };
        this.lastMovementAttempt = currentTime;

        return false;
    }

    /**
     * 🆕 脫困行為
     */
    private applyUnstuckBehavior(): boolean {
        // 生成一個強制脫困向量
        const escapeAngle = Math.random() * Math.PI * 2;
        const escapeDistance = 50 + Math.random() * 30; // 50-80 像素的逃脫距離

        const escapeX = Math.cos(escapeAngle) * escapeDistance;
        const escapeY = Math.sin(escapeAngle) * escapeDistance;

        const newX = this.position.x + escapeX;
        const newY = this.position.y + escapeY;

        // 檢查逃脫位置是否在地圖範圍內
        if (newX >= 50 && newX <= 750 && newY >= 50 && newY <= 550) {
            this.position.x = newX;
            this.position.y = newY;
            this.stuckCounter = 0;
            console.log(`🏃 Enemy ${this.id} escaped to (${newX.toFixed(1)}, ${newY.toFixed(1)})`);
            return true;
        }

        return false;
    }

    // 獲取到目標的距離
    getDistanceTo(target: ServerGameUnit): number {
        const dx = target.position.x - this.position.x;
        const dy = target.position.y - this.position.y;
        return Math.hypot(dx, dy);
    }

    /**
     * 🔧 修改 updateAI 返回速度向量而非位置
     */
    public updateAI(targets: MapSchema<ServerHero>, deltaTime: number, currentTime: number, allUnits?: MapSchema<ServerGameUnit>): void {
        if (this.isDead) {
            this.vx = 0;
            this.vy = 0;
            return;
        }

        // 🎯 更新快取的所有單位陣列（用於群體協調）
        this.cachedAllUnitsArray = [];
        if (allUnits) {
            for (const unit of allUnits.values()) {
                this.cachedAllUnitsArray.push(unit);
            }
        }

        // 🆕 儲存所有單位的陣列供群體行為使用
        if (allUnits) {
            this.cachedAllUnitsArray = Array.from(allUnits.values());
        }

        // 減少不必要的計算頻率
        const shouldUpdateAI = currentTime - this.lastAIUpdateTime >= this.aiUpdateInterval;
        if (!shouldUpdateAI && this.aiState !== "attack") {
            // 保持當前移動狀態
            return;
        }

        const target = this.findNearestTarget(targets);
        if (!target) {
            this.aiState = "idle";
            this.vx = 0;
            this.vy = 0;
            return;
        }

        const distanceToTarget = this.getDistanceTo(target);

        // 🆕 使用標準攻擊距離檢查，不再基於碰撞半徑
        if (distanceToTarget <= this.attackRange) {
            this.aiState = "attack";
            // 攻擊時停止移動，設置速度向量為0
            this.vx = 0;
            this.vy = 0;
            this.attemptAttack(target, currentTime);
        } else {
            // 超出攻擊範圍，繼續追擊
            this.aiState = "chase";
            this.isAttacking = false; // 🆕 清除攻擊狀態

            // 🆕 簡化追擊邏輯 - 直接朝向目標移動
            const distance = this.getDistanceTo(target);
            if (distance > 0) {
                // 計算朝向目標的單位向量
                const directionX = (target.position.x - this.position.x) / distance;
                const directionY = (target.position.y - this.position.y) / distance;

                // 設置移動速度向量
                this.vx = directionX;
                this.vy = directionY;
            } else {
                this.vx = 0;
                this.vy = 0;
            }
        }

        this.lastAIUpdateTime = currentTime;
    }

    /**
     * 🔧 修改 chaseTargetImproved 返回理想位置
     */
    private chaseTargetImproved(target: ServerGameUnit, allUnits: ServerGameUnit[]): Vector2 {
        const distance = Math.hypot(
            target.position.x - this.position.x,
            target.position.y - this.position.y
        );

        // 檢查卡住狀態
        if (this.handleStuckDetection()) {
            return { x: this.position.x, y: this.position.y };
        }

        // 避免除零錯誤
        if (distance === 0) {
            return { x: this.position.x, y: this.position.y };
        }

        // 基本追蹤方向
        const chaseDirection = {
            x: (target.position.x - this.position.x) / distance,
            y: (target.position.y - this.position.y) / distance
        };

        // 計算群體分離力
        const separationForce = this.calculateSeparationForce(allUnits);

        // 🎯 計算理想的下一個位置，但不直接設置
        // 使用小步長來避免瞬移
        const stepSize = Math.min(this.moveSpeed * 0.1, 5); // 限制每次最大移動距離
        const combinedDirection = {
            x: chaseDirection.x + separationForce.x,
            y: chaseDirection.y + separationForce.y
        };

        // 歸一化合併後的方向向量
        const combinedLength = Math.hypot(combinedDirection.x, combinedDirection.y);
        if (combinedLength > 0) {
            combinedDirection.x /= combinedLength;
            combinedDirection.y /= combinedLength;
        }

        const idealX = this.position.x + combinedDirection.x * stepSize;
        const idealY = this.position.y + combinedDirection.y * stepSize;

        // 碰撞檢測
        const wouldCollide = this.checkCollisionAtPosition(idealX, idealY);

        if (!wouldCollide) {
            return { x: idealX, y: idealY };
        }

        // 嘗試側向移動
        const sideMovement = this.calculateSideMovement(chaseDirection);
        if (sideMovement) {
            return {
                x: this.position.x + sideMovement.x * stepSize,
                y: this.position.y + sideMovement.y * stepSize
            };
        }

        // 處理死鎖
        const deadlockResult = this.handleDeadlock(target);
        return {
            x: this.position.x + deadlockResult.x * stepSize,
            y: this.position.y + deadlockResult.y * stepSize
        };
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
        // TODO: 移除不再需要的碰撞攻擊相關方法
        /*
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
        */

        return { x: 0, y: 0 }; // 暫時返回值
    }

    /**
     * 🆕 檢查指定位置是否會碰撞
     */
    private checkCollisionAtPosition(nextX: number, nextY: number): boolean {
        for (const unit of this.cachedAllUnitsArray) {
            if (unit === this || unit.isDead || unit.type === UnitType.hero) {
                continue; // 跳過自己、死亡單位和英雄（可以攻擊英雄）
            }

            if (this.checkUnitCollision(nextX, nextY, unit)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 🔄 改進的側向移動計算
     */
    private calculateSideMovement(forwardDirection: { x: number; y: number }): { x: number; y: number } | null {
        const moveSpeed = this.moveSpeed / 60; // 轉換為每幀移動速度

        // 🎯 嘗試左右兩個側向移動方向
        const sideDirections = [
            { x: -forwardDirection.y, y: forwardDirection.x }, // 向左90度
            { x: forwardDirection.y, y: -forwardDirection.x }  // 向右90度
        ];

        // 🎯 隨機選擇側向，增加不可預測性
        if (Math.random() < 0.5) {
            sideDirections.reverse();
        }

        for (const sideDir of sideDirections) {
            // 結合前進和側向移動
            const testX = this.position.x + (forwardDirection.x * 0.3 + sideDir.x * 0.7) * moveSpeed;
            const testY = this.position.y + (forwardDirection.y * 0.3 + sideDir.y * 0.7) * moveSpeed;

            if (!this.checkCollisionAtPosition(testX, testY)) {
                return {
                    x: forwardDirection.x * 0.3 + sideDir.x * 0.7,
                    y: forwardDirection.y * 0.3 + sideDir.y * 0.7
                };
            }
        }

        return null;
    }

    /**
     * 🆕 處理死鎖情況
     */
    private handleDeadlock(target: ServerGameUnit): { x: number; y: number } {
        // 找到阻擋的其他敵人
        const blockingEnemies = this.cachedAllUnitsArray.filter(unit => {
            if (unit === this || unit.isDead || unit.type !== UnitType.enemy) {
                return false;
            }

            const distance = Math.hypot(
                unit.position.x - this.position.x,
                unit.position.y - this.position.y
            );

            return distance < (this.getScaledCollisionWidth() + (unit.collisionWidth * (unit.scale || 1))) / 2 + 5;
        });

        if (blockingEnemies.length > 0) {
            // 比較群體優先級，優先級低的讓路
            const hasHigherPriority = blockingEnemies.every(enemy => {
                const enemyPriority = (enemy as any).groupPriority || 0;
                return enemyPriority < this.groupPriority;
            });

            if (hasHigherPriority) {
                // 我有優先權，繼續前進
                const distance = Math.hypot(
                    target.position.x - this.position.x,
                    target.position.y - this.position.y
                );

                return {
                    x: (target.position.x - this.position.x) / distance * 0.5,
                    y: (target.position.y - this.position.y) / distance * 0.5
                };
            } else {
                // 我需要讓路，暫停
                this.stuckCounter++;
                return { x: 0, y: 0 };
            }
        }

        // 沒有其他敵人阻擋，可能是地形問題
        return { x: 0, y: 0 };
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

        // TODO: 移除不再需要的碰撞檢測相關方法
        /*

        // 取得所有單位進行碰撞檢測
        // const allUnits = this.getAllUnitsForCollision(); // TODO: 已移除

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
        */

        // 🆕 簡化版本：暫時返回沒有碰撞
        return {
            hasCollision: false,
            isHeroTarget: false,
            collidingUnits: []
        };
    }

    /**
     * 檢查與單一單位的碰撞
     */
    private checkUnitCollision(nextX: number, nextY: number, other: ServerGameUnit): boolean {
        const myWidth = this.getScaledCollisionWidth();
        const myHeight = this.getScaledCollisionHeight();
        const otherWidth = other.collisionWidth * (other.scale || 1);
        const otherHeight = other.collisionHeight * (other.scale || 1);

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
            // const allUnits = this.getAllUnitsForCollision(); // TODO: 已移除
            let hasCollision = false; // TODO: 暫時設為 false

            // TODO: 移除碰撞檢測邏輯
            /*
            for (const unit of allUnits) {
                if (unit.id === this.id || unit.isDead) continue;
                if (unit.id === target.id && unit.type === UnitType.hero) continue; // 允許與目標英雄碰撞

                if (this.checkUnitCollision(testX, testY, unit)) {
                    hasCollision = true;
                    break;
                }
            }
            */

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

    // TODO: 移除不再需要的碰撞相關方法
    /*
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

    private cleanupCollisionState(currentTime: number): void {
        // 重置過期的重疊允許狀態
        if (currentTime > this.allowOverlapTime) {
            this.allowOverlapTime = 0;
        }
    }

    public isInAttackMode(): boolean {
        return Date.now() < this.allowOverlapTime;
    }
    */

    /**
     * 獲取考慮縮放的碰撞寬度
     */
    public getScaledCollisionWidth(): number {
        return this.collisionWidth * this.scale;
    }

    /**
     * 獲取考慮縮放的碰撞高度
     */
    public getScaledCollisionHeight(): number {
        return this.collisionHeight * this.scale;
    }

    /**
     * 檢查目標是否在指定範圍內（使用矩形碰撞）
     */
    public isInCollisionRange(target: ServerGameUnit, additionalRange: number = 0): boolean {
        const distance = this.getDistanceTo(target);
        const myCollisionRadius = Math.max(this.getScaledCollisionWidth(), this.getScaledCollisionHeight()) / 2;
        const targetCollisionRadius = Math.max(
            target.collisionWidth * (target.scale || 1),
            target.collisionHeight * (target.scale || 1)
        ) / 2;

        return distance <= (myCollisionRadius + targetCollisionRadius + additionalRange);
    }

    // 嘗試攻擊
    private attemptAttack(target: ServerHero, currentTime: number): boolean {
        if (currentTime - this.lastAttackTime >= this.attackSpeed) {
            this.lastAttackTime = currentTime;
            this.attackStartTime = currentTime; // 🆕 記錄攻擊開始時間
            this.isAttacking = true; // 🆕 設置攻擊狀態

            console.log(`Enemy ${this.id} attacking hero ${target.id} at ${currentTime}`);

            // 攻擊並重置狀態（假設攻擊是瞬間的，實際可能需要延遲）
            const success = this.attackTarget(target);

            // 🆕 設置攻擊結束延遲（可用於前端動畫）
            setTimeout(() => {
                this.isAttacking = false;
            }, 300); // 300ms 後結束攻擊狀態

            return success;
        }
        return false;
    }

    // 攻擊目標 - 🆕 使用距離檢查而不是碰撞檢查
    attackTarget(target: ServerGameUnit): boolean {
        const distanceToTarget = this.getDistanceTo(target);
        if (distanceToTarget <= this.attackRange) {
            //    console.log(`Enemy ${this.id} deals ${this.damage} damage to ${target.id}`);
            return target.takeDamage(this.damage);
        }
        //  console.log(`Enemy ${this.id} attack missed - target out of range`);
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
                this.attackSpeed = 1000; // 攻擊間隔
                this.attackRange = 60; // 攻擊距離
                break;
            case 2: // 快速殭屍
                this.hp = this.maxHp = 15;
                this.moveSpeed = 80;
                this.damage = 8;
                this.expReward = 2;
                this.attackSpeed = 800; // 更快的攻擊速度
                this.attackRange = 55; // 稍短的攻擊距離
                break;
            case 3: // 強壯殭屍
                this.hp = this.maxHp = 40;
                this.moveSpeed = 30;
                this.damage = 15;
                this.expReward = 3;
                this.attackSpeed = 1500; // 較慢的攻擊速度
                this.attackRange = 70; // 較長的攻擊距離
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
        return currentTime - this.lastAttackTime >= this.attackSpeed;
    }

    // 設置最後攻擊時間
    setLastAttackTime(time: number): void {
        this.lastAttackTime = time;
    }
}
