import { Unit } from "./Basic";

export class Monster extends Unit {
    InitHp(): void {
        this.Hp = 20;
        this.Atk = 5;
    }


    constructor(id: number) {

        super()
        //先暫時

    }

}