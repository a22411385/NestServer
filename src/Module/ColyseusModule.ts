import { Module } from '@nestjs/common';
import { GameController } from '../Controller/game.controller';
import { ColyseusService } from '../Service/colyseus.service';

@Module({
    controllers: [GameController],
    providers: [ColyseusService],
    exports: [ColyseusService],
})
export class ColyseusModule { }
