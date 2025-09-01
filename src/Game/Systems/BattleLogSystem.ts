import { GameRoom } from "../../Colyseus/Rooms/GameRoom";
import { ServerHero } from "../../Colyseus/Schema/Unit/Hero";

/**
 * 戰報系統 - 負責處理戰鬥日誌和消息廣播
 */
export class BattleLogSystem {
    private gameRoom: GameRoom;

    constructor(gameRoom: GameRoom) {
        this.gameRoom = gameRoom;
    }

    /**
     * 處理攻擊戰報
     */
    public handleAttackBattleLog(hero: ServerHero, damageResults: any[]): void {
        if (damageResults.length === 0) return;

        const totalDamage = damageResults.reduce((sum, dr) => sum + dr.actualDamage, 0);
        const killedCount = damageResults.filter(dr => dr.targetKilled).length;

        // 傷害戰報
        if (damageResults.length === 1) {
            this.sendBattleLog(
                `${hero.name} 對敵人造成 ${totalDamage} 點傷害`,
                'damage'
            );
        } else {
            this.sendBattleLog(
                `${hero.name} 同時攻擊 ${damageResults.length} 個敵人，總共造成 ${totalDamage} 點傷害`,
                'damage'
            );
        }

        // 擊殺戰報
        if (killedCount > 0) {
            this.sendBattleLog(
                `${hero.name} 擊殺了 ${killedCount} 個敵人！`,
                'kill'
            );
        }
    }

    /**
     * 處理投射武器發射戰報
     */
    public handleProjectileLaunchLog(hero: ServerHero, weaponId: string): void {
        this.sendBattleLog(
            `${hero.name} 發射了 ${weaponId}`,
            'event'
        );
    }

    /**
     * 處理技能使用戰報
     */
    public handleSkillUsageLog(hero: ServerHero, skillName: string, targets: number = 0): void {
        if (targets > 0) {
            this.sendBattleLog(
                `${hero.name} 對 ${targets} 個目標使用了 ${skillName}`,
                'event'
            );
        } else {
            this.sendBattleLog(
                `${hero.name} 使用了 ${skillName}`,
                'event'
            );
        }
    }

    /**
     * 處理英雄升級戰報
     */
    public handleLevelUpLog(hero: ServerHero): void {
        this.sendBattleLog(
            `🎉 ${hero.name} 升級到 ${hero.level} 級！`,
            'event'
        );
    }

    /**
     * 處理物品獲得戰報
     */
    public handleItemObtainedLog(hero: ServerHero, itemName: string): void {
        this.sendBattleLog(
            `${hero.name} 獲得了 ${itemName}`,
            'event'
        );
    }

    /**
     * 處理武器裝備戰報
     */
    public handleWeaponEquipLog(hero: ServerHero, weaponName: string, action: 'equipped' | 'unequipped'): void {
        const actionText = action === 'equipped' ? '裝備了' : '卸下了';
        this.sendBattleLog(
            `${hero.name} ${actionText} ${weaponName}`,
            'event'
        );
    }

    /**
     * 處理英雄死亡戰報
     */
    public handleHeroDeathLog(hero: ServerHero): void {
        this.sendBattleLog(
            `💀 ${hero.name} 陣亡了！`,
            'death'
        );
    }

    /**
     * 處理波次完成戰報
     */
    public handleWaveCompleteLog(waveNumber: number, survivingHeroes: number): void {
        this.sendBattleLog(
            `🏆 第 ${waveNumber} 波完成！${survivingHeroes} 名英雄存活`,
            'event'
        );
    }

    /**
     * 發送戰報消息
     */
    private sendBattleLog(
        message: string,
        type: 'damage' | 'death' | 'kill' | 'heal' | 'event'
    ): void {
        // 使用 GameRoom 的公開方法或者直接廣播
        this.gameRoom.broadcast('battle_log', {
            message,
            type,
            timestamp: Date.now()
        });

        // 也可以輸出到服務器日誌
        console.log(`[戰報] ${message}`);
    }

    /**
     * 批量發送戰報
     */
    public sendBatchBattleLogs(logs: Array<{ message: string, type: string }>): void {
        const timestamp = Date.now();

        this.gameRoom.broadcast('battle_log_batch', {
            logs: logs.map(log => ({
                ...log,
                timestamp: timestamp + Math.random() // 稍微錯開時間避免重疊
            })),
            timestamp
        });
    }

    /**
     * 設置戰報過濾器（可以根據玩家設置過濾某些類型的戰報）
     */
    public setLogFilter(clientId: string, filter: {
        showDamage: boolean;
        showKills: boolean;
        showEvents: boolean;
        showDeaths: boolean;
    }): void {
        // 這裡可以實現個性化的戰報過濾
        // 存儲每個客戶端的過濾設置
    }
}
