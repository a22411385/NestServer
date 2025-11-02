import { ServerGameUnit } from '../Unit/GameUnit';
import { AttackResult, AttackFailReason } from '../../../Types';
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
    const owner = gameRoom.state.allUnits.get(bullet.ownerId);
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
    const finalDamage = this.calculateDamage(bullet, hitTarget, gameRoom);

    // 4. 減少子彈的穿透次數
    bullet.pierceCount--;

    // 5. 構建攻擊結果
    return this.buildAttackResult(bullet, affectedTargets, finalDamage);
  }

  /**
   * 🆕 計算最終傷害（統一通過 DamageSystem）
   * 子類可以覆寫 getDamageMultiplier() 來修改傷害倍率
   * 
   * ✅ 自動套用：
   * - Hero 的 attackDamage（力量加成）
   * - 元素傷害加成（火焰精通 +15%）
   * - 天賦效果（所有傷害 +20%）
   * - 目標防禦減免
   * - 暴擊計算
   */
  protected calculateDamage(
    bullet: ServerBullet,
    hitTarget: ServerGameUnit,
    gameRoom: GameRoom,
  ): number {
    const attacker = this.getAttacker(bullet.ownerId, gameRoom);

    if (!attacker) {
      console.warn(`⚠️ 找不到攻擊者: ${bullet.ownerId}，使用基礎傷害`);
      return Math.floor(bullet.damage * this.getDamageMultiplier());
    }

    // 🆕 Phase 3: 直接使用 bullet 攜帶的標籤信息（不再回查武器）
    const damageInfo = {
      attacker,
      target: hitTarget,
      baseDamage: bullet.damage * this.getDamageMultiplier(), // 套用投射物倍率
      elementTags: bullet.elementTags.length > 0 ? bullet.elementTags : ['physical'], // 使用攜帶的元素標籤
      weaponModifiers: bullet.modifiers, // 使用攜帶的武器詞綴
      damageType: 'physical' as const,
      source: bullet.weaponId
    };

    // ✅ 自動套用所有加成（hero.attackDamage + 元素加成 + 天賦 + 防禦減免）
    return gameRoom.damageSystem.calculateFinalDamage(damageInfo);
  }

  /**
   * 🆕 獲取傷害倍率（子類可覆寫）
   * @example
   * ExplosiveProjectile: return 0.8; // 爆炸傷害降低 20%
   * PiercingProjectile: return 1.0;  // 穿透傷害不變
   */
  protected getDamageMultiplier(): number {
    return 1.0; // 預設不修改
  }

  /**
   * 🆕 找到攻擊者
   */
  private getAttacker(ownerId: string, gameRoom: GameRoom): ServerGameUnit | null {
    return gameRoom.state.allUnits.get(ownerId) || null;
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
        direction: { x: bullet.directionX, y: bullet.directionY },
        range: bullet.areaOfEffect,
      },
      // ✅ 傳遞狀態效果配置（燃燒、中毒等）
      statusEffects: bullet.statusEffects.filter(se => se.category != 'attribute'),
    };
  }

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
    let checkedCount = 0;
    let enemyCount = 0;

    //console.log(`🔍 [findTargetsInRadius] 搜索範圍 - 中心: (${centerPosition.x}, ${centerPosition.y}), 半徑: ${radius}`);

    for (const [unitId, unit] of gameRoom.state.allUnits) {
      checkedCount++;

      // 詳細記錄每個單位的檢查過程
      if (unit.isDead) {
        console.log(`  ❌ 單位 ${unitId} - 已死亡`);
        continue;
      }
      if (unit === excludeTarget) {
        console.log(`  ❌ 單位 ${unitId} - 被排除的目標`);
        continue;
      }

      enemyCount++;

      if (unit.id === owner.id) {
        // console.log(`  ❌ 單位 ${unitId} - 是擁有者`);
        continue;
      }

      const distance = Math.hypot(
        unit.position.x - centerPosition.x,
        unit.position.y - centerPosition.y,
      );

      //console.log(`  🎯 敵人 ${unitId} at (${unit.position.x}, ${unit.position.y}) - 距離: ${distance.toFixed(2)} ${distance <= radius ? '✅ 在範圍內' : '❌ 超出範圍'}`);

      if (distance <= radius) {
        targets.push(unit);
      }
    }

    // console.log(`🔍 [findTargetsInRadius] 檢查完成 - 總單位: ${checkedCount}, 敵人: ${enemyCount}, 範圍內: ${targets.length}`);
    return targets;
  }
}
