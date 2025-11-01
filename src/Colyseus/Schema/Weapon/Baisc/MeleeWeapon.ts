import { WeaponBasic } from './WeaponBasic';
import {
    AttackFailReason,
    VisualEffect,
    AttackResult,
} from '@/Types';
import { ServerGameUnit } from '../../Unit/GameUnit';

/**
 * 近戰武器抽象類
 * 特點：需要靠近目標、通常有擊退效果、可能有範圍攻擊
 * 移除 Schema 導入，MeleeWeapon 現在是純邏輯層類
 * 使用屬性系統替代硬編碼的 knockbackForce 和 sweepAngle
 * 🆕 支持配置驅動的初始化
 */
export abstract class MeleeWeapon extends WeaponBasic {
    constructor() {
        super(); // 🆕 調用無參數的父類構造函數
    }

    /**
     * 🆕 獲取擊退力度（從屬性系統，使用屬性ID）
     */
    public get knockbackForce(): number {
        const prop = this.getProperty('knockback');
        if (prop) {
            return prop.value;
        } else {
            return 0;
        }
    }

    /**
     * 🆕 獲取掃射角度（從屬性系統，使用屬性ID）
     */
    public get sweepAngle(): number {
        const prop = this.getProperty('sweep_angle');
        if (prop) {
            return (prop.value * Math.PI) / 180;
        } else {
            return 0;
        }
    }

    public override tryAttack(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
    ): AttackResult {
        // 檢查冷卻時間
        if (!this.canAttack()) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.ON_COOLDOWN,
            };
        }

        // 找到有效目標
        const validTargets = this.findValidTargets(attacker, potentialTargets);

        if (validTargets.length === 0) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.NO_TARGET,
            };
        }

        // 更新攻擊時間
        this.updateLastAttackTime();

        // 計算攻擊方向
        const facingDirection = {
            x: Math.cos(attacker.facingDirection),
            y: Math.sin(attacker.facingDirection),
        };

        return {
            success: true,
            weaponId: this.weaponId,
            targetIds: validTargets.map((target) => target.id),
            baseDamage: this.baseDamage,
            attackData: {
                position: { x: attacker.position.x, y: attacker.position.y },
                direction: facingDirection,
                range: this.attackRange,
                sweepAngle: this.sweepAngle,
            },
            visualEffects: this.createMeleeVisualEffects(attacker, facingDirection),
            statusEffects: this.generateStatusEffects(), // 🆕 從屬性生成狀態效果
        };
    }

    /**
     * 創建近戰視覺效果
     */
    protected createMeleeVisualEffects(
        attacker: ServerGameUnit,
        facingDirection: { x: number; y: number },
    ): VisualEffect[] {
        const meleeEffect: VisualEffect = {
            type: 'swing',
            position: { x: attacker.position.x, y: attacker.position.y },
            direction: facingDirection,
            data: {
                weaponType: this.weaponId,
                damage: this.baseDamage,
                attackRange: this.attackRange + attacker.attackRange,
                sweepAngle: (this.sweepAngle * 180) / Math.PI, // 轉換為度給客戶端
            },
        };
        return [meleeEffect];
    } /**
   * 近戰武器的目標選擇邏輯 - 360度搜尋最近敵人
   * 每次攻擊都會自動瞄準並攻擊最近的敵人
   */
    protected findValidTargets(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
    ): ServerGameUnit[] {
        // 過濾出存活的敵人
        const aliveTargets = potentialTargets.filter((target) => !target.isDead);

        if (aliveTargets.length === 0) {
            return [];
        }
        const atkRange = this.attackRange + attacker.attackRange;
        // 找出攻擊範圍內的所有敵人，並按距離排序
        const targetsInRange = aliveTargets
            .map((target) => ({
                unit: target,
                distance: Math.hypot(
                    target.position.x - attacker.position.x,
                    target.position.y - attacker.position.y,
                ),
            }))
            .filter((item) => item.distance <= atkRange)
            .sort((a, b) => a.distance - b.distance);

        if (targetsInRange.length === 0) {
            return [];
        } // 自動調整攻擊者的面向角度，朝向最近的敵人
        const closestTarget = targetsInRange[0].unit;
        const targetAngle = Math.atan2(
            closestTarget.position.y - attacker.position.y,
            closestTarget.position.x - attacker.position.x,
        );

        // 更新攻擊者的面向方向
        attacker.facingDirection = targetAngle;

        // 根據武器類型選擇攻擊目標
        let selectedTargets: ServerGameUnit[] = [];

        if (this.sweepAngle > 0) {
            // 扇形攻擊：以新的面向角度為中心，攻擊扇形範圍內的敵人
            selectedTargets = this.findTargetsInFanArea(
                attacker,
                aliveTargets,
                atkRange,
                this.sweepAngle,
                attacker.facingDirection,
            );
        } else {
            // 單點攻擊：只攻擊最近的敵人
            selectedTargets = [closestTarget];
        }

        return selectedTargets;
    }

    // 移除舊的 Getter 方法，使用新的屬性系統
    // public get knockback(): number { return this.knockbackForce; }
    // public get sweep(): number { return this.sweepAngle; }
}
