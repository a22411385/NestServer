import { ServerGameUnit } from '@/Colyseus/Schema/Unit/GameUnit';
import { AttackResult, AttackFailReason, BulletCreateConfig } from '@/Types';
import { GameRoom } from '@/Colyseus/Rooms/GameRoom';
import { BulletFactory } from '@/Game/Factories/BulletFactory';
import { BonusCalculator } from './BonusCalculator';
import { Attributes } from './UnifiedAttributeSystem';

/**
 * 行為配置接口
 */
export interface Behavior {
    trigger: 'onHit' | 'onKill' | 'onCrit' | 'onExpire' | 'onPierce';
    action: 'aoeExplode' | 'split' | 'chain' | 'damageTarget' | 'applyStatus';
    config: {
        // AOE 爆炸配置
        radius?: number;
        damageMultiplier?: number;

        // 分裂配置
        count?: number;
        spreadAngle?: number;
        childDamageMultiplier?: number;
        childTags?: string;

        // 彈射配置
        chainCount?: number;
        chainRange?: number;

        // 狀態效果配置
        statusEffects?: any[];
    };
}

/**
 * 命中上下文（統一近戰和投射物）
 */
export interface HitContext {
    type: 'melee' | 'projectile';
    attacker: ServerGameUnit;
    target: ServerGameUnit;
    damage: number;
    position: { x: number; y: number };
    direction?: { x: number; y: number };
    range?: number;

    // 武器屬性
    weaponId: string;
    elementTags?: string[];
    modifiers?: any[];
    statusEffects?: any[];

    // 行為配置
    behaviors?: Behavior[];

    // 投射物專用（用於分裂時創建子彈）
    bulletConfig?: any;
}

/**
 * 🎯 統一的命中處理器
 * 
 * 處理近戰和投射物的命中邏輯，統一執行：
 * 1. 對主要目標造成傷害
 * 2. 執行額外行為（AOE 爆炸、分裂、彈射等）
 * 3. 應用狀態效果
 * 
 * 📝 使用方式：
 * ```typescript
 * // 近戰
 * hitHandler.handle({
 *     type: 'melee',
 *     attacker: hero,
 *     target: enemy,
 *     position: hero.position,
 *     ...
 * });
 * 
 * // 投射物
 * hitHandler.handle({
 *     type: 'projectile',
 *     attacker: bullet.owner,
 *     target: hitTarget,
 *     position: bullet.position,
 *     behaviors: bullet.behaviors,
 *     ...
 * });
 * ```
 */
export class HitHandler {
    constructor(private gameRoom: GameRoom) { }

    /**
     * 統一的命中處理入口
     */
    public handle(context: HitContext): AttackResult {
        // 1. 基礎驗證
        if (!context.attacker || context.attacker.isDead) {
            return this.failResult(context.weaponId, AttackFailReason.NO_TARGET);
        }

        if (!context.target || context.target.isDead) {
            return this.failResult(context.weaponId, AttackFailReason.NO_TARGET);
        }

        // 2. 對主要目標造成傷害
        const primaryResult = this.handlePrimaryTarget(context);

        if (!primaryResult.success) {
            return primaryResult;
        }

        // 3. 執行行為（可能產生額外傷害、效果）
        this.executeBehaviors(context, primaryResult);

        return primaryResult;
    }

