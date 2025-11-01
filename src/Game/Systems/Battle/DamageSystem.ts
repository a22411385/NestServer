import { GameRoom } from '../../../Colyseus/Rooms/GameRoom';
import { ServerHero } from '../../../Colyseus/Schema/Unit/Hero';
import { ServerEnemy } from '../../../Colyseus/Schema/Unit/Enemy';
import { ServerGameUnit } from '../../../Colyseus/Schema/Unit/GameUnit';
import { UnitType } from '../../../Colyseus/Schema/GameState';
import { BattleMathUtils } from '../../../Util/BattleMathUtils';

export interface DamageInfo {
    attacker: ServerGameUnit;
    target: ServerGameUnit;
    baseDamage: number;
    damageType?: 'physical' | 'magic' | 'true';
    isCritical?: boolean;
    source?: string; // 武器ID或技能ID
    elementTags?: string[]; // 🆕 元素標籤（如 ['fire', 'elemental']）
    debuffType?: string; // 🆕 Debuff類型（用於StatusEffectSystem的持續傷害）
    position?: { x: number, y: number };
}

export interface DamageResult {
    actualDamage: number;
    wasCritical: boolean;
    targetKilled: boolean;
    targetId: string;
    attackerId: string;
    damageType: string;
    effects?: DamageEffect[];
}

export interface DamageEffect {
    type: 'knockback' | 'stun' | 'burn' | 'freeze' | 'poison';
    value: number;
    duration?: number;
}

/**
 * 統一傷害系統
 * 負責所有傷害計算、效果應用、單位死亡處理
 */
export class DamageSystem {
    private room: GameRoom;

    constructor(room: GameRoom) {
        this.room = room;
    }

    /**
     * 處理單個目標傷害
     */
    public dealDamageToTarget(damageInfo: DamageInfo): DamageResult {
        const { attacker, target, baseDamage, damageType = 'physical', source } = damageInfo;

        if (target.isDead) {
            return this.createEmptyResult(target.id, attacker.id, damageType);
        }

        // 計算最終傷害
        const finalDamage = this.calculateFinalDamage(damageInfo);
        const isCritical = this.rollCriticalHit(attacker, target);
        const actualDamage = isCritical ? Math.floor(finalDamage * 1.5) : finalDamage;

        // 應用傷害
        const previousHp = target.hp;
        target.hp = BattleMathUtils.atLeast(target.hp - actualDamage, 0);
        const realDamage = previousHp - target.hp;

        // 檢查目標是否死亡
        const wasKilled = target.hp <= 0;
        if (wasKilled && !target.isDead) {
            target.isDead = true;
            target.vx = 0; // 停止移動
            target.vy = 0;
            this.handleUnitDeath(target, attacker);
            console.log(`💀 ${target.name} 被 ${attacker.name} 擊殺！`);
        }

        // 應用額外效果
        const effects = this.applyDamageEffects(damageInfo, target);
        return {
            actualDamage: realDamage,
            wasCritical: isCritical,
            targetKilled: wasKilled,
            targetId: target.id,
            attackerId: attacker.id,
            damageType: damageType,
            effects: effects
        };
    }

    /**
     * 處理多目標傷害（如球棒的扇形攻擊）
     */
    public dealDamageToMultipleTargets(
        attacker: ServerGameUnit,
        targets: ServerGameUnit[],
        baseDamage: number,
        damageType: 'physical' | 'magic' | 'true' = 'physical',
        source?: string
    ): DamageResult[] {
        const results: DamageResult[] = [];

        for (const target of targets) {
            const damageInfo: DamageInfo = {
                attacker,
                target,
                baseDamage,
                damageType,
                source,
                position: { x: target.position.x, y: target.position.y }
            };

            const result = this.dealDamageToTarget(damageInfo);
            results.push(result);
        }

        return results;
    }

    /**
     * 處理範圍傷害
     */
    public dealAreaDamage(
        attacker: ServerGameUnit,
        centerPosition: { x: number, y: number },
        radius: number,
        baseDamage: number,
        damageType: 'physical' | 'magic' | 'true' = 'physical',
        source?: string
    ): DamageResult[] {
        const targetsInArea = this.findTargetsInArea(
            centerPosition,
            radius,
            attacker.type === UnitType.hero ? UnitType.enemy : UnitType.hero
        );

        return this.dealDamageToMultipleTargets(
            attacker,
            targetsInArea,
            baseDamage,
            damageType,
            source
        );
    }

