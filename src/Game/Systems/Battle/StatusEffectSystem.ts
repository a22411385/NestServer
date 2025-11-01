import { GameRoom } from '../../../Colyseus/Rooms/GameRoom';
import { ServerGameUnit } from '../../../Colyseus/Schema/Unit/GameUnit';
import { ServerHero } from '../../../Colyseus/Schema/Unit/Hero';
import { UnitType } from '../../../Colyseus/Schema/GameState';

/**
 * 狀態效果系統
 * 
 * 🎯 職責：
 * - 更新所有單位的狀態效果
 * - 清理過期的狀態效果
 * - 處理持續傷害類型的效果（burn, poison）
 * - 處理持續效果（slow, freeze）
 */
export class StatusEffectSystem {
    private gameRoom: GameRoom;
    private lastTickTime: number = 0;
    private readonly TICK_INTERVAL: number = 100; // 每 100ms 更新一次

    constructor(gameRoom: GameRoom) {
        this.gameRoom = gameRoom;
        this.lastTickTime = Date.now();
    }

    /**
     * 更新所有單位的狀態效果
     * 應該在遊戲主循環中定期調用
     */
    public update(deltaTime: number): void {
        const currentTime = Date.now();

        // 節流：避免過於頻繁的更新
        if (currentTime - this.lastTickTime < this.TICK_INTERVAL) {
            return;
        }

        this.lastTickTime = currentTime;

        // 獲取所有活著的單位（英雄 + 敵人）
        const allHeroes = this.gameRoom.unitManager.getAllAliveHeroes();
        const allEnemies = this.gameRoom.unitManager.getAllAliveEnemies();
        const allUnits = [...allHeroes, ...allEnemies];

        // 更新每個單位的狀態效果
        for (const unit of allUnits) {
            this.updateUnitStatusEffects(unit, currentTime);
        }
    }

    /**
     * 更新單個單位的狀態效果
     */
    private updateUnitStatusEffects(unit: ServerGameUnit, currentTime: number): void {
        const effectsToRemove: string[] = [];

        // 遍歷所有狀態效果
        for (const [effectId, effect] of unit.statusEffects) {
            // 🔧 使用 endTime 檢查是否過期（更直接，減少計算）
            if (effect.endTime > 0 && currentTime >= effect.endTime) {
                effectsToRemove.push(effectId);
                //console.log(`⏱️ 狀態效果已過期: ${effect.type} (${unit.id})`);
                continue;
            }

            // 🆕 跳過永久效果（endTime === 0）
            if (effect.endTime === 0) {
                continue;
            }

            // 處理持續效果
            this.applyOngoingEffect(unit, effect, currentTime);
        }

        // 移除過期的狀態效果
        for (const effectId of effectsToRemove) {
            unit.removeStatusEffect(effectId);
        }
    }

    /**
     * 處理持續性效果（每次 tick 執行）
     */
    private applyOngoingEffect(
        unit: ServerGameUnit,
        effect: any,
        currentTime: number,
    ): void {
        switch (effect.type) {
            case 'burn':
            case 'poison':
            case 'bleed':
                // 持續傷害效果
                this.applyDamageOverTime(unit, effect, currentTime);
                break;

            case 'slow':
            case 'freeze':
                // 減速效果（通過 value 字段表示減速百分比）
                // 客戶端會讀取 statusEffects 來應用減速
                break;

            case 'stun':
                // 眩暈效果（客戶端處理，停止移動和攻擊）
                break;

            case 'knockback':
                // 擊退效果（由 CombatSystem 處理速度設置）
                // 這裡只需要確保效果過期時清除
                break;

            default:
                console.warn(`⚠️ 未知的狀態效果類型: ${effect.type}`);
        }
    }

