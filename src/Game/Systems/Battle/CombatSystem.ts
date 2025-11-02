import { GameRoom } from '../../../Colyseus/Rooms/GameRoom';
import { ServerHero } from '../../../Colyseus/Schema/Unit/Hero';
import { ServerGameUnit } from '../../../Colyseus/Schema/Unit/GameUnit';
import { AttackResult, WeaponType, StatusEffectConfig } from '@/Types';

import { BattleLogSystem } from './BattleLogSystem';
import { DamageResult } from './DamageSystem';
import { WeaponBasic } from '@/Colyseus/Schema/Weapon/Baisc';
import { StatusEffect } from '@/Colyseus/Schema/Unit/GameUnit';

/**
 * 戰鬥系統 - 負責處理所有戰鬥相關邏輯（英雄攻擊、敵人攻擊、戰鬥協調）
 */
export class CombatSystem {
    private gameRoom: GameRoom;
    private battleLogSystem: BattleLogSystem;

    // 🎯 狀態效果快速查找緩存 - 避免重複遍歷 MapSchema
    private effectCache: Map<string, Map<string, StatusEffect>> = new Map();

    constructor(gameRoom: GameRoom) {
        this.gameRoom = gameRoom;
        this.battleLogSystem = new BattleLogSystem(gameRoom);
    }

    /**
     * 更新所有英雄的自動攻擊
     */
    public updateHeroAutoAttacks(): void {
        // 取得場上所有活著的單位
        const aliveEnemies = this.gameRoom.unitManager.getAllAliveEnemies();

        // 取得所有活的英雄
        const allHero = this.gameRoom.unitManager.getAllAliveHeroes();

        // 使用 for...of 遍歷英雄
        for (const hero of allHero) {
            // 嘗試讓英雄攻擊
            this.processHeroAttacks(hero, aliveEnemies);

            // 英雄每秒回復生命和法力
            hero.regenerate();
        }
    }

    /**
     * 處理單個英雄的攻擊
     */
    private processHeroAttacks(
        hero: ServerHero,
        enemies: ServerGameUnit[],
    ): void {
        // 取得所有可能的攻擊
        const attackResults = hero.tryAttack(enemies);

        for (const result of attackResults) {
            // 如果攻擊成功
            if (result.success) {
                this.handleAttackResult(hero, result);
            }
        }
    }

    /**
     * 英雄執行攻擊
     */
    private handleAttackResult(hero: ServerHero, result: AttackResult): void {
        if (!result.targetIds || result.targetIds.length === 0) return;

        // 獲取武器對象來判斷類型
        const equippedWeapons = hero.getEquippedWeapons();
        const weapon = equippedWeapons.find((w) => w.weaponId === result.weaponId);
        if (!weapon) {
            console.warn(`找不到武器: ${result.weaponId}`);
            return;
        }

        // 獲取目標單位
        const targets = this.getValidTargets(result.targetIds);
        if (targets.length === 0) return;

        // 根據武器類型處理攻擊
        const attackData = this.processAttackByWeaponType(
            hero,
            weapon,
            targets,
            result,
        );

        if (attackData.shouldCreateProjectile) {
            // 🆕 創建投射物實體（通過 Schema 同步到客戶端）
            this.createProjectilesFromAttackResult(hero, result);
        } else {
            // 廣播攻擊結果（近戰武器）
            this.broadcastAttackResult(hero, result, attackData);
        }
    }

    /**
     * 根據武器類型處理攻擊
     */
    private processAttackByWeaponType(
        hero: ServerHero,
        weapon: WeaponBasic,
        targets: ServerGameUnit[],
        result: AttackResult,
    ): CombatExecution {
        const attackData: CombatExecution = {
            damageResults: [],
            shouldCreateProjectile: false,
        };

        if (weapon.weaponType === WeaponType.PROJECTILE_WEAPON) {
            // 投射武器：延遲傷害處理
            attackData.shouldCreateProjectile = true;
            //console.log(`🏹 投射武器攻擊: ${result.weaponId} - 創建投射物`);
        } else {
            // 近戰武器：立即造成傷害
            // 🆕 Phase 3: 使用 AttackResult 攜帶的詞綴，不再從武器回查
            attackData.damageResults =
                this.gameRoom.damageSystem.dealDamageToMultipleTargets(
                    hero,
                    targets,
                    result.baseDamage,
                    'physical',
                    result.weaponId,
                    result.modifiers // 🆕 使用 AttackResult 攜帶的武器詞綴
                );

            // 近戰武器立即應用狀態效果
            if (result.statusEffects && result.statusEffects.length > 0) {
                for (const target of targets) {
                    this.applyStatusEffects(
                        target,
                        result.statusEffects,
                        { x: hero.position.x, y: hero.position.y },
                        hero.id // 🆕 傳遞攻擊者ID
                    );
                }
            }

            // 處理戰報
            this.handleBattleLog(hero, attackData.damageResults);
        }

        return attackData;
    }

