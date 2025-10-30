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
    private aiState: string = "chase"; // AI 狀態: chase, attack, windup, idle
    private lastAttackTime: number = 0; // 上次攻擊時間

    // 🆕 攻擊前搖系統
    private windupStartTime: number = 0; // 前搖開始時間
    private windupDuration: number = 300; // 前搖時長 (ms) - 默認值，會被配置覆蓋
    private windupTargetId: string = ""; // 前搖時鎖定的目標ID
    private windupTargetPosition: { x: number, y: number } | null = null; // 前搖時鎖定的目標位置

    /**
     * 🆕 設置攻擊前搖時長（從配置讀取）
     */
    public setWindupDuration(duration: number): void {
        this.windupDuration = duration;
    }

    /**
     * 🆕 獲取攻擊前搖時長
     */
    public getWindupDuration(): number {
        return this.windupDuration;
    }

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

        // 🆕 處理攻擊前搖狀態
        if (this.aiState === "windup") {
            this.handleWindup(currentTime);
            return;
        }

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

    /**
     * 🆕 處理攻擊前搖階段
     */
    private handleWindup(currentTime: number): void {
        const windupElapsed = currentTime - this.windupStartTime;

        // 前搖期間保持靜止
        this.vx = 0;
        this.vy = 0;

        // 前搖完成，執行實際攻擊
        if (windupElapsed >= this.windupDuration) {
            this.executeAttack(currentTime);
        }
    }

    /**
     * 🆕 執行實際攻擊（前搖完成後）
     */
    private executeAttack(currentTime: number): void {
        // 找到前搖時鎖定的目標
        const target = this.targetCache;

        if (!target || target.isDead) {
            // 目標已死亡或消失，攻擊失敗
            console.log(`❌ Enemy ${this.id} attack failed - target lost`);
            this.aiState = "chase";
            this.isAttacking = false;
            this.windupTargetId = "";
            this.windupTargetPosition = null;
            return;
        }

        // 檢查目標是否還在攻擊範圍內
        const distanceToTarget = this.getDistanceTo(target);
        if (distanceToTarget > this.attackRange) {
            // 目標已離開範圍，攻擊失敗
            console.log(`❌ Enemy ${this.id} attack failed - target out of range (${distanceToTarget.toFixed(0)} > ${this.attackRange})`);
            this.aiState = "chase";
            this.isAttacking = false;
            this.windupTargetId = "";
            this.windupTargetPosition = null;
            return;
        }

        // 執行攻擊
        console.log(`✅ Enemy ${this.id} successfully hit hero ${target.id}`);
        this.attackTarget(target);

        // 重置狀態
        this.aiState = "chase";
        this.isAttacking = false;
        this.windupTargetId = "";
        this.windupTargetPosition = null;
    }

    // 嘗試攻擊 - 🆕 改為啟動前搖
    private attemptAttack(target: ServerHero, currentTime: number): boolean {
        // 檢查攻擊冷卻
        if (currentTime - this.lastAttackTime < this.attackSpeed) {
            return false;
        }

        // 🆕 開始前搖
        this.windupStartTime = currentTime;
        this.windupTargetId = target.id;
        this.windupTargetPosition = { x: target.position.x, y: target.position.y };
        this.aiState = "windup";
        this.isAttacking = true;
        this.attackStartTime = currentTime; // 用於前端動畫同步

        // 更新最後攻擊時間（包含前搖時間）
        this.lastAttackTime = currentTime;

        console.log(`⚔️ Enemy ${this.id} starts windup against hero ${target.id} (${this.windupDuration}ms)`);

        return true;
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

    // 🔧 已廢棄：根據類型初始化屬性（現在使用 EnemyFactory 從配置讀取）
    // 保留此方法以防向後兼容需求
    initializeByType(lv: number): void {
        console.warn(`⚠️ initializeByType() is deprecated. Use EnemyFactory.createEnemy() instead.`);
        this.lv = lv;
        switch (lv) {
            case 1: // 普通殭屍（默認值）
                this.hp = this.maxHp = 20;
                this.moveSpeed = 50;
                this.damage = 10;
                this.expReward = 1;
                this.attackSpeed = 1000; // 攻擊冷卻
                this.attackRange = 60; // 攻擊距離
                this.windupDuration = 300; // 前搖時間
                break;
            case 2: // 快速殭屍
                this.hp = this.maxHp = 15;
                this.moveSpeed = 80;
                this.damage = 8;
                this.expReward = 2;
                this.attackSpeed = 800;
                this.attackRange = 55;
                this.windupDuration = 200;
                break;
            case 3: // 強壯殭屍
                this.hp = this.maxHp = 40;
                this.moveSpeed = 30;
                this.damage = 15;
                this.expReward = 3;
                this.attackSpeed = 1500;
                this.attackRange = 70;
                this.windupDuration = 400;
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
