import { EventEmitter2 } from "@nestjs/event-emitter";
import { BasicUnit } from "./Combat/UnitBasic";
import { AABB, Hero, Monster } from "./UnitSetting";
import { BattleEvent, BattleEventType } from "src/Shared/Enum";
import { FrameInput } from "src/Service/game.service";
import { Snapshot } from "src/Shared/struct";
import { toInt } from "src/Shared/BattleMathUtils";
import { TimeScheduler } from "src/Util/Utils";
const MAX_UNIT_COUNT: number = 200;


export enum SurviveGameEvent {


    Attack = 'survive.attack',
    MonsterSpawn = 'survive.MonsterSpawn',
}
//生存遊戲初始化
export class SurviveGame {
    private monsterCount: number = 0;
    private monsterMap: Map<string, Monster> = new Map();
    private lastUpdateTime: number = 0;
    private updateInterval: NodeJS.Timeout | null = null;

    //private PlayerTeam: Hero[] = [];
    // private Enemys: Monster[] = [];

    private scheduler = new TimeScheduler();
    constructor(private eventEmitter: EventEmitter2) {
        this.scheduler.addTask('createMonster', 1000, () => {

            this.createMonster();
        });

        this.scheduler.addTask('syncUnitPosition', 10000, () => {
            this.同步所有單位座標();
        });
    }
    同步所有單位座標() {

        let posData = [...this.monsterMap.values()].map(z => ({
            id: z.UniqueID,
            x: z.x,
            y: z.y
        }));
        this.發送戰鬥事件(BattleEventType.同步位置, posData);
    }
    檢查所有單位目標() {

    }
    攻擊目標(unit: BasicUnit, target: BasicUnit) {
    }
    擊殺目標(unit: BasicUnit, target: BasicUnit) {
    }

    public 自動尋敵(unit: BasicUnit) {
        // let target: BasicUnit | undefined;
        // if (unit.team != "player") {
        //     target = this.PlayerTeam.find((item) => !item.isDead);
        // } else {
        //     target = this.Enemys.find((item) => !item.isDead);
        // }
        // if (target) {
        //     console.log(`[${unit.Name}] 重新鎖定目標: [${target.Name}]`)
        //     unit.setTarget(target);
        // }
    }
    快照同步(frame: number): Snapshot | null {
        //待製作
        return null;
    }


    async 戰鬥開始() {
        console.log('戰鬥開始');
        // for (var i in this.PlayerTeam) {
        //     let fisrtEenmy = this.Enemys.find((item) => !item.isDead);
        //     if (fisrtEenmy)
        //         this.PlayerTeam[i].setTarget(fisrtEenmy);
        // }
        this.lastUpdateTime = Date.now();
        this.updateInterval = setInterval(this.Update.bind(this), 100);
        this.createMonster();

    }

    public Update() {
        const now = Date.now();
        this.scheduler.update(now);

        this.allUnitMove(now);
    }

    private allUnitMove(currentTime: number) {

        this.monsterMap.forEach((monster, id) => {
            const decision = monster.AI.update(currentTime, monster.Pos);

            if (monster.AI.isNewState) {

                monster.AI.isNewState = false;

                this.發送戰鬥事件(BattleEventType.UnitMove, {
                    id: id,
                    cmd: decision
                })
            }

            if (decision.state === 'Wander' && decision.targetPos) {
                let pos = monster.move(decision.targetPos);
                // console.log(`移動 (${pos.x},${pos.y})|位移量: (${decision.targetPos.x},${decision.targetPos.y})`)
            }

        });
    }
    createMonster() {
        if (this.monsterMap.size >= MAX_UNIT_COUNT) {
            this.GameOver();
            return;
        }

        let pos: { x: number, y: number };
        pos = this.spawnMonsterOutsideRadius();


        let m = new Monster(1, {
            HP: 100,
            MP: 0,
            ATK: 10,
            ASpeed: 1,
            ID: this.monsterCount.toString(),
            Name: "Zombie",

        }, this.eventEmitter);
        m.x = toInt(pos.x);
        m.y = toInt(pos.y);

        this.monsterMap.set(m.UniqueID, m);
        console.log("創建敵人:", m.Name);
        this.發送戰鬥事件(BattleEventType.MonsterSpawn, m.toJSON());
    }


    /**
     * 檢查位置是否被佔用
     * @param x 中心點x
     * @param y 中心點y
     * @param w 寬度
     * @param h 高度
     * @param units 當前單位列表
     */
    isPositionOccupied(x: number, y: number, w: number, h: number, units: BasicUnit[]): boolean {
        const newBox = new AABB(x, y, w, h);
        for (const unit of units) {
            const box = unit.getBounds();
            if (newBox.isCollide(box)) return true;
        }
        return false;
    }

    /**
     * 在指定半徑外隨機生成一個怪物位置
     * @param minRadius 最小半徑
     * @param maxRadius 最大半徑
     * @returns { x: number; y: number } 隨機位置
     */
    spawnMonsterOutsideRadius(minRadius = 300, maxRadius = 500): { x: number; y: number } {
        // 隨機角度（弧度制）
        const angle = Math.random() * Math.PI * 2;

        // 隨機距離（minRadius ~ maxRadius）
        const radius = minRadius + Math.random() * (maxRadius - minRadius);

        // 轉換成平面座標
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return { x, y };
    }

    /**
     * 往上拋給GameService
     * @param event 
     * @param data 
     */
    發送戰鬥事件(event: BattleEventType, data: any) {
        let e: BattleEvent = {
            payload: data,
            type: event,
        }
        this.eventEmitter.emit('battleEvent', e);
    }


    GameOver() {
        this.clearTimer();
        this.eventEmitter.emit('battleClose');
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