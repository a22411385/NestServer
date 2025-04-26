import { CharacterORM } from "src/ORM/charater.entity";

/**
 * 玩家遊戲中使用的資料結構
 */
export class GamePlayer {

    public id: string;
    public roomId: string;
    public state: 'idle' | 'fighting' | 'dead';
    public char: CharacterORM;

    constructor(char: CharacterORM) {
        this.char = char;
        this.roomId = "";
        this.state = "idle";

    }


    public ToJson() {
        return {
            id: this.id,
            roomId: this.roomId,
            state: this.state
        }
    }
}