    /**
     * 處理主要目標（直接命中的目標）
     */
    private handlePrimaryTarget(context: HitContext): AttackResult {
        const { attacker, target, damage, weaponId, elementTags, modifiers } = context;

        // 計算最終傷害
        const finalDamage = this.gameRoom.damageSystem.calculateFinalDamage({
            attacker,
            target,
            baseDamage: damage,
            elementTags: elementTags && elementTags.length > 0 ? elementTags : ['physical'],
            weaponModifiers: modifiers || [],
            damageType: 'physical' as const,
            source: weaponId,
        });

        // 應用傷害
        const damageResults = this.gameRoom.damageSystem.dealDamageToMultipleTargets(
            attacker,
            [target],
            finalDamage,
            'physical',
            weaponId,
            modifiers || []
        );

        // 應用狀態效果
        const statusEffects = (context.statusEffects || []).filter(se => se.category !== 'attribute');
        console.log(`🔥 [HitHandler] 狀態效果檢查:`, {
            原始數量: context.statusEffects?.length || 0,
            過濾後: statusEffects.length,
            效果列表: statusEffects.map(se => ({ type: se.type, chance: se.chance, category: se.category }))
        });
        
        if (statusEffects.length > 0) {
            this.gameRoom.combatSystem.applyStatusEffects(
                target,
                statusEffects,
                context.position,
                attacker.id
            );
        }

        console.log(`⚔️ [HitHandler] ${context.type} 命中: ${attacker.name} → ${target.name}, 傷害: ${damageResults[0]?.actualDamage || finalDamage}`);

        return {
            success: true,
            weaponId,
            targetIds: [target.id],
            baseDamage: finalDamage,
            attackData: {
                position: context.position,
                direction: context.direction || { x: 0, y: 0 },
                range: context.range || 0,
            },
            statusEffects,
        };
    }

    /**
     * 執行命中行為
     */
    private executeBehaviors(context: HitContext, result: AttackResult): void {
        if (!context.behaviors || context.behaviors.length === 0) {
            console.log(`⚠️ [HitHandler] 武器 ${context.weaponId} 沒有行為，跳過`);
            return;
        }

        console.log(`🔥 [HitHandler] 武器 ${context.weaponId} 執行 ${context.behaviors.length} 個行為`);

        for (const behavior of context.behaviors) {
            // onHit 行為
            if (behavior.trigger === 'onHit') {
                console.log(`🎯 [HitHandler] 執行 onHit 行為: ${behavior.action}, 配置:`, behavior.config);
                this.executeBehavior(behavior, context, result);
            }

            // onKill 行為（檢查目標是否被擊殺）
            if (context.target.isDead && behavior.trigger === 'onKill') {
                console.log(`💀 [HitHandler] 執行 onKill 行為: ${behavior.action}`);
                this.executeBehavior(behavior, context, result);
            }

            // onCrit 行為（需要在 context 中傳遞 isCrit 標記）
            // TODO: 實現暴擊判定
        }
    }

    /**
     * 執行單個行為
     */
    private executeBehavior(
        behavior: Behavior,
        context: HitContext,
        result: AttackResult,
    ): void {
        switch (behavior.action) {
            case 'aoeExplode':
                this.actionAoeExplode(behavior, context);
                break;
            case 'split':
                this.actionSplit(behavior, context);
                break;
            case 'chain':
                this.actionChain(behavior, context);
                break;
            case 'damageTarget':
                // 已在 handlePrimaryTarget() 中處理
                break;
            case 'applyStatus':
                this.actionApplyStatus(behavior, context);
                break;
            default:
                console.warn(`⚠️ [HitHandler] 未知的行為: ${behavior.action}`);
        }
    }

    /**
     * 🎯 行為：AOE 爆炸
     * 🆕 Phase 2: 使用統一屬性系統計算範圍和傷害
     */
    private actionAoeExplode(behavior: Behavior, context: HitContext): void {
        const baseRadius = behavior.config.radius || 100;
        const baseDamageMultiplier = behavior.config.damageMultiplier || 1.0;

        // 🆕 使用統一屬性系統獲取範圍加成
        const finalRadius = baseRadius + Attributes.get(context.attacker, 'area_of_effect');

        // 🆕 使用統一屬性系統獲取傷害加成
        const areaDamageBonus = Attributes.get(context.attacker, 'area_damage') / 100; // 轉為倍率
        const finalDamageMultiplier = baseDamageMultiplier * (1 + areaDamageBonus);

        console.log(`🎯 [統一屬性] AOE爆炸 - 半徑:${finalRadius}, 傷害倍率:${finalDamageMultiplier.toFixed(2)}`);

        // 找到範圍內的其他敵人（排除主要目標）
        const targets = this.findTargetsInRadius(
            context.position,
            finalRadius,  // 使用最終半徑
            context.attacker,
            context.target, // 排除主要目標
        );

        if (targets.length === 0) {
            return;
        }

        // 對每個敵人造成傷害
        for (const target of targets) {
            const explosionDamage = context.damage * finalDamageMultiplier;

            // 應用爆炸傷害
            this.gameRoom.damageSystem.dealDamageToMultipleTargets(
                context.attacker,
                [target],
                explosionDamage,
                'physical',
                context.weaponId,
                context.modifiers || []
            );

            // 應用狀態效果
            if (context.statusEffects && context.statusEffects.length > 0) {
                this.gameRoom.combatSystem.applyStatusEffects(
                    target,
                    context.statusEffects,
                    context.position,
                    context.attacker.id
                );
            }
        }

        console.log(`💥 [AOE Explode] 爆炸範圍 ${finalRadius.toFixed(0)} (基礎: ${baseRadius})，額外命中 ${targets.length} 個敵人`);
    }