    /**
     * 🆕 從攻擊結果創建投射物實體
     */
    private createProjectilesFromAttackResult(
        hero: ServerHero,
        result: AttackResult,
    ): void {
        if (!result.projectileConfig || !result.attackData) {
            console.warn(`⚠️ 投射武器攻擊缺少配置: weaponId=${result.weaponId}`);
            return;
        }
        this.gameRoom.bulletSystem.spawnBullet(result.projectileConfig);
    }

    /**
     * 廣播攻擊結果
     */
    private broadcastAttackResult(
        hero: ServerHero,
        result: AttackResult,
        attackData: CombatExecution,
    ): void {
        // 🆕 生成視覺效果資訊
        const visualEffects = this.generateVisualEffects(
            hero,
            result,
            attackData.damageResults
        );

        this.gameRoom.broadcast('weapon_attack', {
            heroId: hero.id,
            weaponId: result.weaponId,
            attackData: result.attackData,
            damageResults: attackData.damageResults,
            visualEffects: visualEffects, // 🆕 添加視覺效果
            timestamp: Date.now(),
        });
    }

    /**
     * 🎨 生成視覺效果資訊
     * 從武器詞綴(modifiers)和傷害結果生成客戶端需要的視覺效果資料
     */
    private generateVisualEffects(
        hero: ServerHero,
        result: AttackResult,
        damageResults: DamageResult[]
    ): any[] {
        const effects: any[] = [];
        const modifiers = result.modifiers || [];

        // 遍歷武器詞綴，根據標籤生成視覺效果
        for (const mod of modifiers) {
            if (!mod.tags) continue;

            const tags = mod.tags.split(',').map((t: string) => t.trim());

            // 1️⃣ 近戰揮擊效果 (melee + area)
            if (tags.includes('melee') && tags.includes('area')) {
                effects.push({
                    type: 'swing',
                    position: result.attackData?.position || { x: hero.position.x, y: hero.position.y },
                    direction: result.attackData?.direction || { x: 1, y: 0 },
                    data: {
                        sweepAngle: mod.baseValue || result.attackData?.sweepAngle || 60,
                        range: result.attackData?.range || 100,
                        weaponType: this.getWeaponTypeFromTags(tags),
                    }
                });
            }

            // 2️⃣ 擊退效果 (knockback)
            if (tags.includes('knockback')) {
                for (const dmgResult of damageResults) {
                    // 從英雄位置指向目標的方向
                    const target = this.gameRoom.unitManager.getUnitById(dmgResult.targetId);
                    if (target) {
                        const direction = {
                            x: target.position.x - hero.position.x,
                            y: target.position.y - hero.position.y
                        };
                        const length = Math.sqrt(direction.x ** 2 + direction.y ** 2);
                        if (length > 0) {
                            direction.x /= length;
                            direction.y /= length;
                        }

                        effects.push({
                            type: 'knockback',
                            targetId: dmgResult.targetId,
                            value: mod.baseValue,
                            direction: direction,
                            position: { x: target.position.x, y: target.position.y }
                        });
                    }
                }
            }

            // 3️⃣ 穿透效果 (pierce)
            if (tags.includes('pierce') && damageResults.length > 1) {
                const targetIds = damageResults.map(r => r.targetId);
                effects.push({
                    type: 'pierce',
                    targetIds: targetIds,
                    pierceCount: mod.baseValue,
                });
            }

            // 4️⃣ 連鎖攻擊效果 (chain)
            if (tags.includes('chain') && damageResults.length > 1) {
                const chainPath = damageResults.map(r => {
                    const target = this.gameRoom.unitManager.getUnitById(r.targetId);
                    return target ? { x: target.position.x, y: target.position.y, targetId: r.targetId } : null;
                }).filter(p => p !== null);

                effects.push({
                    type: 'chain',
                    chainPath: chainPath,
                    chainCount: mod.baseValue,
                });
            }

            // 5️⃣ 範圍效果 (area/aoe/splash)
            if (tags.includes('area') || tags.includes('aoe') || tags.includes('splash')) {
                if (damageResults.length > 0 && !tags.includes('melee')) {
                    const firstTarget = this.gameRoom.unitManager.getUnitById(damageResults[0].targetId);
                    if (firstTarget) {
                        effects.push({
                            type: 'explosion',
                            position: { x: firstTarget.position.x, y: firstTarget.position.y },
                            radius: mod.baseValue || 100,
                            affectedTargets: damageResults.map(r => r.targetId),
                        });
                    }
                }
            }
        }

        return effects;
    }

