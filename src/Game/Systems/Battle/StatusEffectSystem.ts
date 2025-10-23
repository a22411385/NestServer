import { GameRoom } from '../../../Colyseus/Rooms/GameRoom';
import { ServerGameUnit } from '../../../Colyseus/Schema/Unit/GameUnit';

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
            // 🆕 跳過 duration 為 0 的效果（永久效果或瞬間效果）
            if (effect.duration === 0) {
                continue;
            }

            const elapsedTime = currentTime - effect.startTime;

            // 檢查效果是否已過期
            if (elapsedTime >= effect.duration) {
                effectsToRemove.push(effectId);
                //console.log(`⏱️ 狀態效果已過期: ${effect.type} (${unit.id})`);
                continue;
            }

            // 處理持續效果
            this.applyOngoingEffect(unit, effect, elapsedTime);
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
        elapsedTime: number,
    ): void {
        switch (effect.type) {
            case 'burn':
            case 'poison':
                // 持續傷害效果
                this.applyDamageOverTime(unit, effect);
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
     */
    private applyDamageOverTime(unit: ServerGameUnit, effect: any): void {
        // 在 effect 上存儲最後傷害時間（不需要同步到客戶端）
        if (!effect._lastDamageTick) {
            effect._lastDamageTick = effect.startTime;
        }

        const currentTime = Date.now();
        const timeSinceLastTick = currentTime - effect._lastDamageTick;

        // 每秒造成一次傷害
        if (timeSinceLastTick >= 1000) {
            const damagePerSecond = effect.value || 0;
            const stacks = effect.stacks || 1;

            // 計算實際傷害（考慮可能超過1秒的情況和疊加層數）
            const ticks = Math.floor(timeSinceLastTick / 1000);
            const totalDamage = damagePerSecond * stacks * ticks;

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

                //console.log(`🔥 持續傷害: ${effect.type} x${stacks} 對 ${unit.id} 造成 ${totalDamage} 傷害 (${damagePerSecond}/s × ${stacks} × ${ticks}秒)`);

                // 檢查單位是否死亡
                if (unit.hp <= 0) {
                    unit.isDead = true;
                    // console.log(`💀 單位因持續傷害死亡: ${unit.id} (${effect.type})`);
                }
            }

            // 更新最後傷害時間
            effect._lastDamageTick = currentTime;
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
        const elapsedTime = currentTime - effect.startTime;
        const remaining = effect.duration - elapsedTime;

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
