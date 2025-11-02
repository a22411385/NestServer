import { GameRoom } from '../../../Colyseus/Rooms/GameRoom';
import { ServerHero } from '../../../Colyseus/Schema/Unit/Hero';
import { ServerEnemy } from '../../../Colyseus/Schema/Unit/Enemy';
import { ServerGameUnit } from '../../../Colyseus/Schema/Unit/GameUnit';
import { UnitType } from '../../../Colyseus/Schema/GameState';
import { BattleMathUtils } from '../../../Util/BattleMathUtils';
import { WeaponModifier } from '../../../Types/Equipment/WeaponPropertyTypes';

export interface DamageInfo {
    attacker?: ServerGameUnit; // 🆕 改為可選（DOT 可能沒有施加者）
    target: ServerGameUnit;
    baseDamage: number;
    damageType?: 'physical' | 'magic' | 'true'; // 防禦計算類型
    isCritical?: boolean;
    source?: string; // 武器ID或技能ID
    elementTags?: string[]; // 🔥 統一的元素標籤（如 ['fire', 'elemental'] 或 DOT 的 ['burn']）
    weaponModifiers?: WeaponModifier[]; // 🆕 武器詞綴列表（用於物理效果判斷）
    position?: { x: number, y: number };
}

export interface DamageResult {
    actualDamage: number;
    wasCritical: boolean;
    targetKilled: boolean;
    targetId: string;
    attackerId: string;
    damageType: string;
    effects?: PhysicalEffect[]; // 物理效果列表
}

/**
 * 🔥 物理效果（立即性位移/控制效果）- 使用標籤系統
 * 
 * 與 StatusEffect 的區別：
 * - PhysicalEffect: 立即生效的位移/控制（knockback, stun, root）
 * - StatusEffect: 持續的狀態效果（burn, poison, slow）
 * 
 * 🎯 使用標籤系統：type 可以是任意標籤，不受硬編碼限制
 * 
 * 常見標籤範例：
 * - knockback: 擊退目標
 * - pull: 拉扯目標
 * - stun: 暈眩目標（停止行動）
 * - root: 定身（禁止移動）
 * - airborne: 擊飛（空中狀態）
 * - knockdown: 擊倒（倒地狀態）
 * - teleport: 傳送
 * - swap: 交換位置
 * 
 * @example
 * // 擊退效果
 * { type: 'knockback', value: 100, duration: 0 }
 * 
 * // 暈眩效果
 * { type: 'stun', value: 0, duration: 2000 }
 * 
 * // 自訂效果（標籤系統的靈活性）
 * { type: 'gravity_well', value: 50, duration: 3000 }
 */
export interface PhysicalEffect {
    type: string; // 🔥 效果標籤（任意字串，配置驅動）
    value: number; // 效果數值（如擊退距離、拉扯力度）
    duration?: number; // 持續時間（ms，0 表示立即生效）
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
        const { attacker, target, damageType = 'physical' } = damageInfo;

        if (target.isDead) {
            return this.createEmptyResult(target.id, attacker?.id || 'unknown', damageType);
        }

        // 計算最終傷害（baseDamage 在 calculateFinalDamage 內部從 damageInfo 取得）
        const finalDamage = this.calculateFinalDamage(damageInfo);
        const isCritical = attacker ? this.rollCriticalHit(attacker, target) : false;
        const critMultiplier = attacker ? this.getCriticalDamageMultiplier(attacker) : 1.0;
        const actualDamage = isCritical ? Math.floor(finalDamage * critMultiplier) : finalDamage;

        // 應用傷害
        const previousHp = target.hp;
        target.hp = BattleMathUtils.atLeast(target.hp - actualDamage, 0);
        const realDamage = previousHp - target.hp;

        // 🆕 應用生命偷取（在造成傷害後）
        if (attacker && attacker.type === UnitType.hero && realDamage > 0) {
            this.applyLifeSteal(attacker as ServerHero, realDamage);
        }

