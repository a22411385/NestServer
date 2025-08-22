import { type } from "@colyseus/schema";
import { UnitType } from "../GameState";
import { ServerEnemy } from "./Enemy";
import { ServerGameUnit } from "./GameUnit";

// 玩家操控的主要單位
export class ServerHero extends ServerGameUnit {

    @type("number") invincibleRemaining: number = 0; // 無敵剩餘時間 (ms)
    @type("number") level: number = 1;
    @type("number") exp: number = 0;
    @type("number") attackDamage: number = 15; // 攻擊傷害
    @type("number") attackRange: number = 100; // 攻擊範圍
    @type("number") attackSpeed: number = 1000; // 攻擊間隔 (毫秒)
    @type("number") bulletSpeed: number = 200; // 子彈速度 (像素/秒)
    @type("string") bulletType: string = "basic"; // 子彈類型

    // 攻擊計時器 (不同步給客戶端)
    private lastAttackTime: number = 0;
    private autoAttackEnabled: boolean = true;

    constructor() {
        super();
        this.hp = 100;
        this.maxHp = 100;
        this.speed = 50; // 每秒移動100像素
        this.radius = 20;
        this.type = UnitType.hero;
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

        // 升級時提升攻擊速度 (減少攻擊間隔)
        this.attackSpeed = Math.max(300, this.attackSpeed - 50);
    }

    // 攻擊敵人 (舊版本，保留用於近戰攻擊)
    attackEnemy(enemy: ServerEnemy): boolean {
        if (this.isInRange(enemy, this.attackRange)) {
            const killed = enemy.takeDamage(this.attackDamage);
            if (killed) {
                this.gainExp(enemy.expReward);
            }
            return killed;
        }
        return false;
    }

    // 檢查是否可以攻擊
    canAttack(): boolean {
        const currentTime = Date.now();
        return this.autoAttackEnabled &&
            (currentTime - this.lastAttackTime) >= this.attackSpeed;
    }

    // 尋找最近的敵人
    findNearestEnemy(enemies: ServerEnemy[]): ServerEnemy | null {
        let nearestEnemy: ServerEnemy | null = null;
        let minDistance = this.attackRange;

        for (const enemy of enemies) {
            if (enemy.isDead) continue;

            const distance = this.getDistanceTo(enemy);
            if (distance <= minDistance) {
                nearestEnemy = enemy;
                minDistance = distance;
            }
        }

        return nearestEnemy;
    }

    // 計算到目標的距離
    private getDistanceTo(target: ServerGameUnit): number {
        const dx = target.position.x - this.position.x;
        const dy = target.position.y - this.position.y;
        return Math.hypot(dx, dy);
    }

    // 計算射向目標的方向向量
    private getDirectionToTarget(target: ServerGameUnit): { x: number, y: number } {
        const dx = target.position.x - this.position.x;
        const dy = target.position.y - this.position.y;
        const length = Math.hypot(dx, dy);

        if (length === 0) return { x: 1, y: 0 };

        return { x: dx / length, y: dy / length };
    }

    // 執行自動攻擊 (返回子彈創建資訊)
    tryAutoAttack(enemies: ServerEnemy[]): {
        shouldCreateBullet: boolean,
        bulletInfo?: {
            startPosition: { x: number, y: number },
            direction: { x: number, y: number },
            damage: number,
            speed: number,
            bulletType: string,
            ownerId: string
        }
    } {
        if (!this.canAttack()) {
            return { shouldCreateBullet: false };
        }

        const target = this.findNearestEnemy(enemies);
        if (!target) {
            return { shouldCreateBullet: false };
        }

        // 更新攻擊時間
        this.lastAttackTime = Date.now();

        // 計算子彈發射資訊
        const direction = this.getDirectionToTarget(target);

        return {
            shouldCreateBullet: true,
            bulletInfo: {
                startPosition: { x: this.position.x, y: this.position.y },
                direction: direction,
                damage: this.attackDamage,
                speed: this.bulletSpeed,
                bulletType: this.bulletType,
                ownerId: this.id
            }
        };
    }

    // 設置自動攻擊開關
    setAutoAttack(enabled: boolean): void {
        this.autoAttackEnabled = enabled;
    }

    // 重置攻擊計時器 (用於技能或特殊情況)
    resetAttackTimer(): void {
        this.lastAttackTime = 0;
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