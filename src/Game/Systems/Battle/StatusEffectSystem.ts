import { GameRoom } from '../../../Colyseus/Rooms/GameRoom';
import { ServerGameUnit, StatusEffect } from '../../../Colyseus/Schema/Unit/GameUnit';
import { DamageInfo } from './DamageSystem';
import { EffectHelper } from './EffectHelper';

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
     * 🔥 處理持續性效果（每次 tick 執行）- 使用標籤系統判斷
     * 
     * ✅ 標籤系統優勢：
     * - 不需要硬編碼 switch case
     * - 新增效果類型只需在 EffectHelper 配置
     * - 支援 POE 風格的標籤組合判斷
     * 
     * @example
     * 效果標籤組合示例：
     * - ['damage', 'debuff', 'dot'] → DOT 傷害
     * - ['control', 'debuff', 'slow'] → 控制效果
     * - ['buff', 'speed'] → 增益效果
     */
    private applyOngoingEffect(
        unit: ServerGameUnit,
        effect: StatusEffect,
        currentTime: number,
    ): void {
        // 🔥 使用 EffectHelper 標籤系統判斷效果類型
        const effectType = effect.type;

        // ✅ DOT 效果（持續傷害）
        if (EffectHelper.isDamageOverTime(effectType)) {
            this.applyDamageOverTime(unit, effect, currentTime);
            return;
        }

        // ✅ 控制效果（減速、眩暈、擊退等）
        if (EffectHelper.isCrowdControl(effectType)) {
            // 控制效果由客戶端處理（讀取 statusEffects 自動應用）
            // 伺服器只需維護效果狀態和過期時間
            return;
        }

        // ⚠️ 未知效果類型（可能是自訂效果）
        console.warn(`⚠️ 未知的狀態效果類型: ${effectType}，請在 EffectHelper 中配置`);
    }

    /**
     * 🔥 應用持續傷害效果（統一通過 DamageSystem.dealDamageToTarget）
     * 
     * ✅ 自動套用：
     * - Hero 的 attackDamage（力量加成）
     * - 元素傷害加成（基於 elementTags 標籤匹配）
     * - 天賦效果（所有傷害 +20%）
     * - 目標防禦減免（根據 damageType）
     * - 生命偷取（對 DOT 傷害也有效）
     * - 死亡處理（經驗、掉落）
     */
    private applyDamageOverTime(unit: ServerGameUnit, effect: StatusEffect, currentTime: number): void {
        // 在 effect 上存儲最後傷害時間（不需要同步到客戶端）
        if (!effect._lastDamageTick) {
            effect._lastDamageTick = effect.startTime;
        }

        const timeSinceLastTick = currentTime - effect._lastDamageTick;

        // 每秒造成一次傷害
        if (timeSinceLastTick >= 1000) {
            const baseDamagePerSecond = effect.value || 0;
            const stacks = effect.stacks || 1;
            const ticks = Math.floor(timeSinceLastTick / 1000);

            // 🔥 獲取施加者（用於套用屬性加成）
            const attacker = this.getEffectSource(effect);

            // 🎯 構建傷害資訊（套用疊加層數）
            const damageInfo: DamageInfo = {
                baseDamage: baseDamagePerSecond * ticks * stacks, // 基礎傷害 × 秒數 × 疊加層數
                elementTags: EffectHelper.getElementTags(effect.type), // 🔥 使用 EffectHelper 統一轉換
                damageType: EffectHelper.getDamageType(effect.type), // 🔥 使用 EffectHelper 統一轉換
                attacker: attacker || undefined, // 施加者（可能為空）
                target: unit, // 目標
            };

            // 🔥 使用統一的傷害系統（自動處理生命偷取、死亡、經驗掉落）
            this.gameRoom.damageSystem.dealDamageToTarget(damageInfo);

            // 更新最後傷害時間
            effect._lastDamageTick = currentTime;
        }
    }

    /**
     * 🔍 獲取效果來源（施加狀態效果的單位）
     * 
     * @param effect 狀態效果
     * @returns 施加者單位，如果找不到則返回 null
     */
    private getEffectSource(effect: StatusEffect): ServerGameUnit | null {
        // 🆕 使用 sourceId 字段查找施加者
        if (!effect.sourceId) return null;

        // 在房間的 UnitManager 中查找施加者
        const allUnits = [
            ...this.gameRoom.unitManager.getAllAliveHeroes(),
            ...this.gameRoom.unitManager.getAllAliveEnemies()
        ];

        return allUnits.find(unit => unit.id === effect.sourceId) || null;
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

}