    /**
     * 🔍 從標籤推測武器類型
     */
    private getWeaponTypeFromTags(tags: string[]): string {
        if (tags.includes('sword')) return 'sword';
        if (tags.includes('axe')) return 'axe';
        if (tags.includes('mace')) return 'mace';
        if (tags.includes('dagger')) return 'dagger';
        if (tags.includes('bow')) return 'bow';
        if (tags.includes('staff')) return 'staff';
        if (tags.includes('wand')) return 'wand';
        return 'melee';
    }

    /**
     * 處理戰報
     */
    private handleBattleLog(
        hero: ServerHero,
        damageResults: DamageResult[],
    ): void {
        this.battleLogSystem.handleAttackBattleLog(hero, damageResults);
    }

    /**
     * 🆕 應用狀態效果到目標單位（支持叠加）
     * 將 StatusEffectConfig 轉換為 StatusEffect Schema 並應用到單位
     * 自動同步到客戶端 (通過 Colyseus Schema)
     * 
     * 🔥 叠加机制：
     * - 相同类型的效果会叠加（增加层数）
     * - 叠加时刷新持续时间为最长的
     * - 叠加时取最大的伤害值
     * - 达到最大层数时不再增加
     * 
     * @param target 目標單位
     * @param effectConfigs 狀態效果配置數組
     * @param attackerPosition 攻擊者位置 (用於擊退方向計算)
     * @param attackerId 攻擊者ID (用於 DOT 傷害計算)
     */
    public applyStatusEffects(
        target: ServerGameUnit,
        effectConfigs: StatusEffectConfig[],
        attackerPosition?: { x: number; y: number },
        attackerId?: string,
    ): void {

        for (const config of effectConfigs) {
            // 檢查機率觸發
            if (config.chance !== undefined) {
                const roll = Math.random() * 100;
                if (roll > config.chance) {
                    continue; // 未觸發
                }
            }

            //只有狀態類的才要疊加
            if (config.category == 'debuff' || config.category == 'buff') {
                // 🆕 检查是否已存在相同类型的效果
                const existingEffect = this.findExistingEffect(target, config.type);
                if (existingEffect) {
                    // 🔧 優化：如果已達最大層數且時間充足，直接跳過（避免無效更新）
                    const now = Date.now();
                    const remainingTime = existingEffect.endTime - now;
                    const isMaxStacks = existingEffect.stacks >= existingEffect.maxStacks;
                    const hasEnoughTime = remainingTime > config.duration * 0.5; // 剩餘時間超過一半

                    if (isMaxStacks && hasEnoughTime) {
                        // console.log(`⏭️ 跳過無效疊加: ${config.type} (已達最大層數且時間充足)`);
                        continue; // 跳過這次更新，減少同步
                    }

                    // 叠加现有效果
                    this.stackEffect(existingEffect, config);
                    //  console.log(`🔥 狀態效果疊加: ${config.type} → ${target.id} (${existingEffect.stacks}層)`);
                } else {
                    // 创建新效果
                    this.createNewEffect(target, config, attackerId);
                    // console.log(`✨ 狀態效果已應用: ${config.type} → ${target.id} (持續 ${config.duration}ms)`);
                }
            }
            // 特殊處理：擊退效果
            if (config.type === 'knockback' && attackerPosition) {
                this.applyKnockback(target, attackerPosition, config.value || 0);
            }
        }
    }

    /**
     * 🆕 查找已存在的相同类型效果（優化版本 - 使用緩存）
     */
    private findExistingEffect(target: ServerGameUnit, effectType: string): StatusEffect | null {
        // 嘗試從緩存獲取
        const unitCache = this.effectCache.get(target.id);
        if (unitCache) {
            const cachedEffect = unitCache.get(effectType);
            if (cachedEffect) {
                return cachedEffect;
            }
        }

        // 緩存未命中，遍歷查找
        for (const [, effect] of target.statusEffects) {
            if (effect.type === effectType) {
                // 更新緩存
                if (!this.effectCache.has(target.id)) {
                    this.effectCache.set(target.id, new Map());
                }
                this.effectCache.get(target.id)!.set(effectType, effect);
                return effect;
            }
        }
        return null;
    }

    /**
     * 🎯 清除單位的狀態效果緩存
     */
    private clearEffectCache(unitId: string): void {
        this.effectCache.delete(unitId);
    }

