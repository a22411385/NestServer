import { GameRoom } from "../../Colyseus/Rooms/GameRoom";
import { ServerHero } from "../../Colyseus/Schema/Unit/Hero";
import { ServerGameUnit } from "../../Colyseus/Schema/Unit/GameUnit";
import { WeaponAttackResult } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { UnitType } from "../../Colyseus/Schema/GameState";
import { BattleLogSystem } from "./BattleLogSystem";

/**
 * 攻擊系統 - 負責處理所有攻擊相關邏輯
 */
export class AttackSystem {
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
                this.handleWeaponAttackResult(hero, result);
            }
        }
    }

    /**
     * 處理武器攻擊結果
     */
    private handleWeaponAttackResult(hero: ServerHero, result: WeaponAttackResult): void {
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
        result: WeaponAttackResult
    ): AttackProcessResult {
        const attackData: AttackProcessResult = {
            damageResults: [],
            shouldCreateProjectile: false
        };

        if (weapon.weaponType === 'projectile') {
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
        result: WeaponAttackResult,
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
        attackResult: WeaponAttackResult
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

            case 'projectile':
                if (visualEffect.data) {
                    const bulletDamage = attackResult.baseDamage || visualEffect.data.damage || 10;

                    this.gameRoom.bulletSystem.spawnBullet({
                        ownerId: hero.id,
                        startPosition: visualEffect.data.startPosition || visualEffect.position,
                        direction: visualEffect.data.direction || visualEffect.direction,
                        damage: bulletDamage,
                        speed: visualEffect.data.speed || 300,
                        bulletType: visualEffect.data.bulletType,
                        lifeTime: visualEffect.data.lifeTime || 3000
                    });
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
        result: WeaponAttackResult,
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
    public getStats(): AttackSystemStats {
        // 統計攻擊系統的相關數據
        return {
            totalAttacksProcessed: 0, // 可以添加計數器
            activeHeroes: Array.from(this.gameRoom.state.gameCore.allUnits.values())
                .filter(unit => unit.type === UnitType.hero && !unit.isDead).length,
            averageAttackRate: 0 // 可以計算平均攻擊頻率
        };
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
 * 攻擊系統統計接口
 */
interface AttackSystemStats {
    totalAttacksProcessed: number;
    activeHeroes: number;
    averageAttackRate: number;
}
