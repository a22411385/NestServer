import { WeaponBasic, WeaponAttackResult, AttackFailReason, VisualEffect, WeaponType } from "./WeaponBasic";
import { ServerGameUnit } from "../../Unit/GameUnit";

/**
 * 投射武器抽象類
 * 特點：有彈道、可穿透、需要預測移動、有飛行時間
 */
export class ProjectileWeapon extends WeaponBasic {
    protected projectileSpeed: number; // 彈道速度
    protected pierceCount: number; // 穿透數量
    protected areaOfEffect: number; // 爆炸半徑 (0表示無AOE)
    protected accuracy: number; // 命中精確度 (0-1)

    constructor(
        weaponId: string,
        attackRange: number,
        baseDamage: number,
        attackSpeed: number,
        projectileSpeed: number,
        pierceCount: number = 0,
        areaOfEffect: number = 0,
        accuracy: number = 1.0
    ) {
        super(weaponId, WeaponType.PROJECTILE, attackRange, baseDamage, attackSpeed);
        this.projectileSpeed = projectileSpeed;
        this.pierceCount = pierceCount;
        this.areaOfEffect = areaOfEffect;
        this.accuracy = accuracy;
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

        // 找到主要目標
        const primaryTarget = this.selectPrimaryTarget(attacker, potentialTargets);

        if (!primaryTarget) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.NO_TARGET
            };
        }

        // 更新攻擊時間
        this.updateLastAttackTime();

        // 計算射擊方向（包含預測移動）
        const shootDirection = this.calculateShootDirection(attacker, primaryTarget);

        // 計算影響目標（包含主目標和可能的穿透/AOE目標）
        const affectedTargets = this.calculateAffectedTargets(
            attacker,
            potentialTargets,
            primaryTarget,
            shootDirection
        );

        return {
            success: true,
            weaponId: this.weaponId,
            targetIds: affectedTargets.map(target => target.id),
            baseDamage: this.baseDamage,
            attackData: {
                position: { x: attacker.position.x, y: attacker.position.y },
                direction: shootDirection,
                range: this.attackRange,
                targetPosition: { x: primaryTarget.position.x, y: primaryTarget.position.y }
            },
            visualEffects: this.createProjectileVisualEffects(attacker, primaryTarget, shootDirection)
        };
    }

    /**
     * 選擇主要攻擊目標
     */
    protected selectPrimaryTarget(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): ServerGameUnit | null {
        const targetsInRange = this.findTargetsInRange(attacker, potentialTargets, this.attackRange, 1);
        return targetsInRange.length > 0 ? targetsInRange[0] : null;
    }

    /**
     * 計算射擊方向，考慮目標移動預測
     */
    protected calculateShootDirection(
        attacker: ServerGameUnit,
        target: ServerGameUnit
    ): { x: number, y: number } {
        // 基本射擊方向
        const dx = target.position.x - attacker.position.x;
        const dy = target.position.y - attacker.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
            return { x: 1, y: 0 };
        }

        // 目前簡單實現，不進行移動預測
        // TODO: 未來可以加入移動預測邏輯，需要額外的速度資訊
        return {
            x: dx / distance,
            y: dy / distance
        };
    }

    /**
     * 計算受影響的目標（穿透和AOE）
     */
    protected calculateAffectedTargets(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
        primaryTarget: ServerGameUnit,
        shootDirection: { x: number, y: number }
    ): ServerGameUnit[] {
        const affectedTargets: ServerGameUnit[] = [primaryTarget];

        // 穿透效果
        if (this.pierceCount > 0) {
            const pierceTargets = this.findPierceTargets(
                attacker,
                potentialTargets,
                primaryTarget,
                shootDirection,
                this.pierceCount
            );
            affectedTargets.push(...pierceTargets);
        }

        // AOE效果
        if (this.areaOfEffect > 0) {
            const aoeTargets = this.findAOETargets(
                potentialTargets,
                primaryTarget,
                this.areaOfEffect
            );
            // 避免重複添加
            aoeTargets.forEach(target => {
                if (!affectedTargets.includes(target)) {
                    affectedTargets.push(target);
                }
            });
        }

        return affectedTargets;
    }

    /**
     * 尋找穿透目標
     */
    protected findPierceTargets(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
        primaryTarget: ServerGameUnit,
        direction: { x: number, y: number },
        maxPierce: number
    ): ServerGameUnit[] {
        // 找到射線路徑上的敵人
        const pierceTargets: ServerGameUnit[] = [];

        for (const target of potentialTargets) {
            if (target === primaryTarget || pierceTargets.length >= maxPierce) continue;

            // 檢查目標是否在射線路徑上
            if (this.isTargetOnShootPath(attacker, target, direction)) {
                pierceTargets.push(target);
            }
        }

        return pierceTargets;
    }

    /**
     * 尋找AOE目標
     */
    protected findAOETargets(
        potentialTargets: ServerGameUnit[],
        explosionCenter: ServerGameUnit,
        radius: number
    ): ServerGameUnit[] {
        return potentialTargets.filter(target => {
            if (target === explosionCenter) return false;

            const dx = target.position.x - explosionCenter.position.x;
            const dy = target.position.y - explosionCenter.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            return distance <= radius;
        });
    }

    /**
     * 檢查目標是否在射擊路徑上
     */
    protected isTargetOnShootPath(
        attacker: ServerGameUnit,
        target: ServerGameUnit,
        direction: { x: number, y: number }
    ): boolean {
        const targetVector = {
            x: target.position.x - attacker.position.x,
            y: target.position.y - attacker.position.y
        };

        const targetDistance = Math.sqrt(targetVector.x * targetVector.x + targetVector.y * targetVector.y);
        if (targetDistance === 0 || targetDistance > this.attackRange) return false;

        // 計算目標方向與射擊方向的角度差
        const targetDirection = {
            x: targetVector.x / targetDistance,
            y: targetVector.y / targetDistance
        };

        const dotProduct = direction.x * targetDirection.x + direction.y * targetDirection.y;
        const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

        // 允許小角度偏差（約5度）
        return angle < (5 * Math.PI / 180);
    }

    /**
     * 創建投射武器視覺效果
     */
    protected createProjectileVisualEffects(
        attacker: ServerGameUnit,
        target: ServerGameUnit,
        direction: { x: number, y: number }
    ): VisualEffect[] {
        return [{
            type: 'projectile',
            eventType: 'projectile_fire',
            position: { x: attacker.position.x, y: attacker.position.y },
            direction: direction,
            data: {
                weaponType: this.weaponId,
                targetPosition: { x: target.position.x, y: target.position.y },
                speed: this.projectileSpeed,
                range: this.attackRange,
                pierceCount: this.pierceCount,
                aoeRadius: this.areaOfEffect
            }
        }];
    }

    // Getter 方法
    public get speed(): number { return this.projectileSpeed; }
    public get pierce(): number { return this.pierceCount; }
    public get aoe(): number { return this.areaOfEffect; }
    public get hitAccuracy(): number { return this.accuracy; }

    /**
     * 投射武器的目標選擇邏輯 - 實現抽象方法
     */
    protected findValidTargets(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): ServerGameUnit[] {
        // 投射武器通常選擇最近的敵人作為主要目標
        const targetsInRange = this.findTargetsInRange(attacker, potentialTargets, this.attackRange, 1);
        return targetsInRange;
    }
}
