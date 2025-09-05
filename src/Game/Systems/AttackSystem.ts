import { GameRoom } from "../../Colyseus/Rooms/GameRoom";
import { ServerHero } from "../../Colyseus/Schema/Unit/Hero";
import { ServerGameUnit } from "../../Colyseus/Schema/Unit/GameUnit";
import { AttackResult, WeaponType } from "@/Types";
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

        if (attackResults.length === 0) {
            // 沒有攻擊結果，可能是所有武器都在冷卻中或沒有目標
            return;
        }

        console.log(`🎯 ${hero.name} 產生了 ${attackResults.length} 個攻擊結果`);

        for (const result of attackResults) {
            console.log(`📊 攻擊結果: 成功=${result.success}, 武器=${result.weaponId}, 目標數=${result.targetIds?.length || 0}`);

            if (result.success) {
                this.handleAttackResult(hero, result);
            } else {
                console.log(`❌ 攻擊失敗: ${result.reason}`);
            }
        }
    }

    /**
     * 處理攻擊結果
     */
    private handleAttackResult(hero: ServerHero, result: AttackResult): void {
        if (!result.targetIds || result.targetIds.length === 0) {
            console.log(`⚠️ 攻擊結果無效 - 沒有目標ID`);
            return;
        }

        // 獲取武器對象來判斷類型
        const equippedWeapons = hero.getEquippedWeapons();

        // 🔧 改進武器查找邏輯 - 添加更多檢查方式
        let weapon = equippedWeapons.find(w => w.weaponId === result.weaponId);

        // 如果直接匹配失敗，嘗試其他匹配方式
        if (!weapon && equippedWeapons.length > 0) {
            console.warn(`⚠️ 直接匹配武器失敗，嘗試其他方式`);
            console.warn(`🔍 尋找武器: "${result.weaponId}"`);
            console.warn(`🔍 可用武器: ${equippedWeapons.map(w => `"${w.weaponId}"`).join(', ')}`);

            // 嘗試不區分大小寫匹配
            weapon = equippedWeapons.find(w =>
                w.weaponId.toLowerCase() === result.weaponId?.toLowerCase()
            );

            // 如果還是找不到，使用第一個武器作為備用方案
            if (!weapon) {
                console.warn(`⚠️ 無法匹配武器，使用第一個可用武器作為備用`);
                weapon = equippedWeapons[0];
            }
        }

        if (!weapon) {
            console.warn(`❌ 找不到任何可用武器進行攻擊`);
            return;
        }

        console.log(`✅ 使用武器: ${weapon.weaponId}, 類型: ${weapon.weaponType}`);

        // 獲取目標單位
        const targets = this.getValidTargets(result.targetIds);
        if (targets.length === 0) {
            console.log(`⚠️ 攻擊目標無效 - 沒有存活的目標`);
            return;
        }

        console.log(`🎯 攻擊目標數量: ${targets.length}`);

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

        console.log(`🔍 處理攻擊類型 - 武器: ${weapon.weaponId}, 類型: "${weapon.weaponType}"`);
        console.log(`🔍 WeaponType 枚舉 - PROJECTILE: "${WeaponType.PROJECTILE_WEAPON}", MELEE: "${WeaponType.MELEE_WEAPON}"`);
        console.log(`🔍 類型比較結果: ${weapon.weaponType === WeaponType.PROJECTILE_WEAPON ? 'PROJECTILE' : 'MELEE'}`);

        if (weapon.weaponType === WeaponType.PROJECTILE_WEAPON) {
            // 投射武器：延遲傷害處理
            attackData.shouldCreateProjectile = true;
            console.log(`🏹 投射武器攻擊: ${result.weaponId} - 創建投射物`);
        } else {
            // 近戰武器：立即造成傷害
            console.log(`⚔️ 開始處理近戰武器攻擊: ${result.weaponId}`);
            console.log(`⚔️ 目標數量: ${targets.length}, 基礎傷害: ${result.baseDamage}`);

            attackData.damageResults = this.gameRoom.damageSystem.dealDamageToMultipleTargets(
                hero,
                targets,
                result.baseDamage,
                'physical',
                result.weaponId
            );

            console.log(`⚔️ 近戰武器攻擊完成: ${result.weaponId} - 傷害結果數: ${attackData.damageResults.length}`);

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
    public getStats(): AttackSystemStats {
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
