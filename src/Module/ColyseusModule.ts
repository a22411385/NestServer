import { Module } from '@nestjs/common';
import { ColyseusService } from '../Service/colyseus.service';

@Module({
    providers: [ColyseusService],
    exports: [ColyseusService],
})
export class ColyseusModule { }
