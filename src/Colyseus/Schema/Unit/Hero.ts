import { type } from "@colyseus/schema";
import { UnitType } from "../GameState";
import { ServerEnemy } from "./Enemy";
import { ServerGameUnit } from "./GameUnit";
export type StatType = 'vit' | 'str' | 'agi' | 'int';
// 玩家操控的主要單位
export class ServerHero extends ServerGameUnit {

    @type("number") invincibleRemaining: number = 0; // 無敵剩餘時間 (ms)
    @type("number") level: number = 1;
    @type("number") exp: number = 0;

    @type("number") public vit: number = 10;        // 體質 (影響血量)
    @type("number") public str: number = 10;        // 力量 (影響攻擊力)
    @type("number") public agi: number = 10;         // 敏捷 (影響速度)
    @type("number") public int: number = 10;    // 智力 (影響魔力)

    // @type("number") bulletSpeed: number = 200; // 子彈速度 (像素/秒)
    @type("string") bulletType: string = "basic"; // 子彈類型

    @type("number") public expToNext: number = 100;     // 升級所需經驗
    @type("number") public skillPoints: number = 0;     // 技能點數
    @type("number") public statPoints: number = 0;      // 屬性點數
    @type("number") public usedPoints: number = 0;      // 已使用的屬性點數


    // 基礎屬性
    @type("number") public baseHp: number = 100;
    @type("number") public baseAttackDamage: number = 10;
    @type("number") public baseAttackSpeed: number = 1000;
    @type("number") public baseSpeed: number = 3;

    //能量
    @type("number") public baseMp: number = 100;
    @type("number") public maxMp: number = 100;
    @type("number") public mp: number = 100;
    @type("number") public mpRegen: number = 1; // 每秒回復的能量值

    //副屬性
    //經驗獲得倍率
    @type("number") public baseExpMultiplier: number = 30;

    @type("number") public baseCritRate: number = 0; // 暴擊率 (百分比)
    @type("number") public baseDodgeRate: number = 0; // 閃避率 (百分比)



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
        this.attackRange = 1000;

        this.vit = 10;
        this.str = 10;
        this.agi = 10;
        this.int = 10;
        this.usedPoints = 0;
        // 根據起始屬性計算基礎數值
        this.recalculateStats();
    }

    /**
       * 添加經驗值並檢查升級
    */
    public addExperience(amount: number): boolean {
        this.exp += amount * this.baseExpMultiplier;

        if (this.exp >= this.expToNext) {
            return this.levelUp();
        }
        return false;
    }

    /**
     * 升級邏輯
     */
    private levelUp(): boolean {
        const oldLevel = this.level;

        // 扣除升級所需經驗
        this.exp -= this.expToNext;
        this.level += 1;

        // 計算下次升級經驗 (指數增長)
        this.expToNext = Math.floor(100 * Math.pow(1.5, this.level - 1));

        // 獲得點數
        this.skillPoints += 1;
        this.statPoints += 5;

        // 提升基礎屬性 (每級小幅提升)
        this.baseHp += 10;
        this.baseAttackDamage += 2;
        this.maxHp = this.baseHp; // 更新最大血量
        this.hp = this.maxHp;     // 升級時回滿血

        this.usedPoints = 0;

        // 重新計算實際屬性
        this.recalculateStats();

        console.log(`${this.name} 升級到 ${this.level} 級！`);
        return true;
    }

    // 添加獲取總屬性的方法
    public getTotalStats(): {
        vitality: number,
        strength: number,
        agility: number,
        intelligence: number
    } {
        return {
            vitality: this.vit,
            strength: this.str,
            agility: this.agi,
            intelligence: this.int
        };
    }
    // 重新計算屬性時也要考慮總屬性加成
    public recalculateStats(): void {
        // 基於總屬性計算實際數值
        this.maxHp = this.baseHp + (this.vit * 5);
        this.attackDamage = this.baseAttackDamage + (this.str * 2);
        this.speed = this.baseSpeed + (this.agi * 0.5);
        this.maxMp = this.baseMp + (this.int * 3);

        // 確保當前血量不超過最大血量
        if (this.hp > this.maxHp) {
            this.hp = this.maxHp;
        }

        // 確保當前魔力不超過最大魔力
        if (this.mp > this.maxMp) {
            this.mp = this.maxMp;
        }
    }

    public allocateStatPoint(stat: StatType, points: number = 1): boolean {
        if (this.statPoints < points) return false;

        this.statPoints -= points;
        this.usedPoints += points;
        switch (stat) {
            case 'vit':
                this.vit += points;
                this.baseHp += points * 5; // 每點體質+5血量
                break;
            case 'str':
                this.str += points;
                this.baseAttackDamage += points * 2; // 每點力量+2攻擊
                break;
            case 'agi':
                this.agi += points;
                this.baseSpeed += points * 0.5; // 每點敏捷+0.5速度
                break;
            case 'int':
                this.int += points;
                this.baseMp += points * 3; // 每點智力+3魔力
                break;
        }

        this.recalculateStats();
        return true;
    }


    // 攻擊敵人 (舊版本，保留用於近戰攻擊)
    attackEnemy(enemy: ServerEnemy): boolean {
        if (this.isInRange(enemy, this.attackRange)) {
            const killed = enemy.takeDamage(this.attackDamage);
            if (killed) {
                this.addExperience(enemy.expReward);
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
            //   speed: number,
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
                //  speed: this.bulletSpeed,
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