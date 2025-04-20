import { AccountORM, CharacterORM } from "src/System/ORM"

export class UserData {
    account: AccountORM;
    characters: CharacterORM[];

}

export class DataCenter {

    public static Users: Record<number, UserData> = {}
}