    /**
     * 🆕 叠加现有效果（優化：減少不必要的同步）
     * 
     * 🔧 優化策略：
     * 1. 只在疊加層數改變時才更新
     * 2. endTime 更新閾值：只有當新時間明顯更長時才更新（減少微小差異的同步）
     */
    private stackEffect(existingEffect: StatusEffect, config: StatusEffectConfig): void {
        const now = Date.now();
        const currentRemainingTime = existingEffect.endTime - now;

        let needsUpdate = false;

        // 增加层数（不超过最大值）
        if (existingEffect.stacks < existingEffect.maxStacks) {
            existingEffect.stacks++;
            needsUpdate = true;
        }

        // 🔧 優化：只有當新時間比當前剩餘時間長 200ms 以上時才更新（避免頻繁微小更新）
        const timeDifference = config.duration - currentRemainingTime;
        if (timeDifference > 200) {
            existingEffect.duration = config.duration;
            existingEffect.startTime = now; // 重置开始时间
            existingEffect.endTime = now + config.duration; // 🔧 更新結束時間
            needsUpdate = true;
        }

        // 更新效果数值为更大的（只有明顯更大時）
        if (config.value && config.value > existingEffect.value * 1.1) {
            existingEffect.value = config.value;
            needsUpdate = true;
        }

        // 🔧 如果沒有實質更新，跳過同步（減少封包）
        if (!needsUpdate) {
            // console.log(`🔇 狀態效果疊加跳過同步: ${existingEffect.type}`);
        }
    }

    /**
     * 🆕 创建新效果（優化版本）
     * 
     * 🎯 優化點：
     * 1. 使用簡短的 ID（類型 + 目標ID）- 減少字符串長度
     * 2. 同步結束時間而非開始時間 - 客戶端可直接計算剩餘時間
     * 3. 記錄 sourceId - 用於 DOT 傷害計算時套用施加者的屬性加成
     */
    private createNewEffect(target: ServerGameUnit, config: StatusEffectConfig, attackerId?: string): void {
        // 🔧 優化：使用簡短的ID（狀態類型可以保證唯一性）
        const effectId = `${config.type}_${target.id}`;

        const now = Date.now();

        // 創建 StatusEffect Schema
        const statusEffect = new StatusEffect();
        statusEffect.id = effectId;
        statusEffect.type = config.type;
        statusEffect.endTime = now + config.duration; // 🔧 同步結束時間（客戶端可計算：endTime - Date.now()）
        statusEffect.value = config.value || 0;
        statusEffect.stacks = 1; // 初始1层
        statusEffect.maxStacks = this.getMaxStacks(config.type); // 根据类型设置最大层数
        statusEffect.sourceId = attackerId || ""; // 🆕 記錄施加者ID

        // 🔧 伺服器專用屬性
        statusEffect.duration = config.duration;
        statusEffect.startTime = now; // 記錄效果開始時間（由 StatusEffectSystem 使用）

        // 應用到目標單位 (自動同步到客戶端)
        target.addStatusEffect(statusEffect);

        // 🎯 更新緩存
        if (!this.effectCache.has(target.id)) {
            this.effectCache.set(target.id, new Map());
        }
        this.effectCache.get(target.id)!.set(config.type, statusEffect);
    }

    /**
     * 🆕 获取效果的最大叠加层数
     */
    private getMaxStacks(effectType: string): number {
        const maxStacksConfig: Record<string, number> = {
            burn: 5,       // 燃烧最多5层
            poison: 10,    // 中毒最多10层
            slow: 3,       // 减速最多3层
            freeze: 1,     // 冰冻不叠加
            stun: 1,       // 眩晕不叠加
            knockback: 1,  // 击退不叠加
        };
        return maxStacksConfig[effectType] || 5; // 默认5层
    }

    /**
     * 🆕 應用擊退效果
     * 計算擊退方向並設置單位速度
     */
    private applyKnockback(
        target: ServerGameUnit,
        attackerPosition: { x: number; y: number },
        force: number,
    ): void {
        // 計算擊退方向 (遠離攻擊者)
        const dx = target.position.x - attackerPosition.x;
        const dy = target.position.y - attackerPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return;

        // 歸一化方向
        const directionX = dx / distance;
        const directionY = dy / distance;

        // 應用擊退力量
        target.vx = directionX * force;
        target.vy = directionY * force;

        console.log(`💨 擊退效果: ${target.id} 力量=${force}`);
    }

    /**
     * 獲取有效目標
     */
    private getValidTargets(targetIds: string[]): ServerGameUnit[] {
        return targetIds
            .map((id) => this.gameRoom.state.allUnits.get(id))
            .filter((unit) => unit && !unit.isDead) as ServerGameUnit[];
    }

    /**
     * 獲取戰鬥日誌系統 - 供其他系統統一使用
     */
    public getBattleLogSystem(): BattleLogSystem {
        return this.battleLogSystem;
    }
}

/**
 * 戰鬥執行狀態 - CombatSystem 內部使用的執行結果
 *
 * 與 AttackResult 的差異：
 * - AttackResult: 武器系統返回的「攻擊計劃」
 * - CombatExecution: 戰鬥系統執行的「實際結果」
 */
interface CombatExecution {
    damageResults: DamageResult[]; // 實際造成的傷害結果
    shouldCreateProjectile: boolean; // 是否需要創建投射物
}
