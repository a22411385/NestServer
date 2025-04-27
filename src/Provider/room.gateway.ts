// game.gateway.ts
import {
    WebSocketGateway,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
    WebSocketServer,
} from '@nestjs/websockets';


import { Server, Socket } from 'socket.io';
import { RoomService } from '../Service/room.service';

import { OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessageID } from 'src/Shared/MessageID';
import { HttpRespone } from 'src/Shared/struct';
import { JWTPayload } from 'src/struct';

import { CharacterService } from 'src/Service/charater.serivce';
import { GamePlayer } from 'src/Game/GamePlayer';
import { ErrorCode } from 'src/Shared/ErrorCode';
import { GoogleSheetsService } from 'src/Service/google-sheets.service';
import { PROFESSION } from 'src/Data/PROFESSION';
import { MonsterData } from 'src/Data/Monster';


@WebSocketGateway({ cors: true })
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {

    @WebSocketServer()
    server: Server;

    players = new Map<string, GamePlayer>()

    async onModuleInit() {
        console.log('✅ GameGateway 已啟動');
        await this.googleSheetService.InitData([
            { tableName: "Profession", classType: PROFESSION },
            { tableName: "Monster", classType: MonsterData }


        ]);



    }
    constructor(
        private readonly roomService: RoomService,
        private readonly jwtService: JwtService,
        private readonly charService: CharacterService,
        private readonly googleSheetService: GoogleSheetsService

    ) {


    }

    async handleConnection(client: Socket) {

        //開始驗證
        try {
            const rawToken =
                client.handshake.query.token as string;

            if (!rawToken) {
                throw new Error('No token found');
            }
            const payload = this.jwtService.verify(rawToken, { secret: process.env.JWT_KEY }) as JWTPayload;

            if (!payload.playerId) {
                console.error('❌ Token 驗證失敗: 沒有角色');
                client.disconnect();
                return;
            }
            let player = this.players.get(payload.openId);
            //先找看看他暫存有沒有
            if (player == undefined) {

                let ch = await this.charService.getCharacterById(payload.playerId);
                if (!ch) {
                    console.error('❌ 沒有角色');
                    client.disconnect();
                    return;
                }
                player = new GamePlayer(ch);
                this.players.set(payload.openId, player);
            }

            client.data.user = payload;
            client.emit('init', player.ToJson());
            console.log(`Client connected: ${client.id}`);

        } catch (err) {
            console.warn('❌ Token 驗證失敗:', err.message);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
        //玩家離線並不會中斷戰鬥
        //this.roomService.removePlayerFromRoom(client);
    }
    // @SubscribeMessage('joinRoom')
    // handleJoinRoom(
    //     @MessageBody() data: { roomId: string; playerId: number },
    //     @ConnectedSocket() client: Socket,
    // ) {

    //     this.roomService.addPlayerToRoom(data.roomId, data.playerId, client);
    //     client.join(data.roomId);
    //     this.socketRoomMap.set(client.id, data.roomId);
    //     client.to(data.roomId).emit('playerJoined', { playerId: data.playerId });
    // }

    // //玩家離開
    // @SubscribeMessage('leaveRoom')
    // handleLeaveRoom(
    //     @MessageBody() data: { roomId: string; playerId: string },
    //     @ConnectedSocket() client: Socket,
    // ) {
    //     client.leave(data.roomId);
    //     this.roomService.removePlayerFromRoom(client);
    //     client.to(data.roomId).emit('playerLeft', { playerId: data.playerId });
    // }


    //開始戰鬥
    /**
     * 需要檢查玩家是否已經有一個正在的戰鬥
     * 如果沒有幫建立
     * 
     * @param data 
     * @param client 
     * @returns 回傳房間ID
     */
    @SubscribeMessage(MessageID.STARTBATTLE)
    async startBattle(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ) {
        let payload = client.data.user as JWTPayload;
        console.log('開始戰鬥', data);

        let player = this.players.get(payload.openId);
        if (player?.roomId != '') {
            return {
                errorCode: ErrorCode.正在戰鬥中
            }
        }

        let res = await this.roomService.createRoom('single', -1);
        if (typeof res != 'string') {
            return {
                errorCode: res
            }
        }
        this.roomService.JoinRoom(res, player);

        player.roomId = res;
        return {
            errorCode: ErrorCode.SUCCESS,
            content: res
        } as HttpRespone;

    }


}