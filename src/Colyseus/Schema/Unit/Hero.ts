import { type } from "@colyseus/schema";
import { UnitType } from "../GameState";
import { Enemy } from "./Enemy";
import { GameUnit } from "./GameUnit";

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