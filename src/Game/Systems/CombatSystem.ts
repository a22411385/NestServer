import { GameRoom } from "../../Colyseus/Rooms/GameRoom";
import { ServerHero } from "../../Colyseus/Schema/Unit/Hero";
import { ServerGameUnit } from "../../Colyseus/Schema/Unit/GameUnit";
import { WeaponBasic } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { AttackResult, WeaponType } from "@/Types";
import { UnitType } from "../../Colyseus/Schema/GameState";
import { BattleLogSystem } from "./BattleLogSystem";

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
        const aliveEnemies = this.gameRoom.unitManager.getAllAliveEnemies();

        for (const [heroId, unit] of this.gameRoom.state.gameCore.allUnits) {
            if (unit.type !== UnitType.hero || unit.isDead) continue;

            const hero = unit as ServerHero;
            this.processHeroAttacks(hero, aliveEnemies);
        }
    }

    /**
     * 處理單個英雄的攻擊
     */
    private processHeroAttacks(hero: ServerHero, enemies: ServerGameUnit[]): void {
        const attackResults = hero.tryAttack(enemies);

        for (const result of attackResults) {
            if (result.success) {
                this.handleAttackResult(hero, result);
            }
        }
    }

    /**
     * 處理攻擊結果
     */
    private handleAttackResult(hero: ServerHero, result: AttackResult): void {
        if (!result.targetIds || result.targetIds.length === 0) return;

        // 獲取武器對象來判斷類型
        const equippedWeapons = hero.getEquippedWeapons();
        const weapon = equippedWeapons.find(w => w.weaponId === result.weaponId);
        if (!weapon) {
            console.warn(`找不到武器: ${result.weaponId}`);
            return;
        }

        // 獲取目標單位
        const targets = this.getValidTargets(result.targetIds);
        if (targets.length === 0) return;

        // 根據武器類型處理攻擊
        const attackData = this.processAttackByWeaponType(hero, weapon, targets, result);

        // 處理視覺效果
        this.handleVisualEffects(hero, result, attackData);

        // 廣播攻擊結果
        this.broadcastAttackResult(hero, result, attackData);
    }

    /**
     * 根據武器類型處理攻擊
     */
    private processAttackByWeaponType(
        hero: ServerHero,
        weapon: any,
        targets: ServerGameUnit[],
        result: AttackResult
    ): AttackProcessResult {
        const attackData: AttackProcessResult = {
            damageResults: [],
            shouldCreateProjectile: false
        };

        if (weapon.weaponType === WeaponType.PROJECTILE_WEAPON) {
            // 投射武器：延遲傷害處理
            attackData.shouldCreateProjectile = true;
            console.log(`🏹 投射武器攻擊: ${result.weaponId} - 創建投射物`);
        } else {
            // 近戰武器：立即造成傷害
            attackData.damageResults = this.gameRoom.damageSystem.dealDamageToMultipleTargets(
                hero,
                targets,
                result.baseDamage,
                'physical',
                result.weaponId
            );
            console.log(`⚔️ 近戰武器攻擊: ${result.weaponId} - 立即傷害`);

            // 處理戰報
            this.handleBattleLog(hero, attackData.damageResults);
        }

        return attackData;
    }

    /**
     * 處理視覺效果
     */
    private handleVisualEffects(
        hero: ServerHero,
        result: AttackResult,
        attackData: AttackProcessResult
    ): void {
        if (!result.visualEffects) return;

        for (const visualEffect of result.visualEffects) {
            this.processVisualEffect(hero, visualEffect, result);
        }
    }

    /**
     * 處理單個視覺效果
     */
    private processVisualEffect(
        hero: ServerHero,
        visualEffect: any,
        attackResult: AttackResult
    ): void {
        switch (visualEffect.type) {
            case 'swing':
                this.gameRoom.broadcast('melee_swing', {
                    heroId: hero.id,
                    position: visualEffect.position,
                    direction: visualEffect.direction,
                    weaponData: visualEffect.data
                });
                break;

            case 'slash':
                this.gameRoom.broadcast('slash_effect', {
                    heroId: hero.id,
                    position: visualEffect.position,
                    direction: visualEffect.direction,
                    data: visualEffect.data
                });
                break;

            case 'projectile': // 🔧 修復：使用正確的視覺效果類型
                if (visualEffect.data) {
                    const bulletDamage = attackResult.baseDamage || visualEffect.data.damage || 10;

                    this.gameRoom.bulletSystem.spawnBullet({
                        ownerId: hero.id,
                        startPosition: visualEffect.data.startPosition || visualEffect.position,
                        direction: visualEffect.data.direction || visualEffect.direction,
                        damage: bulletDamage,
                        speed: visualEffect.data.speed || 300,
                        bulletType: visualEffect.data.bulletType || 'basic',
                        lifeTime: visualEffect.data.lifeTime || 3000
                    });

                    console.log(`🚀 創建投射物子彈: ${visualEffect.data.weaponId} 傷害=${bulletDamage}`);
                }
                break;

            case 'explosion':
                this.gameRoom.broadcast('explosion_effect', {
                    position: visualEffect.position,
                    data: visualEffect.data
                });
                break;
        }
    }

    /**
     * 廣播攻擊結果
     */
    private broadcastAttackResult(
        hero: ServerHero,
        result: AttackResult,
        attackData: AttackProcessResult
    ): void {
        this.gameRoom.broadcast('weapon_attack', {
            heroId: hero.id,
            weaponId: result.weaponId,
            attackData: result.attackData,
            damageResults: attackData.damageResults,
            visualEffects: result.visualEffects,
            timestamp: Date.now()
        });
    }

    /**
     * 處理戰報
     */
    private handleBattleLog(hero: ServerHero, damageResults: any[]): void {
        this.battleLogSystem.handleAttackBattleLog(hero, damageResults);
    }

    /**
     * 獲取有效目標
     */
    private getValidTargets(targetIds: string[]): ServerGameUnit[] {
        return targetIds
            .map(id => this.gameRoom.state.gameCore.allUnits.get(id))
            .filter(unit => unit && !unit.isDead) as ServerGameUnit[];
    }

    /**
     * 手動觸發英雄攻擊（用於技能或特殊攻擊）
     */
    public triggerHeroAttack(heroId: string, targetId?: string): boolean {
        const hero = this.gameRoom.state.gameCore.allUnits.get(heroId) as ServerHero;
        if (!hero || hero.isDead || hero.type !== UnitType.hero) {
            return false;
        }

        let targets: ServerGameUnit[];
        if (targetId) {
            const target = this.gameRoom.state.gameCore.allUnits.get(targetId);
            targets = target && !target.isDead ? [target] : [];
        } else {
            targets = this.gameRoom.unitManager.getAllAliveEnemies();
        }

        if (targets.length === 0) return false;

        this.processHeroAttacks(hero, targets);
        return true;
    }

    /**
     * 獲取攻擊系統統計
     */
    public getStats(): CombatSystemStats {
        // 統計攻擊系統的相關數據
        return {
            totalAttacksProcessed: 0, // 可以添加計數器
            activeHeroes: Array.from(this.gameRoom.state.gameCore.allUnits.values())
                .filter(unit => unit.type === UnitType.hero && !unit.isDead).length,
            averageAttackRate: 0 // 可以計算平均攻擊頻率
        };
    }

    /**
     * 獲取戰鬥日誌系統 - 供其他系統統一使用
     */
    public getBattleLogSystem(): BattleLogSystem {
        return this.battleLogSystem;
    }

    /**
     * 處理玩家手動攻擊（點擊攻擊）
     */
    public handlePlayerAttack(heroId: string, targetX: number, targetY: number): boolean {
        const hero = this.gameRoom.state.gameCore.allUnits.get(heroId) as ServerHero;
        if (!hero || hero.isDead || hero.type !== UnitType.hero) return false;

        // 查找範圍內的敵人
        let targetEnemy: ServerGameUnit | null = null;
        let closestDistance = hero.attackRange;

        for (const [unitId, unit] of this.gameRoom.state.gameCore.allUnits) {
            if (unit.type !== UnitType.enemy || unit.isDead) continue;

            const distance = Math.hypot(
                unit.position.x - targetX,
                unit.position.y - targetY
            );

            if (distance <= closestDistance) {
                targetEnemy = unit;
                closestDistance = distance;
            }
        }

        if (targetEnemy) {
            // 使用統一的傷害系統處理傷害
            const damageResult = this.gameRoom.damageSystem.dealDamageToTarget({
                attacker: hero,
                target: targetEnemy,
                baseDamage: hero.attackDamage,
                damageType: 'physical',
                source: 'manual_attack'
            });

            // 使用統一的戰鬥日誌系統
            this.battleLogSystem.sendBattleLog(
                `${hero.name} 手動攻擊造成 ${damageResult.actualDamage} 點傷害`,
                'damage'
            );

            if (damageResult.targetKilled) {
                this.battleLogSystem.sendBattleLog(
                    `${hero.name} 擊殺了敵人！`,
                    'kill'
                );
            }

            // 廣播攻擊視覺效果
            this.gameRoom.broadcast("playerAttacked", {
                heroId: heroId,
                targetX: targetX,
                targetY: targetY,
                damage: damageResult.actualDamage,
                killed: damageResult.targetKilled
            });

            return true;
        }

        return false;
    }

    /**
     * 處理戰鬥傷害回報（來自敵人攻擊）
     */
    public processDamageReport(heroHealthChanges: Map<string, { before: number; after: number; hero: ServerHero }>): void {
        for (const [heroId, healthData] of heroHealthChanges) {
            if (healthData.after < healthData.before) {
                const damage = healthData.before - healthData.after;
                this.battleLogSystem.sendBattleLog(
                    `殭屍對 ${healthData.hero.name} 造成 ${damage} 點傷害`,
                    'damage'
                );
            }
        }
    }
}

/**
 * 攻擊處理結果接口
 */
interface AttackProcessResult {
    damageResults: any[];
    shouldCreateProjectile: boolean;
}

/**
 * 戰鬥系統統計接口
 */
interface CombatSystemStats {
    totalAttacksProcessed: number;
    activeHeroes: number;
    averageAttackRate: number;
}
