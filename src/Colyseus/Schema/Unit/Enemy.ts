import { MapSchema, type } from "@colyseus/schema";
import { UnitType } from "../GameState";
import { ServerHero } from "./Hero";
import { ServerGameUnit } from "./GameUnit";

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
    private cachedAllUnitsArray: ServerGameUnit[] = []; // 快取所有單位陣列

    constructor() {
        super();
        this.hp = 50; // 🔧 修復：與 maxHp 一致
        this.maxHp = 50;
        this.moveSpeed = 30; // 每秒移動50像素
        this.scale = 1.0; // 預設縮放為1
        this.type = UnitType.enemy;
        this.owner = 'enemy';
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