    /**
     * 🆕 計算最終傷害（POE風格標籤系統）
     */
    private calculateFinalDamage(damageInfo: DamageInfo): number {
        const { attacker, target, baseDamage, damageType, elementTags, debuffType } = damageInfo;
        let finalDamage = baseDamage;

        // 根據攻擊者屬性調整傷害
        if (attacker.type === UnitType.hero) {
            const hero = attacker as ServerHero;
            finalDamage += hero.attackDamage; // 添加英雄攻擊力

            // 🆕 套用元素傷害加成（使用標籤系統）
            const elementDamageBonus = this.getElementDamageBonus(hero, elementTags, debuffType);
            if (elementDamageBonus > 0) {
                finalDamage *= (1 + elementDamageBonus / 100);
                //console.log(`🔥 元素加成: ${elementTags?.join(',') || debuffType} +${elementDamageBonus}% → ${finalDamage.toFixed(1)}`);
            }
        }

        // 根據傷害類型計算防禦減免
        if (damageType === 'physical') {
            // 物理傷害防禦計算
            const defense = this.getTargetDefense(target);
            finalDamage = BattleMathUtils.atLeast(finalDamage - defense, 1); // 至少造成1點傷害
        }

        return Math.floor(finalDamage);
    }

    /**
     * 🆕 獲取元素傷害加成（POE風格標籤系統）
     * 使用標籤匹配而非enum映射
     * @param hero 英雄實例
     * @param elementTags 武器元素標籤（如 ['fire', 'elemental']）
     * @param debuffType Debuff類型（用於持續傷害）
     * @returns 傷害加成百分比 (0-100)
     */
    private getElementDamageBonus(
        hero: ServerHero,
        elementTags?: string[],
        debuffType?: string
    ): number {
        // 優先使用武器元素標籤
        if (elementTags && elementTags.length > 0) {
            // TODO: 實作 hero.getElementDamageBonusByTags(elementTags)
            // 暫時返回 0，待 ModifierManager 整合後實作
            return 0;
        }

        // 如果是持續傷害（burn, poison, bleed），使用debuffType作為標籤
        if (debuffType) {
            // TODO: 實作 hero.getElementDamageBonusByTags([debuffType, 'ailment'])
            return 0;
        }

        // 沒有元素標籤，返回0
        return 0;
    }

    /**
     * 暴擊判定
     */
    private rollCriticalHit(attacker: ServerGameUnit, target: ServerGameUnit): boolean {
        if (attacker.type === UnitType.hero) {
            const hero = attacker as ServerHero;
            const critRate = hero.critRate || 0.1; // 使用 baseCritRate
            return BattleMathUtils.rollProbability(critRate);
        }
        return false;
    }

    /**
     * 獲取目標防禦力
     */
    private getTargetDefense(target: ServerGameUnit): number {
        // 根據目標類型返回防禦值
        if (target.type === UnitType.hero) {
            const hero = target as ServerHero;
            // Hero 暫時沒有 defense 屬性，可能需要從 vit 計算
            return Math.floor(hero.vit * 0.5); // 體質轉換為防禦力
        }
        return 0; // 敵人暫時沒有防禦
    }

    /**
     * 應用傷害效果
     */
    private applyDamageEffects(damageInfo: DamageInfo, target: ServerGameUnit): DamageEffect[] {
        const effects: DamageEffect[] = [];

        // 根據武器或技能添加特殊效果
        if (damageInfo.source === 'baseball_bat') {
            // 球棒的擊退效果
            const knockbackEffect = this.applyKnockback(
                damageInfo.attacker,
                target,
                50 // 擊退力度
            );
            if (knockbackEffect) {
                effects.push(knockbackEffect);
            }
        }

        return effects;
    }

    /**
     * 應用擊退效果
     */
    private applyKnockback(
        attacker: ServerGameUnit,
        target: ServerGameUnit,
        force: number
    ): DamageEffect | null {
        if (target.isDead) return null;

        // 計算擊退方向
        const dx = target.position.x - attacker.position.x;
        const dy = target.position.y - attacker.position.y;
        const distance = BattleMathUtils.calculateDistance(attacker.position.x, attacker.position.y, target.position.x, target.position.y);

        if (distance === 0) return null;

        const normalizedX = dx / distance;
        const normalizedY = dy / distance;

        // 應用擊退
        const knockbackDistance = force;
        target.position.x += normalizedX * knockbackDistance;
        target.position.y += normalizedY * knockbackDistance;

        // 🆕 無邊界模式：不限制位置
        // const clampedPosition = BattleMathUtils.clampToMapBounds(target.position, this.room.mapWidth, this.room.mapHeight);
        // target.position.x = clampedPosition.x;
        // target.position.y = clampedPosition.y;

        return {
            type: 'knockback',
            value: force
        };
    }