        // 檢查目標是否死亡
        const wasKilled = target.hp <= 0;
        if (wasKilled && !target.isDead) {
            target.isDead = true;
            target.vx = 0; // 停止移動
            target.vy = 0;
            if (attacker) {
                this.handleUnitDeath(target, attacker);
                console.log(`💀 ${target.name} 被 ${attacker.name} 擊殺！`);
            } else {
                // DOT 傷害導致死亡
                this.handleUnitDeath(target, target); // 視為自殺
                console.log(`💀 ${target.name} 因持續傷害死亡！`);
            }
        }

        // 應用額外效果
        const effects = this.applyDamageEffects(damageInfo, target);
        return {
            actualDamage: realDamage,
            wasCritical: isCritical,
            targetKilled: wasKilled,
            targetId: target.id,
            attackerId: attacker?.id || 'dot',
            damageType: damageType,
            effects: effects
        };
    }

    /**
     * 處理多目標傷害（如球棒的扇形攻擊）
     * 🆕 支持傳入 weaponModifiers 以應用物理效果（擊退等）
     */
    public dealDamageToMultipleTargets(
        attacker: ServerGameUnit,
        targets: ServerGameUnit[],
        baseDamage: number,
        damageType: 'physical' | 'magic' | 'true' = 'physical',
        source?: string,
        weaponModifiers?: WeaponModifier[] // 🆕 武器詞綴
    ): DamageResult[] {
        const results: DamageResult[] = [];

        for (const target of targets) {
            const damageInfo: DamageInfo = {
                attacker,
                target,
                baseDamage,
                damageType,
                source,
                weaponModifiers, // 🆕 傳遞武器詞綴
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
     * 🔥 計算最終傷害（POE風格標籤系統）
     * ✅ 統一傷害計算入口：所有傷害都必須通過這裡
     * 
     * 自動套用：
     * - Hero 的 attackDamage（力量加成）
     * - 元素傷害加成（基於 elementTags 標籤匹配）
     * - 天賦效果（所有傷害 +20%）
     * - 目標防禦減免（基於 damageType）
     */
    public calculateFinalDamage(damageInfo: DamageInfo): number {
        const { attacker, target, baseDamage, damageType, elementTags } = damageInfo;
        let finalDamage = baseDamage;

        // 根據攻擊者屬性調整傷害
        if (attacker && attacker.type === UnitType.hero) {
            const hero = attacker as ServerHero;
            finalDamage += hero.attackDamage; // 添加英雄攻擊力

            // 🔥 套用元素傷害加成（統一使用標籤系統）
            const elementDamageBonus = this.getElementDamageBonus(hero, elementTags);
            if (elementDamageBonus > 0) {
                finalDamage *= (1 + elementDamageBonus / 100);
                //console.log(`🔥 元素加成: ${elementTags?.join(',')} +${elementDamageBonus}% → ${finalDamage.toFixed(1)}`);
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
     * 🔥 獲取元素傷害加成（POE風格標籤系統）
     * ✅ 統一使用標籤匹配，支持多元素疊加
     * 
     * @param hero 英雄實例
     * @param elementTags 元素標籤陣列（如 ['fire', 'elemental'] 或 DOT 的 ['burn']）
     * @returns 傷害加成百分比 (0-100)
     * 
     * @example
     * // 武器攻擊
     * getElementDamageBonus(hero, ['fire', 'elemental'])
     * 
     * // DOT 傷害
     * getElementDamageBonus(hero, ['burn']) // burn 會匹配到 fire
     */
    private getElementDamageBonus(
        hero: ServerHero,
        elementTags?: string[]
    ): number {
        if (!elementTags || elementTags.length === 0) {
            return 0; // 沒有元素標籤
        }

        let totalBonus = 0;

        // 🔥 標籤匹配：檢查每個元素標籤並累加對應的傷害加成
        for (const tag of elementTags) {
            const lowerTag = tag.toLowerCase();

            switch (lowerTag) {
                case 'physical':
                    totalBonus += hero.physicalDamageBonus;
                    break;
                case 'fire':
                case 'burn':
                case 'ignite':
                    totalBonus += hero.fireDamageBonus;
                    break;
                case 'ice':
                case 'cold':
                case 'freeze':
                case 'chill':
                    totalBonus += hero.iceDamageBonus;
                    break;
                case 'lightning':
                case 'shock':
                    totalBonus += hero.lightningDamageBonus;
                    break;
                case 'poison':
                    totalBonus += hero.poisonDamageBonus;
                    break;
                case 'bleed':
                    totalBonus += hero.physicalDamageBonus; // 流血視為物理傷害
                    break;
                case 'holy':
                    totalBonus += hero.holyDamageBonus;
                    break;
                case 'shadow':
                    totalBonus += hero.shadowDamageBonus;
                    break;
                case 'arcane':
                    totalBonus += hero.arcaneDamageBonus;
                    break;
            }
        }

        // TODO: 整合天賦加成
        // const talentBonus = TalentManager.getInstance().getElementBonus(hero.id, elementTags);
        // totalBonus += talentBonus;

        return totalBonus;
    }

    /**
     * 暴擊判定
     * ✅ 整合武器暴擊率加成
     */
    private rollCriticalHit(attacker: ServerGameUnit, target: ServerGameUnit): boolean {
        if (attacker.type === UnitType.hero) {
            const hero = attacker as ServerHero;
            let totalCritRate = hero.critRate || 0; // 基礎暴擊率（來自屬性）

            // 🆕 加上裝備武器的暴擊率
            const equippedWeapons = hero.weaponInventory.filter(w => w.isEquipped);
            for (const weaponSchema of equippedWeapons) {
                try {
                    const finalStats = weaponSchema.getFinalStats();
                    if (finalStats && finalStats.critRate) {
                        totalCritRate += finalStats.critRate;
                    }
                } catch (error) {
                    // 武器 FinalStats 未初始化，跳過
                }
            }

            // 暴擊率上限 100%
            totalCritRate = Math.min(totalCritRate, 100);

            return BattleMathUtils.rollProbability(totalCritRate / 100);
        }
        return false;
    }

    /**
     * 🆕 獲取暴擊傷害倍率
     * ✅ 整合武器暴擊傷害加成
     * @returns 暴擊倍率（如 1.5 表示 150% 傷害）
     */
    private getCriticalDamageMultiplier(attacker: ServerGameUnit): number {
        if (attacker.type !== UnitType.hero) {
            return 1.5; // 非英雄使用預設值
        }

        const hero = attacker as ServerHero;
        let baseCritDamage = 150; // 基礎暴擊傷害 150%

        // 🆕 加上裝備武器的暴擊傷害
        const equippedWeapons = hero.weaponInventory.filter(w => w.isEquipped);
        for (const weaponSchema of equippedWeapons) {
            try {
                const finalStats = weaponSchema.getFinalStats();
                if (finalStats && finalStats.critDamage) {
                    baseCritDamage += finalStats.critDamage;
                }
            } catch (error) {
                // 武器 FinalStats 未初始化，跳過
            }
        }

        // TODO: 整合天賦暴擊傷害加成
        // const talentCritDamage = TalentManager.getInstance().getCritDamageBonus(hero.id);
        // baseCritDamage += talentCritDamage;

        // 轉換為倍率（150% → 1.5）
        return baseCritDamage / 100;
    }

    /**
     * 🆕 應用生命偷取
     * ✅ 整合所有裝備武器的生命偷取
     * 
     * @param hero 攻擊者（英雄）
     * @param damageDealt 造成的實際傷害
     */
    private applyLifeSteal(hero: ServerHero, damageDealt: number): void {
        let totalLifeSteal = 0;

        // 累加所有裝備武器的生命偷取
        const equippedWeapons = hero.weaponInventory.filter(w => w.isEquipped);
        for (const weaponSchema of equippedWeapons) {
            try {
                const finalStats = weaponSchema.getFinalStats();
                if (finalStats && finalStats.lifeSteal) {
                    totalLifeSteal += finalStats.lifeSteal;
                }
            } catch (error) {
                // 武器 FinalStats 未初始化，跳過
            }
        }

        // TODO: 整合天賦生命偷取加成
        // const talentLifeSteal = TalentManager.getInstance().getLifeStealBonus(hero.id);
        // totalLifeSteal += talentLifeSteal;

        // 如果有生命偷取，回復生命
        if (totalLifeSteal > 0) {
            const healAmount = Math.floor(damageDealt * (totalLifeSteal / 100));
            const previousHp = hero.hp;
            hero.hp = Math.min(hero.hp + healAmount, hero.maxHp);
            const actualHeal = hero.hp - previousHp;

            if (actualHeal > 0) {
                console.log(`💚 生命偷取: ${hero.name} 回復 ${actualHeal} HP (${totalLifeSteal}% of ${damageDealt})`);
            }
        }
    }

    /**
     * 獲取目標防禦力
     * ✅ 使用 Hero 的防禦屬性（已包含體質+武器+裝備加成）
     */
    private getTargetDefense(target: ServerGameUnit): number {
        // 根據目標類型返回防禦值
        if (target.type === UnitType.hero) {
            const hero = target as ServerHero;
            // ✅ 使用 Hero 的 physicalDefense 屬性（已在 recalculateAllStats 中計算）
            // 包含：體質×0.5 + 武器防禦 + 裝備防禦
            return hero.physicalDefense || 0;

            // TODO: 根據傷害類型選擇防禦
            // if (damageType === 'magic') return hero.magicDefense;
            // TODO: 整合天賦防禦加成
        }
        return 0; // 敵人暫時沒有防禦
    }

    /**
     * 🔥 應用物理效果（配置驅動 + 標籤系統）
     * 根據武器的 WeaponModifier 標籤判斷應用哪些立即性物理效果
     * 
     * 常見物理效果標籤：
     * - knockback: 推開目標（修改位置）
     * - pull: 拉扯目標靠近攻擊者
     * - bounce: 目標彈跳/反彈
     * - airborne: 擊飛目標（Y軸位移）
     * - root: 限制目標位移（設置標記）
     * - knockdown: 擊倒目標（倒地狀態）
     * - teleport: 傳送目標到指定位置
     * - swap: 交換攻擊者和目標的位置
     * 
     * ⚠️ 狀態效果（burn, poison, freeze）由 StatusEffectSystem 處理
     */
    private applyDamageEffects(damageInfo: DamageInfo, target: ServerGameUnit): PhysicalEffect[] {
        const effects: PhysicalEffect[] = [];

        // ✅ 配置驅動：從 weaponModifiers 讀取效果
        if (!damageInfo.weaponModifiers || damageInfo.weaponModifiers.length === 0) {
            return effects; // 沒有詞綴，不應用物理效果
        }

        // 🎯 遍歷武器詞綴，根據標籤判斷效果類型
        for (const modifier of damageInfo.weaponModifiers) {
            const tags = modifier.tags?.split(',').map(t => t.trim()) || [];

            // 擊退效果 (knockback)
            if (tags.includes('knockback') && damageInfo.attacker) {
                const knockbackEffect = this.applyKnockback(
                    damageInfo.attacker,
                    target,
                    modifier.baseValue // 從詞綴讀取擊退距離
                );
                if (knockbackEffect) {
                    effects.push(knockbackEffect);
                }
            }

            // 🆕 拉扯效果 (pull) - 範例
            // if (tags.includes('pull')) {
            //     const pullEffect = this.applyPull(
            //         damageInfo.attacker,
            //         target,
            //         modifier.baseValue // 拉扯距離
            //     );
            //     if (pullEffect) {
            //         effects.push(pullEffect);
            //     }
            // }

            // 🆕 擊飛效果 (airborne) - 範例
            // if (tags.includes('airborne')) {
            //     const airborneEffect = this.applyAirborne(
            //         target,
            //         modifier.baseValue, // 擊飛高度
            //         modifier.duration || 1000 // 滯空時間
            //     );
            //     if (airborneEffect) {
            //         effects.push(airborneEffect);
            //     }
            // }

            // 🆕 位移限制 (root) - 範例
            // if (tags.includes('root')) {
            //     const rootEffect = this.applyRoot(
            //         target,
            //         modifier.duration || 2000 // 定身時間
            //     );
            //     if (rootEffect) {
            //         effects.push(rootEffect);
            //     }
            // }
        }

        return effects;
    }

    /**
     * ✅ 應用擊退效果（配置驅動）
     * 
     * 💡 使用建議:
     * // 從 FinalWeaponStats 讀取屬性時,使用類型安全函數
     * import { WeaponDataService } from '@/Game/Services/WeaponDataService';
     * 
     * if (WeaponDataService.hasStat(weaponStats, 'knockbackForce')) {
     *     const force = weaponStats.knockbackForce!;
     *     this.applyKnockback(attacker, target, force);
     * }
     * 
     * @param attacker 攻擊者
     * @param target 目標
     * @param force 擊退力度（從 WeaponModifier.baseValue 讀取）
     */
    private applyKnockback(
        attacker: ServerGameUnit,
        target: ServerGameUnit,
        force: number
    ): PhysicalEffect | null {
        if (target.isDead) return null;

        // 計算擊退方向（目標 → 攻擊者的反方向）
        const dx = target.position.x - attacker.position.x;
        const dy = target.position.y - attacker.position.y;
        const distance = BattleMathUtils.calculateDistance(
            attacker.position.x,
            attacker.position.y,
            target.position.x,
            target.position.y
        );

        if (distance === 0) return null; // 防止除以零

        // 單位化方向向量
        const normalizedX = dx / distance;
        const normalizedY = dy / distance;

        // 應用擊退（立即修改目標位置）
        target.position.x += normalizedX * force;
        target.position.y += normalizedY * force;

        // 🆕 無邊界模式：不限制位置
        // 如需限制地圖邊界，取消註釋以下代碼：
        // const clampedPosition = BattleMathUtils.clampToMapBounds(
        //     target.position,
        //     this.room.mapWidth,
        //     this.room.mapHeight
        // );
        // target.position.x = clampedPosition.x;
        // target.position.y = clampedPosition.y;

        return {
            type: 'knockback',
            value: force
        };
    }

    /**
     * 🆕 應用拉扯效果（範例）
     * 將目標拉向攻擊者
     * @param attacker 攻擊者
     * @param target 目標
     * @param force 拉扯力度
     */
    // private applyPull(
    //     attacker: ServerGameUnit,
    //     target: ServerGameUnit,
    //     force: number
    // ): PhysicalEffect | null {
    //     if (target.isDead) return null;
    //
    //     // 計算拉扯方向（目標 → 攻擊者）
    //     const dx = attacker.position.x - target.position.x;
    //     const dy = attacker.position.y - target.position.y;
    //     const distance = BattleMathUtils.calculateDistance(
    //         attacker.position.x,
    //         attacker.position.y,
    //         target.position.x,
    //         target.position.y
    //     );
    //
    //     if (distance === 0) return null;
    //
    //     const normalizedX = dx / distance;
    //     const normalizedY = dy / distance;
    //
    //     // 應用拉扯（反向）
    //     target.position.x += normalizedX * force;
    //     target.position.y += normalizedY * force;
    //
    //     return {
    //         type: 'pull',
    //         value: force
    //     };
    // }

    /**
     * 🆕 應用擊飛效果（範例）
     * 讓目標進入滯空狀態
     * @param target 目標
     * @param height 擊飛高度
     * @param duration 滯空時間（ms）
     */
    // private applyAirborne(
    //     target: ServerGameUnit,
    //     height: number,
    //     duration: number
    // ): PhysicalEffect | null {
    //     if (target.isDead) return null;
    //
    //     // 設置滯空標記（需要在 GameUnit Schema 添加 isAirborne 屬性）
    //     // target.isAirborne = true;
    //     // target.airborneEndTime = Date.now() + duration;
    //
    //     // 客戶端可根據 isAirborne 播放飛行動畫
    //     return {
    //         type: 'airborne',
    //         value: height,
    //         duration: duration
    //     };
    // }

    /**
     * 🆕 應用位移限制效果（範例）
     * 禁止目標移動
     * @param target 目標
     * @param duration 定身時間（ms）
     */
    // private applyRoot(
    //     target: ServerGameUnit,
    //     duration: number
    // ): PhysicalEffect | null {
    //     if (target.isDead) return null;
    //
    //     // 設置定身標記（需要在 GameUnit Schema 添加 isRooted 屬性）
    //     // target.isRooted = true;
    //     // target.rootEndTime = Date.now() + duration;
    //
    //     // MovementSystem 應檢查 isRooted 來阻止移動
    //     return {
    //         type: 'root',
    //         value: 0,
    //         duration: duration
    //     };
    // }

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
