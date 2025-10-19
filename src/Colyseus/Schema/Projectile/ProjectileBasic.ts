import { ServerGameUnit } from '../Unit/GameUnit';
import { AttackResult, AttackFailReason, VisualEffect } from '../../../Types';
import { ServerBullet } from '../Bullet';
import { GameRoom } from '../../Rooms/GameRoom';

/**
 * 投射物基礎類 - 單例模式
 * 負責投射物命中時的邏輯處理，返回標準的 AttackResult
 * 
 * 🎯 設計理念：
 * - ProjectileBasic 定義**行為邏輯**（如何爆炸、如何穿透）+ **默認配置**
 * - 武器定義**實際數值**（穿透次數、AOE 範圍）- 可通過強化/品質改變
 * - ServerBullet 儲存**運行時狀態**（當前穿透次數、位置、方向）
 * - 使用單例模式避免重複創建實例
 * 
 * � 配置優先級：武器配置 > 投射物默認值
 * 
 * �📝 使用方式：
 * ```typescript
 * // 獲取默認配置
 * const projectile = ExplosiveProjectile.getInstance();
 * const defaultConfig = projectile.getConfig(); // { initialPierceCount: 1, areaOfEffect: 80 }
 * 
 * // 武器可以覆蓋默認值
 * const weaponConfig = { pierceCount: 3, areaOfEffect: 150 }; // +10 強化
 * ```
 */
export abstract class ProjectileBasic {
  // 投射物默認配置（可被武器覆蓋）
  protected initialPierceCount: number = 1;
  protected areaOfEffect: number = 0;
  protected bounceCount: number = 0;
  protected collisionRadius: number = 5;

  /**
   * 受保護的構造函數 - 強制使用單例模式
   */
  protected constructor() {
    this.applyProjectileConfig();
  }

  /**
   * 應用投射物特定配置（在構造函數中調用一次）
   * 提供默認配置值，武器可以覆蓋這些值
   */
  protected abstract applyProjectileConfig(): void;

  /**
   * 🆕 獲取投射物默認配置
   * 供 CombatSystem 使用作為回退值（武器沒設定時使用）
   * 
   * 🎯 配置優先級：武器配置 > 這裡的默認值
   */
  public getConfig(): {
    initialPierceCount: number;
    areaOfEffect: number;
    bounceCount: number;
    collisionRadius: number;
  } {
    return {
      initialPierceCount: this.initialPierceCount,
      areaOfEffect: this.areaOfEffect,
      bounceCount: this.bounceCount,
      collisionRadius: this.collisionRadius,
    };
  }

  /**
   * 投射物命中處理 - 虛擬方法，處理共同邏輯
   * @param bullet 命中的子彈實例
   * @param hitTarget 直接命中的目標
   * @param gameRoom 遊戲房間
   * @returns AttackResult 統一的攻擊結果
   */
  public onHit(
    bullet: ServerBullet,
    hitTarget: ServerGameUnit,
    gameRoom: GameRoom,
  ): AttackResult {
    // 1. 檢查子彈擁有者是否存在
    const owner = gameRoom.state.gameCore.allUnits.get(bullet.ownerId);
    if (!owner) {
      return {
        success: false,
        weaponId: bullet.weaponId,
        baseDamage: 0,
        reason: AttackFailReason.NO_TARGET,
      };
    }

    // 2. 尋找受影響的目標
    const affectedTargets = this.findAffectedTargets(
      bullet,
      hitTarget,
      gameRoom,
      owner
    );

    if (affectedTargets.length === 0) {
      return {
        success: false,
        weaponId: bullet.weaponId,
        baseDamage: 0,
        reason: AttackFailReason.NO_TARGET,
      };
    }

    // 3. 計算傷害
    const finalDamage = this.calculateDamage(bullet, hitTarget);

    // 4. 減少子彈的穿透次數
    bullet.pierceCount--;

    // 5. 構建攻擊結果
    return this.buildAttackResult(bullet, affectedTargets, finalDamage);
  }

  /**
   * 計算最終傷害（子類可以覆寫以修改傷害）
   */
  protected calculateDamage(
    bullet: ServerBullet,
    hitTarget: ServerGameUnit,
  ): number {
    return bullet.damage;
  }

  /**
   * 構建攻擊結果（子類可以覆寫以自定義結果）
   */
  protected buildAttackResult(
    bullet: ServerBullet,
    affectedTargets: ServerGameUnit[],
    damage: number,
  ): AttackResult {
    return {
      success: true,
      weaponId: bullet.weaponId,
      targetIds: affectedTargets.map((target) => target.id),
      baseDamage: damage,
      attackData: {
        position: bullet.getCurrentPosition(),
        direction: { x: bullet.direction.x, y: bullet.direction.y },
        range: this.areaOfEffect,
      },
      visualEffects: this.createVisualEffects(bullet, affectedTargets),
    };
  }

  /**
   * 創建預設視覺效果（子類需覆寫）
   */
  protected abstract createVisualEffects(
    bullet: ServerBullet,
    affectedTargets: ServerGameUnit[],
  ): VisualEffect[];

  /**
   * 尋找受影響的目標（子類必須實現）
   */
  protected abstract findAffectedTargets(
    bullet: ServerBullet,
    hitTarget: ServerGameUnit,
    gameRoom: GameRoom,
    owner: ServerGameUnit,
  ): ServerGameUnit[];

  /**
   * 通用的範圍搜索輔助方法
   */
  protected findTargetsInRadius(
    centerPosition: { x: number; y: number },
    radius: number,
    gameRoom: GameRoom,
    owner: ServerGameUnit,
    excludeTarget?: ServerGameUnit,

  ): ServerGameUnit[] {
    const targets: ServerGameUnit[] = [];

    for (const [, unit] of gameRoom.state.gameCore.allUnits) {
      if (unit.isDead || unit === excludeTarget) continue;
      if (unit.type !== 1) continue; // 1 = UnitType.enemy
      if (unit.id === owner.id) continue;
      const distance = Math.hypot(
        unit.position.x - centerPosition.x,
        unit.position.y - centerPosition.y,
      );

      if (distance <= radius) {
        targets.push(unit);
      }
    }

    return targets;
  }
}