    /**
     * 處理單位死亡
     */
    private handleUnitDeath(deadUnit: ServerGameUnit, killer: ServerGameUnit): void {
        console.log(`💀 ${deadUnit.name || deadUnit.id} 被 ${killer.name || killer.id} 殺死`);

        // 🎯 記錄擊殺者ID
        deadUnit.killedBy = killer.id;

        if (deadUnit.type === UnitType.enemy && killer.type === UnitType.hero) {
            // 敵人被英雄殺死，給予經驗值和金幣
            const enemy = deadUnit as ServerEnemy;
            const hero = killer as ServerHero;

            const expGained = enemy.expReward || 10;
            const goldGained = 100; // 固定掉落100金幣

            // 🆕 計算分享範圍（1000單位）
            const shareRange = 1000;
            const nearbyHeroes = this.findNearbyHeroes(enemy.position, shareRange, hero.id);

            // 擊殺者獲得全額獎勵
            const leveledUp = hero.addExperience(expGained);
            hero.gold += goldGained;

            if (leveledUp) {
                console.log(`🆙 ${hero.name} 升級到 ${hero.level} 級！`);
                this.room.messageHandler.sendBattleLog(
                    `${hero.name} 升級到 ${hero.level} 級！`,
                    'event'
                );
            }

            // 🆕 附近玩家獲得10%獎勵
            if (nearbyHeroes.length > 0) {
                const sharedExp = Math.floor(expGained * 0.1);
                const sharedGold = Math.floor(goldGained * 0.1);

                for (const nearbyHero of nearbyHeroes) {
                    const nearbyLeveledUp = nearbyHero.addExperience(sharedExp);
                    nearbyHero.gold += sharedGold;
                    if (nearbyLeveledUp) {
                        console.log(`🆙 ${nearbyHero.name} 升級到 ${nearbyHero.level} 級！`);
                        this.room.messageHandler.sendBattleLog(
                            `${nearbyHero.name} 升級到 ${nearbyHero.level} 級！`,
                            'event'
                        );
                    }
                }
            }

            // 🆕 觸發掉落系統
            if (this.room.dropSystem) {
                this.room.dropSystem.handleEnemyDeath(enemy, hero);
            }

            this.room.state.allUnits.delete(enemy.id);

        }
    }

    /**
     * 🆕 尋找附近的英雄（排除擊殺者）
     */
    private findNearbyHeroes(position: { x: number, y: number }, range: number, excludeHeroId: string): ServerHero[] {
        const nearbyHeroes: ServerHero[] = [];

        for (const [, unit] of this.room.state.allUnits) {
            if (unit.type !== UnitType.hero || unit.isDead || unit.id === excludeHeroId) continue;

            const distance = BattleMathUtils.calculateDistanceVector(unit.position, position);

            if (distance <= range) {
                nearbyHeroes.push(unit as ServerHero);
            }
        }

        return nearbyHeroes;
    }

    /**
     * 找到範圍內的目標
     */
    private findTargetsInArea(
        centerPosition: { x: number, y: number },
        radius: number,
        targetType: UnitType
    ): ServerGameUnit[] {
        const targets: ServerGameUnit[] = [];

        for (const [, unit] of this.room.state.allUnits) {
            if (unit.type !== targetType || unit.isDead) continue;

            const distance = BattleMathUtils.calculateDistanceVector(unit.position, centerPosition);

            if (distance <= radius) {
                targets.push(unit);
            }
        }

        return targets;
    }

    /**
     * 創建空的傷害結果
     */
    private createEmptyResult(targetId: string, attackerId: string, damageType: string): DamageResult {
        return {
            actualDamage: 0,
            wasCritical: false,
            targetKilled: false,
            targetId,
            attackerId,
            damageType
        };
    }

    /**
     * 清理資源
     */
    public cleanup(): void {
        // 清理邏輯（如果需要）
        console.log('🧹 DamageSystem 已清理');
    }
}
