import { AccountORM } from "src/System/Account.entity";
import { CharacterORM } from "src/System/Characte.entity"
import { BattleRoom } from "./Battle";
import { Player } from "./Player";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

export class UserData {
    account: AccountORM;

    character: CharacterORM | null = null;
    ws: WebSocket;
    player: Player | null = null;
}

export class DataCenter {

    public static Users: Record<number, UserData> = {}
    public static BattleRooms: Record<string, BattleRoom> = {};

    @InjectRepository(AccountORM)
    private static usersRepo: Repository<AccountORM>

    public static async GetUser(userId: number): Promise<UserData> {

        if (DataCenter.Users[userId] != undefined) return DataCenter.Users[userId]
        const user = await DataCenter.usersRepo.findOne({ where: { id: userId } });
        if (user != null) {
            let u = new UserData();
            u.account = user;
            u.character = null;
            DataCenter.Users[userId] = u;
            return u;
        } else {
            return new UserData();
        }
    }
}