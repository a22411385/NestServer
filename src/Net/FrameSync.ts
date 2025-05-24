import EventEmitter from "events";

export interface FrameInput {
    frame: number;
    playerId: string;
    input: any;
}


export class FrameSync {
    private frame: number = 0;
    private inputs: FrameInput[] = [];
    private timer: NodeJS.Timeout | null = null;
    public event: EventEmitter = new EventEmitter();
    constructor() { }

    start() {
        this.timer = setInterval(() => this.update(), 100); // 每 100ms 一幀（10fps 可調整）
    }

    stop() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }

    receiveInput(input: FrameInput) {
        this.inputs.push(input);
    }

    update() {
        // 處理該幀所有輸入
        const currentInputs = this.inputs.filter(i => i.frame === this.frame);

        // 處理遊戲邏輯：整合到 GameService 或傳出 event
        // TODO: 實作邏輯
        this.event.emit('sync', currentInputs);
        // 廣播所有輸入與幀數
        // TODO: 廣播邏輯

        this.frame++;
    }
}