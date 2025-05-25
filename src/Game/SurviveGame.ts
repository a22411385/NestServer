import { EventEmitter2 } from "@nestjs/event-emitter";
import { BasicUnit } from "./Combat/UnitBasic";
import { Hero, Monster } from "./UnitSetting";
import { BattleEvent, BattleEventType } from "src/Shared/Enum";

export enum SurviveGameEvent {

    BattleEvent = 'battleEvent',
    Attack = 'survive.attack',
}
//生存遊戲初始化
export class SurviveGame {
    private monsterCount: number = 0;
    private monsterMap: Map<string, BasicUnit> = new Map();
    private lastUpdateTime: number;
    private updateInterval: NodeJS.Timeout | null = null;

    private PlayerTeam: Hero[] = [];
    private Enemys: Monster[] = [];

    constructor(private eventEmitter: EventEmitter2) {


        // this.event.on('')
        this.registerUnitEvents();

    }

    //註冊事件
    private registerUnitEvents() {
        // this.eventEmitter.on(
        //     UnitEvent.AutoSelect,
        //     (unit: BasicUnit) => this.自動尋敵(unit),
        // );
        // this.eventEmitter.on(
        //     UnitEvent.KillTarget,
        //     (unit: BasicUnit, target: BasicUnit) => this.擊殺目標(unit, target),
        // );
        // this.eventEmitter.on(UnitEvent.Battle, event => {
        //     this.eventEmitter.emit('game.battleEvent', { roomId: this._uniqueID, data: event });
        // });
    }
    檢查所有單位目標() {

    }
    攻擊目標(unit: BasicUnit, target: BasicUnit) {

        const attackEvt: BattleEvent<AttackPayload> = {
            type: BattleEventType.Attack,
            timestamp: Date.now(),
            payload: { attackerId: this.UniqueID, targetId: target.UniqueID, skillId: 'normal' }
        };
        //通知client
        this.發送戰鬥事件();
    }
    擊殺目標(unit: BasicUnit, target: BasicUnit) {

        let pp = this.Players.get(unit.PlayerId);
        //找到單位擁有玩家
        if (pp) {
            pp.killList.push({

                lv: target.Lv,
                type: target.type,
                uniqueID: target.UniqueID

            });

        }
    }

    public 自動尋敵(unit: BasicUnit) {
        let target: BasicUnit | undefined;
        if (unit.team != "player") {
            target = this.PlayerTeam.find((item) => !item.isDead);
        } else {
            target = this.Enemys.find((item) => !item.isDead);
        }
        if (target) {
            console.log(`[${unit.Name}] 重新鎖定目標: [${target.Name}]`)
            unit.setTarget(target);
        }
    }



    async 戰鬥開始() {

        for (var i in this.PlayerTeam) {
            let fisrtEenmy = this.Enemys.find((item) => !item.isDead);
            if (fisrtEenmy)
                this.PlayerTeam[i].setTarget(fisrtEenmy);
        }

        this.updateInterval = setInterval(this.Update.bind(this), 100);

    }

    public Update() {
        const now = Date.now();
        if (now - (this.lastUpdateTime || 0) < 1000 / 60) {
            this.lastUpdateTime = now;

        }

        this.AllUnitMove();
    }

    AllUnitMove() {

        this.monsterMap.forEach((monster, id) => {

        });
    }
    createMonster() {
        const pos = this.spawnMonsterOutsideRadius();
        let m = new Monster(1, {
            HP: 100,
            MP: 0,
            ATK: 10,
            ASpeed: 1,
            ID: this.monsterCount.toString(),
            Name: "Zombie",

        }, this.eventEmitter);
        m.x = pos.x;
        m.y = pos.y;

        this.monsterMap.set(m.UniqueID, m);

    }
    spawnMonsterOutsideRadius(minRadius = 10, maxRadius = 50): { x: number; y: number } {
        // 隨機角度（弧度制）
        const angle = Math.random() * Math.PI * 2;

        // 隨機距離（minRadius ~ maxRadius）
        const radius = minRadius + Math.random() * (maxRadius - minRadius);

        // 轉換成平面座標
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return { x, y };
    }
    發送戰鬥事件() {


    }

    Destroy() {

        this.clearTimer();
    }
    private clearTimer() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

}