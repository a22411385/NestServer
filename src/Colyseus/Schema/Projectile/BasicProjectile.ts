import { ProjectileBasic } from './ProjectileBasic';
import { ServerGameUnit } from '../Unit/GameUnit';
import { ServerBullet } from '../Bullet';
import { GameRoom } from '../../Rooms/GameRoom';
import { VisualEffect } from '@/Types';

/**
 * 基礎投射物 - 單體攻擊，命中後消失
 * 使用單例模式
 *
 * 📝 基礎投射物不產生額外的視覺效果
 * 渲染由客戶端 ClientBasicProjectile 處理
 */
export class BasicProjectile extends ProjectileBasic {
  private static instance: BasicProjectile;

  public static getInstance(): BasicProjectile {
    if (!BasicProjectile.instance) {
      BasicProjectile.instance = new BasicProjectile();
    }
    return BasicProjectile.instance;
  }

  private constructor() {
    super();
  }

  protected createVisualEffects(
    bullet: ServerBullet,
    affectedTargets: ServerGameUnit[],
  ): VisualEffect[] {
    // 基礎投射物不需要廣播額外的視覺效果
    return [];
  }
  protected applyProjectileConfig(): void {
    this.initialPierceCount = 1;
    this.areaOfEffect = 0;
    this.bounceCount = 0;
  }

  // onHit 使用基類的虛擬實現，無需覆寫

  protected findAffectedTargets(
    bullet: ServerBullet,
    hitTarget: ServerGameUnit,
    gameRoom: GameRoom,
  ): ServerGameUnit[] {
    // 基礎投射物只影響直接命中的目標
    return [hitTarget];
  }
}
