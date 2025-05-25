
//生存遊戲初始化
export class SurviveGame {

    private monsterMap: Map<number, any> = new Map();
    private lastUpdateTime: number;
    constructor() { }


    public Update() {
        const now = Date.now();
        if (now - (this.lastUpdateTime || 0) < 1000 / 60) {
            this.lastUpdateTime = now;

        }

        this.AllUnitMove();
    }

    AllUnitMove() {


    }
}