import { WeaponBasic } from './WeaponBasic';
import { AttackResult, AttackFailReason, BulletCreateConfig, PropertyValue, Vector2 } from '@/Types';
import { ServerGameUnit } from '../../Unit/GameUnit';

/**
 * 投射武器類
 * 特點：遠程攻擊、有投射物、可能有穿透效果
 * 
 * 🎯 職責重構：
 * - 武器只負責：攻擊時機、目標選擇、物理屬性（速度、射程、精度）
 * - 彈藥負責：命中邏輯、範圍效果、穿透規則（在 ProjectileBasic 中定義）
 * - 配置優先級：武器覆蓋 > 彈藥默認值
 * 
 * 📝 使用方式：
 * ```typescript
 * class EnhancedFireball extends ProjectileWeapon {
 *     protected getBulletClass() { return 'ExplosiveProjectile'; }
 *     
 *     // 可選：覆蓋彈藥配置（強化系統）
 *     protected getAmmoOverride() {
 *         return { areaOfEffect: 80 + this.enhanceLevel * 10 };
 *     }
 * }
 * ```
 */
export class ProjectileWeapon extends WeaponBasic {

    constructor() {
        super(); // 🆕 調用無參數的父類構造函數
    }

    public tryAttack(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
    ): AttackResult {
        // 檢查武器冷卻時間
        if (!this.canAttack()) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.ON_COOLDOWN,
            };
        }

        // 選擇主要攻擊目標（距離最近的敵人）
        const primaryTarget = this.selectPrimaryTarget(attacker, potentialTargets);

        if (!primaryTarget) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.NO_TARGET,
            };
        }

        // 更新最後攻擊時間
        this.updateLastAttackTime();

        // 計算射擊方向（朝向主要目標）
        const shootDirection = this.calculateShootDirection(
            attacker,
            primaryTarget,
        );

        // 計算可能受影響的目標（包含穿透和AOE邏輯）
        const affectedTargets = this.calculateAffectedTargets(
            attacker,
            potentialTargets,
            primaryTarget,
            shootDirection,
        );

        return {
            success: true,
            weaponId: this.weaponId,
            targetIds: affectedTargets.map((target) => target.id),
            baseDamage: this.baseDamage,
            attackData: {
                position: { x: attacker.position.x, y: attacker.position.y },
                direction: shootDirection,
                range: this.attackRange,
                targetPosition: {
                    x: primaryTarget.position.x,
                    y: primaryTarget.position.y,
                },
            },
            // 🆕 投射武器使用 projectileConfig 替代 visualEffects
            projectileConfig: this.getProjectileConfig(attacker.id, attacker.position, shootDirection),
        };
    }

    /**
     * 選擇主要攻擊目標（距離最近的敵人）
     */
    protected selectPrimaryTarget(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
    ): ServerGameUnit | null {
        const targetsInRange = this.findTargetsInRange(
            attacker,
            potentialTargets,
            this.attackRange,
            1,
        );
        return targetsInRange.length > 0 ? targetsInRange[0] : null;
    }

    /**
     * 計算射擊方向（朝向目標）
     */
    protected calculateShootDirection(
        attacker: ServerGameUnit,
        target: ServerGameUnit,
    ): { x: number; y: number } {
        // 計算方向向量
        const dx = target.position.x - attacker.position.x;
        const dy = target.position.y - attacker.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
            return { x: 1, y: 0 };
        }

        // 歸一化方向向量，這裡可以加入精度偏差
        // TODO: 加入武器精度影響，低精度武器會有隨機偏差
        return {
            x: dx / distance,
            y: dy / distance,
        };
    }

    /**
     * 計算受影響的目標（包含穿透和AOE邏輯）
     * 
     * 🎯 重構：不再使用武器的 pierceCount/areaOfEffect
     * - 這些邏輯現在由 ProjectileBasic 在命中時處理
     * - 武器只負責選擇主要目標
     */
    protected calculateAffectedTargets(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
        primaryTarget: ServerGameUnit,
        shootDirection: { x: number; y: number },
    ): ServerGameUnit[] {
        // ✅ 武器只負責選擇主要目標
        // 穿透和 AOE 邏輯由 ProjectileBasic.onHit() 處理
        return [primaryTarget];
    }

    /**
     * 查找穿透目標
     */
    protected findPierceTargets(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
        primaryTarget: ServerGameUnit,
        direction: { x: number; y: number },
        maxPierce: number,
    ): ServerGameUnit[] {
        // 找出在射擊路徑上的敵人
        const pierceTargets: ServerGameUnit[] = [];

        for (const target of potentialTargets) {
            if (target === primaryTarget || pierceTargets.length >= maxPierce)
                continue;

            // 檢查目標是否在射擊路徑上
            if (this.isTargetOnShootPath(attacker, target, direction)) {
                pierceTargets.push(target);
            }
        }

        return pierceTargets;
    }

    /**
     * 查找AOE範圍內的目標
     */
    protected findAOETargets(
        potentialTargets: ServerGameUnit[],
        explosionCenter: ServerGameUnit,
        radius: number,
    ): ServerGameUnit[] {
        return potentialTargets.filter((target) => {
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
        direction: { x: number; y: number },
    ): boolean {
        const targetVector = {
            x: target.position.x - attacker.position.x,
            y: target.position.y - attacker.position.y,
        };

        const targetDistance = Math.sqrt(
            targetVector.x * targetVector.x + targetVector.y * targetVector.y,
        );
        if (targetDistance === 0 || targetDistance > this.attackRange) return false;

        // 歸一化目標方向向量
        const targetDirection = {
            x: targetVector.x / targetDistance,
            y: targetVector.y / targetDistance,
        };

        const dotProduct =
            directionX * targetDirection.x + directionY * targetDirection.y;
        const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

        // 允許誤差角度（約5度）
        return angle < (5 * Math.PI) / 180;
    }

    /**
     * 🆕 獲取投射物配置（替代 createProjectileVisualEffects）
     * 
     * 📝 職責：
     * - 創建投射物配置對象
     * - 合併武器屬性和彈藥覆蓋
     * - 包含狀態效果配置
     * - 直接傳遞給 CombatSystem
     * 
     * @returns ProjectileConfig - 投射物完整配置
     */
    protected getProjectileConfig(ownerId: string, startPosition: Vector2, direction: Vector2): BulletCreateConfig {

        let propertiesMap: Record<string, PropertyValue> = {};

        let allProperties = this.getAllProperties();
        for (const prop of allProperties) {
            propertiesMap[prop.type] = prop;
        }

        return {
            weaponId: this.weaponId,
            ownerId: ownerId,
            startPosition: startPosition, // 由 CombatSystem 設置,
            direction: direction,           // 由 CombatSystem 設置,
            bulletClass: this.projectileClass,  // ✅ 彈藥類型

            damage: this.baseDamage,            // ✅ 武器傷害
            maxDistance: this.attackRange,      // ✅ 武器射程
            properties: propertiesMap,
            statusEffects: this.generateStatusEffects(), // 🆕 從屬性生成狀態效果
        };
    }

    /**
     * 投射武器找到有效目標 - 最近的敵人優先
     */
    protected findValidTargets(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
    ): ServerGameUnit[] {
        // 投射武器只瞄準最近的一個敵人，創建投射物去攻擊
        const targetsInRange = this.findTargetsInRange(
            attacker,
            potentialTargets,
            this.attackRange,
            1,
        );
        return targetsInRange;
    }
}
