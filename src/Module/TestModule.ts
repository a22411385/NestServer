
import { HttpModule, HttpService } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { HttpSelfService } from "src/Test/http-self.service";
import { TestSimulatorService } from "src/Test/test-simulator.service";
@Module({
    imports: [
        HttpModule
    ],
    controllers: [],
    providers: [TestSimulatorService, HttpSelfService
    ],
    exports: [TestSimulatorService], // 給別人用就 export
})
export class TestModule { }