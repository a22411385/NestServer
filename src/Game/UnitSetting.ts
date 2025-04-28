import { 傷害類型 } from "../Shared/Enum";
import { BasicUnit } from "./Combat/UnitBasic";
import { MonsterData, ProfessionData } from "./Combat/UnitData";

export class Monster extends BasicUnit {

    constructor(data: MonsterData) {

        super({
            Mp: data.Mp,
            Hp: data.HP,
            Atk: data.ATK,
            AtkSpeed: data.ASpeed,
            Name: data.Name,
            id: data.ID,
            Def: 0
        });
        //先暫時

    }

}

//英雄單位/玩家單位有主要屬性
export class Hero extends BasicUnit {

    //基礎屬性
    protected Str: number;
    protected Agi: number;
    protected Vit: number;
    protected Int: number;
    protected Lv: number;
    constructor(data: ProfessionData) {

        super({
            Mp: data.Mp,
            Hp: data.HP,
            Atk: data.ATK,
            AtkSpeed: data.ASpeed,
            Name: data.Name,
            id: data.ID,
            Def: 0
        });
        //先暫時

    }

}