    /**
     * 行為：分裂
     */
    private actionSplit(behavior: Behavior, context: HitContext): void {
        // 只有投射物才能分裂
        if (context.type !== 'projectile') {
            console.warn(`⚠️ [Split] 只有投射物可以分裂`);
            return;
        }

        if (!context.bulletConfig) {
            console.warn(`⚠️ [Split] 缺少 bulletConfig`);
            return;
        }

        const baseCount = behavior.config.count || 3;
        const baseSpreadAngle = behavior.config.spreadAngle || 60;
        const baseChildDamageMultiplier = behavior.config.childDamageMultiplier || 1.0;
        const childTags = behavior.config.childTags;

        // ✅ 應用分裂數量加成
        const splitBonus = BonusCalculator.getPropertyBonus('additional_projectiles', context.attacker);
        const finalCount = Math.max(1, Math.floor(BonusCalculator.applyCountBonus(baseCount, splitBonus)));

        const baseAngle = Math.atan2(
            context.direction?.y || 0,
            context.direction?.x || 1
        );

        // 生成子彈
        for (let i = 0; i < finalCount; i++) {
            const angleOffset = (baseSpreadAngle * (i / Math.max(finalCount - 1, 1))) - (baseSpreadAngle / 2);
            const fragmentAngle = baseAngle + (angleOffset * Math.PI / 180);

            // ✅ 應用投射物速度加成
            const baseSpeed = context.bulletConfig?.speed || 300;
            const speedBonus = BonusCalculator.getPropertyBonus('projectile_speed', context.attacker);
            const finalSpeed = BonusCalculator.applyBonus(baseSpeed, speedBonus);

            // 使用 BulletFactory 創建子彈
            const bulletConfig: BulletCreateConfig = {
                ownerId: context.attacker.id,
                startPosition: { x: context.position.x, y: context.position.y },
                direction: { x: Math.cos(fragmentAngle), y: Math.sin(fragmentAngle) },
                damage: context.damage * baseChildDamageMultiplier,

                weaponId: context.weaponId,
                speed: finalSpeed,  // 使用最終速度
                maxDistance: context.bulletConfig?.maxDistance,
                properties: context.bulletConfig?.properties || {},
                statusEffects: context.statusEffects,
                // 🆕 確保標籤無重複
                tags: Array.from(new Set(childTags ? childTags.split(',') : (context.bulletConfig?.tags || []))),
                elementTags: Array.from(new Set(context.bulletConfig?.elementTags || [])),
                modifiers: context.modifiers,
            };

            const bullet = BulletFactory.createBullet(bulletConfig);
            this.gameRoom.state.bullets.set(bullet.id, bullet);
        }

        console.log(`🌟 [Split] 分裂成 ${finalCount} 個子彈 (基礎: ${baseCount})，速度: ${context.bulletConfig?.speed || 300}`);
    }

