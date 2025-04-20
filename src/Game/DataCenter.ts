import { AccountORM } from "src/System/Account.entity";
import { CharacterORM } from "src/System/Characte.entity"

export class UserData {
    account: AccountORM;
    characters: CharacterORM[];

}

export class DataCenter {

    public static Users: Record<number, UserData> = {}
}