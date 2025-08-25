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
     * 近戰武器的目標選擇邏輯 - 360度搜尋最近敵人
     * 每次攻擊都會自動瞄準並攻擊最近的敵人
     */
    protected findValidTargets(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): ServerGameUnit[] {
        // 過濾出存活的敵人
        const aliveTargets = potentialTargets.filter(target => !target.isDead);

        if (aliveTargets.length === 0) {
            return [];
        }

        // 找出攻擊範圍內的所有敵人，並按距離排序
        const targetsInRange = aliveTargets
            .map(target => ({
                unit: target,
                distance: Math.hypot(
                    target.position.x - attacker.position.x,
                    target.position.y - attacker.position.y
                )
            }))
            .filter(item => item.distance <= this.attackRange)
            .sort((a, b) => a.distance - b.distance);

        if (targetsInRange.length === 0) {
            return [];
        }

        // 自動調整攻擊者的面向角度，朝向最近的敵人
        const closestTarget = targetsInRange[0].unit;
        const targetAngle = Math.atan2(
            closestTarget.position.y - attacker.position.y,
            closestTarget.position.x - attacker.position.x
        );

        // 更新攻擊者的面向方向
        const previousFacing = attacker.facingDirection;
        attacker.facingDirection = targetAngle;

        console.log(`⚔️ ${this.weaponId} auto-aiming:`);
        console.log(`  👹 Closest target: ${closestTarget.id} at distance ${targetsInRange[0].distance.toFixed(1)}`);
        console.log(`  🎯 Adjusted facing: ${(previousFacing * 180 / Math.PI).toFixed(1)}° → ${(targetAngle * 180 / Math.PI).toFixed(1)}°`);
        console.log(`  🔍 Targets in range: ${targetsInRange.length}`);

        // 根據武器類型選擇攻擊目標
        let selectedTargets: ServerGameUnit[] = [];

        if (this.sweepAngle > 0) {
            // 扇形攻擊：以新的面向角度為中心，攻擊扇形範圍內的敵人
            selectedTargets = this.findTargetsInFanArea(
                attacker,
                aliveTargets,
                this.attackRange,
                this.sweepAngle,
                attacker.facingDirection,
                this.maxTargets
            );
            console.log(`  💥 Fan attack (${(this.sweepAngle * 180 / Math.PI).toFixed(1)}°): ${selectedTargets.length} targets`);
        } else {
            // 單點攻擊：只攻擊最近的敵人
            selectedTargets = [closestTarget];
            console.log(`  🎯 Single target attack: ${closestTarget.id}`);
        }

        return selectedTargets;
    }

    // Getter 方法
    public get knockback(): number { return this.knockbackForce; }
    public get sweep(): number { return this.sweepAngle; }
}
