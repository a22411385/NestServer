import { Schema, type } from "@colyseus/schema";
import { Vector2 } from "../Unit/GameUnit";

// --- 物品基底  ---
export abstract class ServerItem extends Schema {

    @type("string") id: string = "";
    @type("string") name: string = "";

    @type(Vector2) position: Vector2 = new Vector2(0, 0);
    //  @type("number") y: number = 0;
    @type("string") itemType: string = "exp"; // exp, heal, buff ...
    @type("number") itemValue: number = 1;
    constructor() {
        super()
    }
}

