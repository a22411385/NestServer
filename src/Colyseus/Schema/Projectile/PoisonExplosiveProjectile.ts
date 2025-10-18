import { ExplosiveProjectile } from './ExplosiveProjectile';
import { ServerBullet } from '../Bullet';
import { ServerGameUnit } from '../Unit/GameUnit';
import { AttackResult, VisualEffect } from '@/Types';
import { GameRoom } from '@/Colyseus/Rooms/GameRoom';

/**
 * 🆕 範例：毒屬性爆炸投射物
 * 使用單例模式
 *
 * 展示如何擴充現有的投射物類型：
 * 1. 繼承基礎投射物類別（ExplosiveProjectile）
 * 2. 覆寫特定方法添加新效果（毒屬性）
 * 3. 註冊到 ProjectileRegistry
 */
export class PoisonExplosiveProjectile extends ExplosiveProjectile {
    private static poisonInstance: PoisonExplosiveProjectile;

    private readonly poisonDuration: number = 5000; // 5秒中毒
    private readonly poisonDamagePerSecond: number = 5; // 每秒傷害

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
     * 私有構造函數 - 防止外部直接創建
     */
    private constructor() {
        super();
    }

    /**
     * 覆寫配置應用，添加毒屬性特定配置
     */
    protected applyProjectileConfig(): void {
        // 先應用父類的爆炸配置
        super.applyProjectileConfig();

        // 毒屬性特定配置（已在屬性定義中設定）
        console.log(
            `☠️ 毒屬性爆炸投射物配置: 持續 ${this.poisonDuration}ms, 每秒 ${this.poisonDamagePerSecond} 點傷害`,
        );
    }

    /**
     * 覆寫 onHit，在爆炸後應用中毒效果
     */
    public onHit(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom,
    ): AttackResult {
        // 先執行父類的爆炸邏輯
        const result = super.onHit(bullet, hitTarget, gameRoom);

        // 如果攻擊成功，對所有受影響的目標應用中毒效果
        if (result.success && result.targetIds) {
            result.targetIds.forEach((targetId) => {
                const target = gameRoom.state.gameCore.allUnits.get(targetId);
                if (target) {
                    this.applyPoisonEffect(target);
                }
            });
        }

        return result;
    }

    /**
     * 應用中毒效果
     */
    private applyPoisonEffect(target: ServerGameUnit): void {
        console.log(`☠️ ${target.name} 中毒，持續 ${this.poisonDuration}ms`);

        // TODO: 整合到狀態效果系統
        // 暫時實現：每秒造成傷害
        const damageInterval = 1000; // 每秒觸發一次
        const totalTicks = Math.floor(this.poisonDuration / damageInterval);

        let currentTick = 0;
        const poisonTimer = setInterval(() => {
            currentTick++;

            if (target.isDead || currentTick > totalTicks) {
                clearInterval(poisonTimer);
                console.log(`☠️ ${target.name} 中毒效果結束`);
                return;
            }

            // 造成中毒傷害
            target.hp = Math.max(0, target.hp - this.poisonDamagePerSecond);
            console.log(
                `☠️ ${target.name} 受到中毒傷害 ${this.poisonDamagePerSecond} (剩餘 ${target.hp} HP)`,
            );

            if (target.hp <= 0) {
                target.isDead = true;
                clearInterval(poisonTimer);
            }
        }, damageInterval);
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
                radius: this.areaOfEffect,
                colors: [0x00ff00, 0x88ff00, 0xaaff00], // 綠色毒霧
                duration: 600,
                hasShockwave: true,
            },
        };

        return [poisonExplosionEffect];
    }
}
