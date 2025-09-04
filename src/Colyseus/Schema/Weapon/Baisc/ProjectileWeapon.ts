import { WeaponBasic } from "./WeaponBasic";
import { WeaponAttackResult, AttackFailReason, VisualEffect } from "@/Types";
import { ServerGameUnit } from "../../Unit/GameUnit";
import { WeaponType } from "@/Types";

/**
 * ???????
 * ???????????????????????
 * ?? Schema ???ProjectileWeapon ????????
 */
export class ProjectileWeapon extends WeaponBasic {
    projectileSpeed: number = 0; // ????
    pierceCount: number = 0; // ????
    areaOfEffect: number = 0; // ???? (0???AOE)
    accuracy: number = 1.0; // ????? (0-1)

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
        // ??????
        if (!this.canAttack()) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.ON_COOLDOWN
            };
        }

        // ??????
        const primaryTarget = this.selectPrimaryTarget(attacker, potentialTargets);

        if (!primaryTarget) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.NO_TARGET
            };
        }

        // ??????
        this.updateLastAttackTime();

        // ??????????????
        const shootDirection = this.calculateShootDirection(attacker, primaryTarget);

        // ??????????????????/AOE???
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
     * ????????
     */
    protected selectPrimaryTarget(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): ServerGameUnit | null {
        const targetsInRange = this.findTargetsInRange(attacker, potentialTargets, this.attackRange, 1);
        return targetsInRange.length > 0 ? targetsInRange[0] : null;
    }

    /**
     * ???????????????
     */
    protected calculateShootDirection(
        attacker: ServerGameUnit,
        target: ServerGameUnit
    ): { x: number, y: number } {
        // ??????
        const dx = target.position.x - attacker.position.x;
        const dy = target.position.y - attacker.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
            return { x: 1, y: 0 };
        }

        // ??????????????
        // TODO: ??????????????????????
        return {
            x: dx / distance,
            y: dy / distance
        };
    }

    /**
     * ????????????AOE?
     */
    protected calculateAffectedTargets(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
        primaryTarget: ServerGameUnit,
        shootDirection: { x: number, y: number }
    ): ServerGameUnit[] {
        const affectedTargets: ServerGameUnit[] = [primaryTarget];

        // ????
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

        // AOE??
        if (this.areaOfEffect > 0) {
            const aoeTargets = this.findAOETargets(
                potentialTargets,
                primaryTarget,
                this.areaOfEffect
            );
            // ??????
            aoeTargets.forEach(target => {
                if (!affectedTargets.includes(target)) {
                    affectedTargets.push(target);
                }
            });
        }

        return affectedTargets;
    }

    /**
     * ??????
     */
    protected findPierceTargets(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
        primaryTarget: ServerGameUnit,
        direction: { x: number, y: number },
        maxPierce: number
    ): ServerGameUnit[] {
        // ??????????
        const pierceTargets: ServerGameUnit[] = [];

        for (const target of potentialTargets) {
            if (target === primaryTarget || pierceTargets.length >= maxPierce) continue;

            // ????????????
            if (this.isTargetOnShootPath(attacker, target, direction)) {
                pierceTargets.push(target);
            }
        }

        return pierceTargets;
    }

    /**
     * ??AOE??
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
     * ????????????
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

        // ???????????????
        const targetDirection = {
            x: targetVector.x / targetDistance,
            y: targetVector.y / targetDistance
        };

        const dotProduct = direction.x * targetDirection.x + direction.y * targetDirection.y;
        const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

        // ?????????5??
        return angle < (5 * Math.PI / 180);
    }

    /**
     * ??????????
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

    // Getter ??
    public get speed(): number { return this.projectileSpeed; }
    public get pierce(): number { return this.pierceCount; }
    public get aoe(): number { return this.areaOfEffect; }
    public get hitAccuracy(): number { return this.accuracy; }

    /**
     * ??????????? - ??????
     */
    protected findValidTargets(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): ServerGameUnit[] {
        // ???????????????????
        const targetsInRange = this.findTargetsInRange(attacker, potentialTargets, this.attackRange, 1);
        return targetsInRange;
    }
}
