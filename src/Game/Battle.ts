import { UserData } from "./DataCenter";
import { Monster } from "./Monster";
import { Player } from "./Player";

//多人模式需要計時
const ROUNDTIME_SEC = 15;

export class BattleRoom {
    public uniqueID: string;
    private Round: number;
    private players: UserData[];
    private isSinglePlayer: boolean;

    private Emenys: Monster[];

    constructor(battleArea: string, players: UserData[]) {


        this.players = players;
        this.uniqueID = this.generateUniqueID();

        for (var i in players) {
            if (players[i].character == null) {

                throw 'some player data null';
            }
            players[i].player = new Player(players[i].character);
        }
        this.戰鬥開始();
    }

    戰鬥開始() {


    }

    private generateUniqueID(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

}