import { ServerGameUnit } from "../../Unit/GameUnit";
import { UnitType } from "../../GameState";
// 移除 Schema 導入，WeaponBasic 現在是純邏輯層類
import { WeaponType } from ".";

export interface WeaponAttackResult {
    success: boolean;
    weaponId: string;
    targetIds?: string[];
    baseDamage: number; // 基礎傷害，實際傷害由 DamageSystem 計算
    effects?: AttackEffect[];
    visualEffects?: VisualEffect[];
    reason?: AttackFailReason;
    attackData?: {
        position: { x: number, y: number };
        direction: { x: number, y: number };
        range: number;
        sweepAngle?: number;
        targetPosition?: { x: number, y: number }; // 投射武器需要目標位置
        supportRadius?: number; // 支援武器需要支援範圍
    };
}

// 攻擊失敗原因
export enum AttackFailReason {
    ON_COOLDOWN = 'on_cooldown',
    NO_TARGET = 'no_target',
    OUT_OF_RANGE = 'out_of_range'
}

// 攻擊效果（移除舊的傷害相關邏輯）
export interface AttackEffect {
    type: 'knockback' | 'stun' | 'slow';
    targetId: string;
    value: number;
    direction?: { x: number, y: number };
}

// 視覺效果
export interface VisualEffect {
    type: 'swing' | 'slash' | 'explosion' | 'projectile' | 'support' | 'heal';
    eventType: string; // 對應的廣播事件名稱
    position: { x: number, y: number };
    direction?: { x: number, y: number };
    data?: any;
}

//武器基類：負責攻擊邏輯和目標選擇，不處理傷害計算
// 現在是純邏輯層類，不再同步到客戶端
export abstract class WeaponBasic {
    public weaponId: string = "";
    public weaponType: WeaponType = 'melee';
    public attackRange: number = 0;
    public baseDamage: number = 0; // 基礎傷害
    public attackSpeed: number = 0;  // 攻擊間隔 (毫秒)
    public rarity: string = "common"; // 武器稀有度
    public name: string = "";
    // 武器屬性加成
    public int: number = 0;
    public agi: number = 0;
    public str: number = 0;
    public vit: number = 0;

    // 服務器端屬性
    protected lastAttackTime: number = 0;

    constructor(weaponId: string, weaponType: WeaponType, attackRange: number, baseDamage: number, attackSpeed: number) {
        this.weaponId = weaponId;
        this.weaponType = weaponType;
        this.attackRange = attackRange;
        this.baseDamage = baseDamage;
        this.attackSpeed = attackSpeed;
    }

    /**
     * 嘗試攻擊 - 只負責攻擊邏輯和目標選擇，不處理傷害
     */
    public abstract tryAttack(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): WeaponAttackResult;

    /**
     * 檢查是否可以攻擊
     */
    protected canAttack(): boolean {
        const currentTime = Date.now();
        return (currentTime - this.lastAttackTime) >= this.attackSpeed;
    }

    /**
     * 更新最後攻擊時間
     */
    protected updateLastAttackTime(): void {
        this.lastAttackTime = Date.now();
    }

    /**
     * 通用的目標選擇輔助方法 - 按距離排序
     */
    protected findTargetsInRange(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
        range: number,
        maxTargets: number = 1
    ): ServerGameUnit[] {
        // 只攻擊對立類型的單位
        const targetType = attacker.type === UnitType.hero ? UnitType.enemy : UnitType.hero;

        const targetsWithDistance: Array<{ target: ServerGameUnit, distance: number }> = [];

        for (const target of potentialTargets) {
            if (target.type !== targetType || target.isDead) continue;

            const distance = Math.hypot(
                target.position.x - attacker.position.x,
                target.position.y - attacker.position.y
            );

            if (distance <= range) {
                targetsWithDistance.push({ target, distance });
            }
        }

        // 按距離排序，最近的優先
        targetsWithDistance.sort((a, b) => a.distance - b.distance);

        // 返回最近的 maxTargets 個目標
        return targetsWithDistance
            .slice(0, maxTargets)
            .map(item => item.target);
    }

    /**
     * 扇形範圍目標選擇 - 按距離排序
     */
    protected findTargetsInFanArea(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
        range: number,
        sweepAngle: number,
        facingDirection: number,
        maxTargets: number = 5
    ): ServerGameUnit[] {
        // 只攻擊對立類型的單位
        const targetType = attacker.type === UnitType.hero ? UnitType.enemy : UnitType.hero;

        const targetsWithDistance: Array<{ target: ServerGameUnit, distance: number }> = [];

        for (const target of potentialTargets) {
            if (target.type !== targetType || target.isDead) continue;

            // 檢查距離
            const distance = Math.hypot(
                target.position.x - attacker.position.x,
                target.position.y - attacker.position.y
            );

            if (distance > range) continue;

            // 檢查角度
            const targetDirection = Math.atan2(
                target.position.y - attacker.position.y,
                target.position.x - attacker.position.x
            );

            let angleDiff = Math.abs(targetDirection - facingDirection);
            if (angleDiff > Math.PI) {
                angleDiff = 2 * Math.PI - angleDiff;
            }

            if (angleDiff <= sweepAngle / 2) {
                targetsWithDistance.push({ target, distance });
            }
        }

        // 按距離排序，最近的優先
        targetsWithDistance.sort((a, b) => a.distance - b.distance);

        return targetsWithDistance
            .slice(0, maxTargets)
            .map(item => item.target);
    }

    /**
     * 找出有效目標 - 子類實現具體邏輯
     */
    protected abstract findValidTargets(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): ServerGameUnit[];

    // Getter 方法
    public get range(): number { return this.attackRange; }
    public get damage(): number { return this.baseDamage; }
    public get cooldown(): number { return this.attackSpeed; }
}