    /**
     * 應用持續傷害效果
     * 使用最後傷害時間來避免重複計算
     * 🆕 支援元素傷害加成（從施加者讀取）
     */
    private applyDamageOverTime(unit: ServerGameUnit, effect: any, currentTime: number): void {
        // 在 effect 上存儲最後傷害時間（不需要同步到客戶端）
        if (!effect._lastDamageTick) {
            effect._lastDamageTick = effect.startTime;
        }

        const timeSinceLastTick = currentTime - effect._lastDamageTick;

        // 每秒造成一次傷害
        if (timeSinceLastTick >= 1000) {
            const baseDamagePerSecond = effect.value || 0;
            const stacks = effect.stacks || 1;

            // 🆕 套用元素傷害加成（如果施加者是英雄）
            let damagePerSecond = baseDamagePerSecond;
            const attacker = this.getEffectSource(effect);
            if (attacker && attacker.type === UnitType.hero) {
                const hero = attacker as ServerHero;
                const elementBonus = this.getElementDamageBonusForDebuff(hero, effect.type);
                if (elementBonus > 0) {
                    damagePerSecond = baseDamagePerSecond * (1 + elementBonus / 100);
                    //console.log(`🔥 持續傷害元素加成: ${effect.type} +${elementBonus}% → ${damagePerSecond.toFixed(1)}/s`);
                }
            }

            // 計算實際傷害（考慮可能超過1秒的情況和疊加層數）
            const ticks = Math.floor(timeSinceLastTick / 1000);
            const totalDamage = Math.floor(damagePerSecond * stacks * ticks);

            // 應用傷害
            if (totalDamage > 0) {
                unit.hp = Math.max(0, unit.hp - totalDamage);

                // 廣播傷害事件給客戶端
                this.gameRoom.broadcast('status_damage', {
                    unitId: unit.id,
                    effectType: effect.type,
                    damage: totalDamage,
                    stacks: stacks,
                    remainingHp: unit.hp,
                    timestamp: currentTime,
                });

                //console.log(`🔥 持續傷害: ${effect.type} x${stacks} 對 ${unit.id} 造成 ${totalDamage} 傷害 (${damagePerSecond.toFixed(1)}/s × ${stacks} × ${ticks}秒)`);

                // 🔧 檢查單位是否死亡並觸發死亡事件
                if (unit.hp <= 0) {
                    unit.isDead = true;
                    console.log(`💀 單位因 ${effect.type} 效果死亡: ${unit.id}`);

                    // 🆕 觸發死亡處理
                    this.handleUnitDeath(unit, effect.type);
                }
            }

            // 更新最後傷害時間
            effect._lastDamageTick = currentTime;
        }
    }

    /**
     * 🆕 獲取效果來源（施加狀態效果的單位）
     * @param effect 狀態效果
     * @returns 施加者單位，如果找不到則返回 null
     */
    private getEffectSource(effect: any): ServerGameUnit | null {
        if (!effect.sourceId) return null;

        // 嘗試從英雄中查找
        const heroes = this.gameRoom.unitManager.getAllAliveHeroes();
        for (const hero of heroes) {
            if (hero.id === effect.sourceId) {
                return hero;
            }
        }

        // 嘗試從敵人中查找（雖然目前敵人沒有元素加成，但預留接口）
        const enemies = this.gameRoom.unitManager.getAllAliveEnemies();
        for (const enemy of enemies) {
            if (enemy.id === effect.sourceId) {
                return enemy;
            }
        }

        return null;
    }

    /**
     * 🆕 根據Debuff類型獲取對應的元素傷害加成（POE風格標籤系統）
     * 使用標籤匹配而非enum映射
     * @param hero 英雄實例
     * @param debuffType Debuff類型（如 'burn', 'poison'）
     * @returns 傷害加成百分比 (0-100)
     */
    private getElementDamageBonusForDebuff(hero: ServerHero, debuffType: string): number {
        // TODO: 實作 hero.getElementDamageBonusByTags([debuffType, 'ailment'])
        // 暫時返回 0，待 ModifierManager 整合後實作
        // debuffType 本身就是標籤（如 'burn' → 'fire,ailment'）
        return 0;
    }

