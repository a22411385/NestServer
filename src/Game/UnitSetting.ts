import { EventEmitter2 } from "@nestjs/event-emitter";
import { 傷害類型 } from "../Shared/Enum";
import { BasicUnit } from "./Combat/UnitBasic";
import { MonsterData, ProfessionData } from "./Combat/UnitData";

export class Monster extends BasicUnit {

    constructor(Lv: number, data: MonsterData, eventEmitter: EventEmitter2) {

        super({
            Lv: Lv,
            Mp: data.MP,
            Hp: data.HP,
            Atk: data.ATK,
            AtkSpeed: data.ASpeed,
            Name: data.Name,
            id: data.ID,
            Def: 0
        }, eventEmitter);
        this._playerId = 'npc';


    }

}

//英雄單位/玩家單位有主要屬性
export class Hero extends BasicUnit {

    public userName: string;
    //基礎屬性
    protected Str: number;
    protected Agi: number;
    protected Vit: number;
    protected Int: number;

    constructor(Lv: number, playerId: string, data: ProfessionData, eventEmitter: EventEmitter2) {

        super({
            Lv: Lv,
            Mp: data.MP,
            Hp: data.HP,
            Atk: data.ATK,
            AtkSpeed: data.ASpeed,
            Name: data.Name,
            id: data.ID,
            Def: 0
        }, eventEmitter);
        this._playerId = playerId;

    }
    public toJSON() {
        let json = super.toJSON() as any;
        json['userName'] = this.userName;
        return json;
    }


}

export class AABB {
    constructor(
        public x: number, // 中心 x
        public y: number, // 中心 y
        public width: number,
        public height: number
    ) { }

    isCollide(other: AABB): boolean {
        return (
            Math.abs(this.x - other.x) * 2 < this.width + other.width &&
            Math.abs(this.y - other.y) * 2 < this.height + other.height
        );
    }
}