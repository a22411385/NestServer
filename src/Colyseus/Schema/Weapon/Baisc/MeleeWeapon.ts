import { WeaponBasic, WeaponAttackResult, AttackFailReason, VisualEffect, WeaponType } from "./WeaponBasic";
import { ServerGameUnit } from "../../Unit/GameUnit";

/**
 * 近戰武器抽象類
 * 特點：需要靠近目標、通常有擊退效果、可能有範圍攻擊
 */
export abstract class MeleeWeapon extends WeaponBasic {
    protected knockbackForce: number = 0; // 擊退力度
    protected sweepAngle: number = 0; // 攻擊角度 (弧度)
    protected maxTargets: number = 1; // 最大攻擊目標數量

    constructor(
        weaponId: string,
        attackRange: number,
        baseDamage: number,
        attackSpeed: number,
        knockbackForce: number = 0,
        sweepAngle: number = 0,
        maxTargets: number = 1
    ) {
        super(weaponId, WeaponType.MELEE, attackRange, baseDamage, attackSpeed);
        this.knockbackForce = knockbackForce;
        this.sweepAngle = sweepAngle;
        this.maxTargets = maxTargets;
    }

    public tryAttack(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): WeaponAttackResult {
        // 檢查冷卻時間
        if (!this.canAttack()) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.ON_COOLDOWN
            };
        }

        // 找到有效目標
        const validTargets = this.findValidTargets(attacker, potentialTargets);

        if (validTargets.length === 0) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.NO_TARGET
            };
        }

        // 更新攻擊時間
        this.updateLastAttackTime();

        // 計算攻擊方向
        const facingDirection = {
            x: Math.cos(attacker.facingDirection),
            y: Math.sin(attacker.facingDirection)
        };

        return {
            success: true,
            weaponId: this.weaponId,
            targetIds: validTargets.map(target => target.id),
            baseDamage: this.baseDamage,
            attackData: {
                position: { x: attacker.position.x, y: attacker.position.y },
                direction: facingDirection,
                range: this.attackRange,
                sweepAngle: this.sweepAngle
            },
            visualEffects: this.createMeleeVisualEffects(attacker, facingDirection)
        };
    }

    /**
     * 創建近戰視覺效果
     */
    protected createMeleeVisualEffects(
        attacker: ServerGameUnit,
        facingDirection: { x: number, y: number }
    ): VisualEffect[] {
        return [{
            type: 'swing',
            eventType: 'melee_swing',
            position: { x: attacker.position.x, y: attacker.position.y },
            direction: facingDirection,
            data: {
                weaponType: this.weaponId,
                range: this.attackRange,
                sweepAngle: this.sweepAngle * 180 / Math.PI, // 轉換為度給客戶端
                knockbackForce: this.knockbackForce
            }
        }];
    }

    /**
     * 近戰武器的目標選擇邏輯
     * 子類可以重寫此方法實現不同的攻擊模式
     */
    protected findValidTargets(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): ServerGameUnit[] {
        if (this.sweepAngle > 0) {
            // 扇形攻擊
            return this.findTargetsInFanArea(
                attacker,
                potentialTargets,
                this.attackRange,
                this.sweepAngle,
                attacker.facingDirection,
                this.maxTargets
            );
        } else {
            // 單點攻擊
            return this.findTargetsInRange(
                attacker,
                potentialTargets,
                this.attackRange,
                this.maxTargets
            );
        }
    }

    // Getter 方法
    public get knockback(): number { return this.knockbackForce; }
    public get sweep(): number { return this.sweepAngle; }
}