    /**
     * 🆕 處理單位死亡
     */
    private handleUnitDeath(unit: ServerGameUnit, causeType: string): void {
        const unitType = unit.type;

        if (unitType === 0) { // UnitType.enemy
            // 敵人死亡處理
            const enemy = unit as any; // ServerEnemy

            // 移除單位
            this.gameRoom.state.removeEnemy(enemy.id);

            // 發送死亡消息
            this.gameRoom.broadcast('unitRemoved', { id: enemy.id });

            console.log(`💀 敵人 ${enemy.id} 因 ${causeType} 死亡`);

        } else if (unitType === 1) { // UnitType.hero
            // 英雄死亡處理（由 PlayerManager 統一處理）
            console.log(`💀 英雄 ${unit.id} 因 ${causeType} 死亡，將由 PlayerManager 處理`);
        }
    }

    /**
     * 清理單位的所有狀態效果（單位死亡或重置時使用）
     */
    public clearAllEffects(unit: ServerGameUnit): void {
        const effectIds = Array.from(unit.statusEffects.keys());
        for (const effectId of effectIds) {
            unit.removeStatusEffect(effectId);
        }
        console.log(`🧹 已清理單位 ${unit.id} 的所有狀態效果`);
    }

    /**
     * 手動清理指定類型的狀態效果
     */
    public removeEffectByType(unit: ServerGameUnit, effectType: string): void {
        const effectsToRemove: string[] = [];

        for (const [effectId, effect] of unit.statusEffects) {
            if (effect.type === effectType) {
                effectsToRemove.push(effectId);
            }
        }

        for (const effectId of effectsToRemove) {
            unit.removeStatusEffect(effectId);
        }

        if (effectsToRemove.length > 0) {
            console.log(`🧹 已移除 ${unit.id} 的 ${effectType} 效果 (${effectsToRemove.length} 個)`);
        }
    }

    /**
     * 獲取單位當前的減速百分比（疊加所有減速效果）
     */
    public getSlowPercentage(unit: ServerGameUnit): number {
        let totalSlow = 0;

        for (const [, effect] of unit.statusEffects) {
            if (effect.type === 'slow' || effect.type === 'freeze') {
                totalSlow += effect.value || 0;
            }
        }

        // 限制最大減速為 95%（防止完全靜止）
        return Math.min(totalSlow, 95);
    }

    /**
     * 檢查單位是否被眩暈
     */
    public isStunned(unit: ServerGameUnit): boolean {
        for (const [, effect] of unit.statusEffects) {
            if (effect.type === 'stun') {
                return true;
            }
        }
        return false;
    }

    /**
     * 獲取狀態效果的剩餘時間（毫秒）
     */
    public getRemainingDuration(unit: ServerGameUnit, effectId: string): number {
        const effect = unit.statusEffects.get(effectId);
        if (!effect) return 0;

        const currentTime = Date.now();
        const remaining = effect.endTime - currentTime;

        return Math.max(0, remaining);
    }

    /**
     * 獲取系統統計信息（調試用）
     */
    public getStats(): {
        totalEffects: number;
        effectsByType: Map<string, number>;
    } {
        const allHeroes = this.gameRoom.unitManager.getAllAliveHeroes();
        const allEnemies = this.gameRoom.unitManager.getAllAliveEnemies();
        const allUnits = [...allHeroes, ...allEnemies];

        let totalEffects = 0;
        const effectsByType = new Map<string, number>();

        for (const unit of allUnits) {
            for (const [, effect] of unit.statusEffects) {
                totalEffects++;
                const count = effectsByType.get(effect.type) || 0;
                effectsByType.set(effect.type, count + 1);
            }
        }

        return { totalEffects, effectsByType };
    }
}
