import { 傷害類型 } from "../Shared/Enum";
import { CombatComponent } from "./Combat/CombatComponent";

export abstract class Unit extends CombatComponent {

    //動態使用
    protected Hp: number;
    protected MaxHp: number;

    protected Mp: number;
    protected MaxMp: number;

    protected Atk: number;
    protected Def: number;

    abstract Init(): void;

    constructor(id: string) {
        super({ id: id, hp: 50, maxHp: 50, attackInterval: 1, lastAttackTime: 0, isDead: false });
        this.Init();
    }
    AtkValue() {

        return this.Atk;
    }

    TakeDamge(vaule: number, type: 傷害類型): number {
        let v = vaule;

        switch (type) {
            case 傷害類型.物理:
                v -= this.Def;
                break;

        }

        this.Hp -= v;

        return v;
    }


}

//英雄單位/玩家單位有主要屬性
export class Hero extends Unit {



    //基礎屬性
    protected Str: number;
    protected Agi: number;
    protected Vit: number;
    protected Int: number;
    protected Lv: number;

    constructor(id: number) {
        super(id.toString());
    }

    override Init(): void {

        //先暫時設定
        this.Hp = this.MaxMp = 50;
        this.Atk = 5;
    }
}