import { Socket } from "socket.io";
import { CharacterORM } from "src/ORM/charater.entity";
import { PlayerGameState } from "src/Shared/Enum";
import { KillInfo } from "./Combat/CombatInterface";

/**
 * 玩家遊戲中使用的資料結構
 */
export class GamePlayer {

    //擊殺清單
    public killList: KillInfo[];
    public id: string;
    public roomId: string;
    public state: PlayerGameState;
    public char: CharacterORM;
    public userName: string;
    public socket: Socket | null;

    constructor(char: CharacterORM, userName: string) {
        this.char = char;
        this.roomId = "";
        this.state = PlayerGameState.IDLE;
        this.killList = [];
        this.userName = userName;
    }



    public ToJson() {
        return {
            id: this.id,
            roomId: this.roomId,
            state: this.state
        }
    }
}