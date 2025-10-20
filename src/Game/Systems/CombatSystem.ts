import { GameRoom } from '../../Colyseus/Rooms/GameRoom';
import { ServerHero } from '../../Colyseus/Schema/Unit/Hero';
import { ServerGameUnit } from '../../Colyseus/Schema/Unit/GameUnit';
import { AttackResult, VisualEffect, WeaponType, StatusEffectConfig } from '@/Types';

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
            attackData.damageResults =
                this.gameRoom.damageSystem.dealDamageToMultipleTargets(
                    hero,
                    targets,
                    result.baseDamage,
                    'physical',
                    result.weaponId,
                );

            // 近戰武器立即應用狀態效果
            if (result.statusEffects && result.statusEffects.length > 0) {
                for (const target of targets) {
                    this.applyStatusEffects(
                        target,
                        result.statusEffects,
                        { x: hero.position.x, y: hero.position.y }
                    );
                }
            }

            // 處理戰報
            this.handleBattleLog(hero, attackData.damageResults);
        }

        return attackData;
    }

    /**
     * 🆕 從攻擊結果創建投射物實體（重構版）
     * 
     * 🎯 職責：
     * - 直接使用 projectileConfig 創建 ServerBullet
     * - 不再需要 visualEffects 作為中轉層
     * - ServerBullet 通過 Colyseus Schema 自動同步到客戶端
     * 
     * 📝 配置優先級：
     * 1. 武器覆蓋配置（projectileConfig 中的可選屬性）
     * 2. 彈藥默認配置（ProjectileBasic.getConfig）
     * 
     * ⚠️ 注意：BulletCreateConfig 只支持部分屬性
     * - bounceCount, collisionRadius 將在未來版本添加到 BulletCreateConfig
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
        this.gameRoom.broadcast('weapon_attack', {
            heroId: hero.id,
            weaponId: result.weaponId,
            attackData: result.attackData,
            damageResults: attackData.damageResults,
            visualEffects: result.visualEffects,
            timestamp: Date.now(),
        });
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
     */
    public applyStatusEffects(
        target: ServerGameUnit,
        effectConfigs: StatusEffectConfig[],
        attackerPosition?: { x: number; y: number },
    ): void {
        for (const config of effectConfigs) {
            // 檢查機率觸發
            if (config.chance !== undefined) {
                const roll = Math.random() * 100;
                if (roll > config.chance) {
                    continue; // 未觸發
                }
            }

            // 🆕 检查是否已存在相同类型的效果
            const existingEffect = this.findExistingEffect(target, config.type);

            if (existingEffect) {
                // 叠加现有效果
                this.stackEffect(existingEffect, config);
                console.log(`🔥 狀態效果疊加: ${config.type} → ${target.id} (${existingEffect.stacks}層)`);
            } else {
                // 创建新效果
                this.createNewEffect(target, config);
                console.log(`✨ 狀態效果已應用: ${config.type} → ${target.id} (持續 ${config.duration}ms)`);
            }

            // 特殊處理：擊退效果
            if (config.type === 'knockback' && attackerPosition) {
                this.applyKnockback(target, attackerPosition, config.value || 0);
            }
        }
    }

    /**
     * 🆕 查找已存在的相同类型效果
     */
    private findExistingEffect(target: ServerGameUnit, effectType: string): StatusEffect | null {
        for (const [, effect] of target.statusEffects) {
            if (effect.type === effectType) {
                return effect;
            }
        }
        return null;
    }

    /**
     * 🆕 叠加现有效果
     */
    private stackEffect(existingEffect: StatusEffect, config: StatusEffectConfig): void {
        // 增加层数（不超过最大值）
        if (existingEffect.stacks < existingEffect.maxStacks) {
            existingEffect.stacks++;
        }

        // 刷新持续时间为更长的
        if (config.duration > existingEffect.duration) {
            existingEffect.duration = config.duration;
            existingEffect.startTime = Date.now(); // 重置开始时间
        }

        // 更新效果数值为更大的
        if (config.value && config.value > existingEffect.value) {
            existingEffect.value = config.value;
        }
    }

    /**
     * 🆕 创建新效果
     */
    private createNewEffect(target: ServerGameUnit, config: StatusEffectConfig): void {
        // 生成唯一ID
        const effectId = `${config.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 創建 StatusEffect Schema
        const statusEffect = new StatusEffect();
        statusEffect.id = effectId;
        statusEffect.type = config.type;
        statusEffect.duration = config.duration;
        statusEffect.value = config.value || 0;
        statusEffect.startTime = Date.now(); // 記錄效果開始時間
        statusEffect.stacks = 1; // 初始1层
        statusEffect.maxStacks = this.getMaxStacks(config.type); // 根据类型设置最大层数

        // 應用到目標單位 (自動同步到客戶端)
        target.addStatusEffect(statusEffect);
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
            .map((id) => this.gameRoom.state.gameCore.allUnits.get(id))
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
