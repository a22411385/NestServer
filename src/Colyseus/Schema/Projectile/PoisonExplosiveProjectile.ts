import { ExplosiveProjectile } from './ExplosiveProjectile';
import { ServerBullet } from '../Bullet';
import { ServerGameUnit } from '../Unit/GameUnit';
import { AttackResult, VisualEffect } from '@/Types';
import { GameRoom } from '@/Colyseus/Rooms/GameRoom';

/**
 * ☠️ 毒屬性爆炸投射物
 * 使用單例模式
 */
export class PoisonExplosiveProjectile extends ExplosiveProjectile {
    private static poisonInstance: PoisonExplosiveProjectile;

    /**
     * 私有構造函數 - 防止外部直接創建
     */
    private constructor() {
        super();
    }

    /**
     * 獲取單例實例
     */
    public static getInstance(): PoisonExplosiveProjectile {
        if (!PoisonExplosiveProjectile.poisonInstance) {
            PoisonExplosiveProjectile.poisonInstance = new PoisonExplosiveProjectile();
        }
        return PoisonExplosiveProjectile.poisonInstance;
    }

    /**
     * ✅ 處理命中：爆炸傷害 + 中毒效果
     * 
     * 🔧 重要：
     * - bullet.statusEffects 應包含中毒效果配置（由武器提供）
     * - ExplosiveProjectile.onHit() 會調用 combatSystem.applyDamage()
     * - CombatSystem 會自動從 bullet.statusEffects 應用狀態效果
     * 
     * 📝 正確的數據流：
     * 1. 武器配置：weapon.properties = [{ type: 'poison', value: [5, 8] }]
     * 2. 武器創建 bullet：bullet.statusEffects = [{ type: 'poison', duration: 5000, value: 8 }]
     * 3. 投射物命中：onHit() → 爆炸傷害所有範圍內目標
     * 4. CombatSystem：applyDamage() → 自動應用 bullet.statusEffects
     */
    public onHit(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom,
    ): AttackResult {
        // ✅ 直接使用父類的爆炸邏輯
        // ExplosiveProjectile.onHit() 會：
        // 1. 找出範圍內所有目標
        // 2. 對每個目標調用 combatSystem.applyDamage(damage, target, bullet)
        // 3. CombatSystem 會自動從 bullet.statusEffects 應用中毒效果
        const result = super.onHit(bullet, hitTarget, gameRoom);

        // ❌ 不再需要手動應用中毒效果
        // ✅ StatusEffectSystem 會自動處理 bullet.statusEffects

        return result;
    }

    /**
     * 覆寫視覺效果，添加毒屬性特效（綠色毒霧爆炸）
     *
     * 📡 廣播事件：explosion_effect
     * 客戶端可根據顏色判斷是毒屬性爆炸
     */
    protected createVisualEffects(
        bullet: ServerBullet,
        affectedTargets: ServerGameUnit[],
    ): VisualEffect[] {
        const currentPos = bullet.getCurrentPosition();

        const poisonExplosionEffect: VisualEffect = {
            type: 'explosion',
            position: { x: currentPos.x, y: currentPos.y },
            direction: { x: bullet.direction.x, y: bullet.direction.y },
            data: {
                radius: bullet.areaOfEffect,
                colors: [0x00ff00, 0x88ff00, 0xaaff00], // 綠色毒霧
                duration: 600,
                hasShockwave: true,
            },
        };

        return [poisonExplosionEffect];
    }
}
