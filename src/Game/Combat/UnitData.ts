export class ExperienceData {

    Lv: number;
    Exp: number;
    TotalExp: number;
}

abstract class UnitBasicData {
    public ID: string;
    public Name: string;
    public HP: number;
    public ATK: number;
    public MP: number;
    public ASpeed: number;

}

export class MonsterData extends UnitBasicData {

}



export class ProfessionData extends UnitBasicData {


}

function AutoExport(): (target: typeof MonsterData) => void | typeof MonsterData {
    throw new Error("Function not implemented.");
}
