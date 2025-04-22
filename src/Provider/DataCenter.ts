import { AccountORM } from "src/ORM/account.entity";
import { CharacterORM } from "src/ORM/charater.entity"
import { BattleRoom } from "../Game/BattleRoom";
import { Player } from "../Game/Player";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";

export class UserData {
    account: AccountORM;

    character: CharacterORM | null = null;
    ws: WebSocket;
    player: Player | null = null;
}
@Injectable()
export class DataCenter {

    public static Users: Record<number, UserData> = {}
    public static BattleRooms: Record<string, BattleRoom> = {};

    @InjectRepository(AccountORM)
    private static usersRepo: Repository<AccountORM>

    public static async GetUser(userId: number): Promise<UserData | null> {

        if (DataCenter.Users[userId] != undefined) return DataCenter.Users[userId]
        const user = await DataCenter.usersRepo.findOne({ where: { id: userId } });
        if (user != null) {
            let u = new UserData();
            u.account = user;
            u.character = null;
            DataCenter.Users[userId] = u;
            return u;
        } else {
            return null;
        }
    }
}