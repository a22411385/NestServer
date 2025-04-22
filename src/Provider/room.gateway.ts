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
import * as jwt from 'jsonwebtoken';
import { OnModuleInit } from '@nestjs/common';

@WebSocketGateway({ cors: true })
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {

    @WebSocketServer()
    server: Server;

    socketRoomMap = new Map<string, string>();
    onModuleInit() {
        console.log('✅ GameGateway 已啟動');
    }
    constructor(
        private readonly roomService: RoomService,
        //  private readonly gameService: GameService,
    ) { }

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
        //開始驗證
        const token = client.handshake.query.token as string;
        const payload = jwt.verify(token, process.env.JWT_KEY ? process.env.JWT_KEY : "");
        client.data.user = payload;
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
        this.roomService.removePlayerFromRoom(client);
    }

    @SubscribeMessage('joinRoom')
    handleJoinRoom(
        @MessageBody() data: { roomId: string; playerId: number },
        @ConnectedSocket() client: Socket,
    ) {

        this.roomService.addPlayerToRoom(data.roomId, data.playerId, client);
        client.join(data.roomId);
        this.socketRoomMap.set(client.id, data.roomId);
        client.to(data.roomId).emit('playerJoined', { playerId: data.playerId });
    }

    //玩家離開
    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(
        @MessageBody() data: { roomId: string; playerId: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.leave(data.roomId);
        this.roomService.removePlayerFromRoom(client);
        client.to(data.roomId).emit('playerLeft', { playerId: data.playerId });
    }
}