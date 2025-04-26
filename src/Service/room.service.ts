import { Injectable, Module } from '@nestjs/common';
import { BattleRoom } from '../Game/BattleRoom';
import { ErrorCode } from 'src/Shared/ErrorCode';
import { GamePlayer } from 'src/Game/Player';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class RoomService {

    private roomMap = new Map<string, BattleRoom>();
    async createRoom(roomName: string, areaID: number): Promise<ErrorCode | string> {

        let r = new BattleRoom(roomName, areaID);
        if (this.roomMap.has(r.UniqueID)) {
            return ErrorCode.名稱已被使用;
        }

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