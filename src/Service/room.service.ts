import { Injectable, Module } from '@nestjs/common';
import { GameSerivce as GameService } from './game.service';
import { ErrorCode } from 'src/Shared/ErrorCode';
import { GamePlayer } from 'src/Game/GamePlayer';
import { OnEvent } from '@nestjs/event-emitter';
import { ModuleRef } from '@nestjs/core';
@Injectable()
export class RoomService {
    constructor(private moduleRef: ModuleRef) {

    }
    private roomMap = new Map<string, GameService>();
    async createRoom(roomName: string, areaID: number): Promise<ErrorCode | string> {

        const r = await this.moduleRef.resolve(GameService);
        this.roomMap.set(r.UniqueID, r);
        return r.UniqueID;
    }

    JoinRoom(roomId: string, player: GamePlayer): ErrorCode {
        let room = this.roomMap.get(roomId);
        if (room == undefined) {
            return ErrorCode.房間不存在;
        } else {

            room.JoinPlayer(player);
            return ErrorCode.SUCCESS
        }
    }
    @OnEvent('room.close')
    roomClose(param: { roomId: string }) {
        this.roomMap.delete(param.roomId);

    }
    // removePlayerFromRoom(socket: Socket) {
    //     const { roomId, playerId } = socket.data;
    //     if (this.roomMap.has(roomId)) {
    //         this.roomMap.get(roomId)?.RemovePlayer(playerId);
    //     }
    // }

    // getPlayersInRoom(roomId: string): number[] {
    //     let r = this.roomMap.get(roomId);
    //     return r ? r.GetPlayersId() : [];
    // }
}