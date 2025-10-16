import { GameRoom } from "../../Colyseus/Rooms/GameRoom";
import { ServerHero } from "../../Colyseus/Schema/Unit/Hero";
import { ServerGameUnit } from "../../Colyseus/Schema/Unit/GameUnit";
import { AttackResult, VisualEffect, WeaponType } from "@/Types";

import { BattleLogSystem } from "./BattleLogSystem";
import { DamageResult } from "./DamageSystem";
import { WeaponBasic } from "@/Colyseus/Schema/Weapon/Baisc";

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
    private processHeroAttacks(hero: ServerHero, enemies: ServerGameUnit[]): void {
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

        // 處理視覺效果（包括投射物創建）
        this.handleVisualEffects(hero, result, attackData);

        // 廣播攻擊結果
        this.broadcastAttackResult(hero, result, attackData);
    }

    /**
     * 根據武器類型處理攻擊
     */
    private processAttackByWeaponType(
        hero: ServerHero,
        weapon: WeaponBasic,
        targets: ServerGameUnit[],
        result: AttackResult
    ): CombatExecution {
        const attackData: CombatExecution = {
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
     * 處理視覺效果（包括投射物創建）
     */
    private handleVisualEffects(
        hero: ServerHero,
        result: AttackResult,
        attackData: CombatExecution
    ): void {
        // 如果需要創建投射物，處理投射武器的視覺效果
        if (attackData.shouldCreateProjectile && result.visualEffects) {
            for (const visualEffect of result.visualEffects) {
                if (visualEffect.type === 'projectile') {
                    this.createProjectileFromVisualEffect(hero, visualEffect, result);
                }
            }
        }

        // 處理其他視覺效果
        if (result.visualEffects) {
            for (const visualEffect of result.visualEffects) {
                if (visualEffect.type !== 'projectile') {
                    this.processVisualEffect(hero, visualEffect, result);
                }
            }
        }
    }

    /**
     * 從視覺效果創建投射物
     */
    private createProjectileFromVisualEffect(
        hero: ServerHero,
        visualEffect: VisualEffect,
        attackResult: AttackResult
    ): void {
        if (visualEffect.data) {
            const bulletDamage = attackResult.baseDamage || visualEffect.data.damage || 10;

            this.gameRoom.bulletSystem.spawnBullet({
                ownerId: hero.id,
                startPosition: visualEffect.data.startPosition || visualEffect.position,
                direction: visualEffect.data.direction || visualEffect.direction,
                damage: bulletDamage,
                speed: visualEffect.data.speed || 300,
                bulletClass: visualEffect.data.bulletType || 'basic',
                weaponId: attackResult.weaponId || ""
            });

            console.log(`🚀 創建投射物子彈: ${attackResult.weaponId} 傷害=${bulletDamage}`);
        }
    }

    /**
     * 處理其他視覺效果
     */
    private processVisualEffect(
        hero: ServerHero,
        visualEffect: VisualEffect,
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
        attackData: CombatExecution
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
    private handleBattleLog(hero: ServerHero, damageResults: DamageResult[]): void {
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
    damageResults: DamageResult[];           // 實際造成的傷害結果
    shouldCreateProjectile: boolean; // 是否需要創建投射物
}
