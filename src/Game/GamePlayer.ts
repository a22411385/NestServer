import { CharacterORM } from "src/ORM/charater.entity";

/**
 * 玩家遊戲中使用的資料結構
 */
export class GamePlayer {

    public id: string;
    public roomId: string;
    public state: 'idle' | 'fighting' | 'dead' | 'waiting' | 'ready';
    public char: CharacterORM;
    private expTable: number[] = [];


    constructor(char: CharacterORM) {
        this.char = char;
        this.roomId = "";
        this.state = "idle";
        //  this.expTable = expTable;

    }
    getLevel(exp: number): number {
        for (let i = this.expTable.length - 1; i >= 0; i--) {
            if (exp >= this.expTable[i]) {
                return i + 1;
            }
        }
        return 1;
    }


    public ToJson() {
        return {
            id: this.id,
            roomId: this.roomId,
            state: this.state
        }
    }
}