    /**
     * 行為：彈射
     */
    private actionChain(behavior: Behavior, context: HitContext): void {
        const baseChainCount = behavior.config.chainCount || 3;
        const baseChainRange = behavior.config.chainRange || 200;
        const baseDamageMultiplier = behavior.config.damageMultiplier || 0.8;

        // ✅ 應用彈射範圍加成
        const areaBonus = BonusCalculator.getPropertyBonus('area_of_effect', context.attacker);
        const finalChainRange = BonusCalculator.applyBonus(baseChainRange, areaBonus);

        // TODO: 可以添加「彈射次數」加成
        // const chainBonus = BonusCalculator.getPropertyBonus('chain_count', context.attacker);
        // const finalChainCount = BonusCalculator.applyCountBonus(baseChainCount, chainBonus);

        let currentTarget = context.target;
        let currentDamage = context.damage;
        let hitTargets = new Set<string>([currentTarget.id]);

        for (let i = 0; i < baseChainCount; i++) {
            // 找到下一個目標
            const nextTarget = this.findNearestTarget(
                currentTarget.position,
                finalChainRange,  // 使用最終彈射範圍
                context.attacker,
                hitTargets,
            );

            if (!nextTarget) {
                console.log(`⚡ [Chain] 彈射中斷，找不到下一個目標（已彈射 ${i} 次）`);
                break;
            }

            // 計算彈射傷害（遞減）
            currentDamage *= baseDamageMultiplier;

            // 應用彈射傷害
            const damageResults = this.gameRoom.damageSystem.dealDamageToMultipleTargets(
                context.attacker,
                [nextTarget],
                currentDamage,
                'physical',
                context.weaponId,
                context.modifiers || []
            );

            // 應用狀態效果
            if (context.statusEffects && context.statusEffects.length > 0) {
                this.gameRoom.combatSystem.applyStatusEffects(
                    nextTarget,
                    context.statusEffects,
                    nextTarget.position,
                    context.attacker.id
                );
            }

            // 記錄已命中目標
            hitTargets.add(nextTarget.id);
            currentTarget = nextTarget;

            const actualDamage = damageResults[0]?.actualDamage || currentDamage;
            console.log(`⚡ [Chain] 彈射 ${i + 1}/${baseChainCount}: ${nextTarget.name}, 傷害: ${actualDamage.toFixed(0)} (範圍: ${finalChainRange.toFixed(0)})`);
        }
    }

    /**
     * 行為：應用狀態效果
     */
    private actionApplyStatus(behavior: Behavior, context: HitContext): void {
        const { statusEffects = [] } = behavior.config;

        if (statusEffects.length === 0) {
            return;
        }

        // TODO: 應用額外的狀態效果
        console.log(`✨ [ApplyStatus] 應用 ${statusEffects.length} 個狀態效果`);
    }

    /**
     * 範圍搜索敵人
     */
    private findTargetsInRadius(
        center: { x: number; y: number },
        radius: number,
        attacker: ServerGameUnit,
        exclude?: ServerGameUnit,
    ): ServerGameUnit[] {
        const targets: ServerGameUnit[] = [];

        for (const [, unit] of this.gameRoom.state.allUnits) {
            if (unit.isDead || unit === exclude || unit === attacker) {
                continue;
            }

            const distance = Math.hypot(
                unit.position.x - center.x,
                unit.position.y - center.y,
            );

            if (distance <= radius) {
                targets.push(unit);
            }
        }

        return targets;
    }

    /**
     * 找到最近的目標（用於彈射）
     */
    private findNearestTarget(
        center: { x: number; y: number },
        maxRange: number,
        attacker: ServerGameUnit,
        hitTargets: Set<string>,
    ): ServerGameUnit | null {
        let nearestTarget: ServerGameUnit | null = null;
        let nearestDistance = maxRange;

        for (const [, unit] of this.gameRoom.state.allUnits) {
            if (unit.isDead || unit === attacker || hitTargets.has(unit.id)) {
                continue;
            }

            const distance = Math.hypot(
                unit.position.x - center.x,
                unit.position.y - center.y,
            );

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestTarget = unit;
            }
        }

        return nearestTarget;
    }

    /**
     * 失敗結果
     */
    private failResult(weaponId: string, reason: AttackFailReason): AttackResult {
        return {
            success: false,
            weaponId,
            baseDamage: 0,
            reason,
        };
    }
}
