import { Unit } from "./Basic";

export class Monster extends Unit {
    Init(): void {
        this.Hp = 20;
        this.Atk = 5;
    }


    constructor(id: number) {

        super(id.toString());
        //先暫時

    }

}