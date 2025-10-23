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

        // 🔧 添加調試日誌
        // console.log(`💥 [傷害計算] ${attacker.name} 攻擊 ${target.name}:`);
        //console.log(`   基礎傷害: ${baseDamage}, 最終傷害: ${finalDamage}, 實際傷害: ${actualDamage}`);
        // console.log(`   目標血量: ${target.hp}/${target.maxHp}`);

        // 應用傷害
        const previousHp = target.hp;
        target.hp = BattleMathUtils.atLeast(target.hp - actualDamage, 0);
        const realDamage = previousHp - target.hp;

        // console.log(`   傷害後血量: ${target.hp}/${target.maxHp} (扣除 ${realDamage})`);

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

        //console.log(`💥 ${attacker.name} 對 ${target.name} 造成 ${realDamage} 點傷害${isCritical ? ' (暴擊!)' : ''}${wasKilled ? ' (擊殺!)' : ''}`);

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
     * 計算最終傷害
     */
    private calculateFinalDamage(damageInfo: DamageInfo): number {
        const { attacker, target, baseDamage, damageType } = damageInfo;
        let finalDamage = baseDamage;

        // 根據攻擊者屬性調整傷害
        if (attacker.type === UnitType.hero) {
            const hero = attacker as ServerHero;
            finalDamage += hero.attackDamage; // 添加英雄攻擊力
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

        // 確保不超出地圖邊界
        const clampedPosition = BattleMathUtils.clampToMapBounds(target.position, this.room.mapWidth, this.room.mapHeight);
        target.position.x = clampedPosition.x;
        target.position.y = clampedPosition.y;

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

        if (deadUnit.type === UnitType.enemy && killer.type === UnitType.hero) {
            // 敵人被英雄殺死，給予經驗值
            const enemy = deadUnit as ServerEnemy;
            const hero = killer as ServerHero;

            const expGained = enemy.expReward || 10;
            const leveledUp = hero.addExperience(expGained);

            console.log(`✨ ${hero.name} 獲得 ${expGained} 經驗值`);

            if (leveledUp) {
                console.log(`🆙 ${hero.name} 升級到 ${hero.level} 級！`);
                this.room.messageHandler.sendBattleLog(
                    `${hero.name} 升級到 ${hero.level} 級！`,
                    'event'
                );
            }

            // 🆕 觸發掉落系統
            if (this.room.dropSystem) {
                this.room.dropSystem.handleEnemyDeath(enemy, hero);
            }

            this.room.state.gameCore.allUnits.delete(enemy.id);

        }
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

        for (const [, unit] of this.room.state.gameCore.allUnits) {
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
