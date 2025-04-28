import { Injectable } from "@nestjs/common";
import { HttpSelfService } from "./http-self.service";
import { HttpRespone } from "src/Shared/struct";
import { SocketService } from "./test-SocketService";
import { MessageID } from "src/Shared/MessageID";

// test-simulator.service.ts
@Injectable()
export class TestSimulatorService {
    private ws: SocketService;
    private token: string = "";
    constructor(
        private httpService: HttpSelfService
    ) { }

    async run() {

        console.log('🚀 TestSimulatorService: App啟動完成，開始模擬流程...');
        try {
            const user = await this.httpService.post('/login', { account: "ss0054505", password: "00000000" }) as HttpRespone;

            let { access_token } = user.content as { access_token: string };
            console.log('/login', user);
            this.token = access_token;
            const headers = { Authorization: `Bearer ${this.token}` };

            const rolelist = await this.httpService.get('/char/get', headers) as HttpRespone;
            console.log('/char/get', rolelist);
            let list = rolelist.content as { id: number, name: string, lv: number }[];

            const selectRole = await this.httpService.post('/char/select', { id: list[0].id }, headers) as HttpRespone;
            console.log('/char/select', selectRole);
            this.token = (selectRole.content as { access_token: string }).access_token;

            await this.startGameRoom();
        } catch (error) {
            console.error(error);
        }


        console.log('✅ TestSimulatorService: 模擬流程結束');
    }
    private async startGameRoom() {

        this.ws = new SocketService();
        await this.ws.init(`http://localhost:${process.env.PORT}?token=${this.token}`);
        //等待連線後繼續
        await this.ws.send(MessageID.STARTBATTLE, { id: 1 })
        await this.ws.send(MessageID.READYFORGAME, { id: 1 })
    }


    private delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

}