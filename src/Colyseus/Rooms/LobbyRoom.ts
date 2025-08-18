import { Room, Client } from "colyseus";
import jwt from 'jsonwebtoken';
import { matchMaker } from "colyseus";
import { MapSchema } from "@colyseus/schema";
import { LobbyPlayer, LobbyRoomInfo, LobbyState } from "@/Colyseus/Schema/LobbyState";
import { JWTPayload } from "@/struct";
import { DataSource, Repository } from "typeorm";
import { CharacterORM } from "@/ORM/charater.entity";
import { getAppContext } from "@/main";

export class LobbyRoom extends Room<LobbyState> {
    private characterRepo?: Repository<CharacterORM>;

    maxClients = 100; // 大廳可以容納很多玩家
    autoDispose = false; // 大廳不自動銷毀

    onCreate() {
        console.log("Lobby room created");

        // 初始化純淨的 Schema 狀態
        this.setState(new LobbyState());
        this.state.totalRooms = 0;
        this.state.totalPlayers = 0;
        this.state.rooms = new MapSchema<LobbyRoomInfo>();
        this.state.players = new MapSchema<LobbyPlayer>();

        this.setupMessageHandlers();
        this.startRoomMonitoring();

        console.log("Lobby room initialized successfully");
    }

    async onJoin(client: Client, options: any) {
        console.log(`Player ${client.sessionId} joined lobby`);
        const token = options?.token;
        if (!token) {

            throw new Error("Unauthorized")
        }
        try {
            // 業務邏輯：驗證和處理玩家加入
            const playerData = await this.validatePlayerOptions(token, client.sessionId);

            // 創建玩家 Schema 物件
            const player = new LobbyPlayer();
            player.id = playerData.id;
            player.name = playerData.name;
            player.characterId = playerData.characterId;
            player.level = playerData.level;
            player.status = "idle";

            // 更新狀態
            this.state.players.set(client.sessionId, player);
            this.state.totalPlayers = this.state.players.size;

            console.log(`Player ${playerData.name} successfully added to lobby`);

            // 發送歡迎訊息給新玩家
            client.send("lobbyWelcome", {
                playerId: client.sessionId,

            });

            // 通知其他玩家
            this.broadcast("playerJoinedLobby", {
                playerId: client.sessionId,
                playerName: playerData.name,
                characterId: playerData.characterId,
                totalPlayers: this.state.totalPlayers
            }, { except: client });

        } catch (error) {
            console.error(`Error adding player ${client.sessionId}:`, error);
            client.send("error", { message: "Failed to join lobby: " + error.message });
            client.leave();
        }
    }

    onLeave(client: Client, consented: boolean) {
        console.log(`Player ${client.sessionId} left lobby, consented: ${consented}`);

        const player = this.state.players.get(client.sessionId);
        if (player) {
            // 業務邏輯：清理玩家資料
            const playerName = player.name;
            this.state.players.delete(client.sessionId);
            this.state.totalPlayers = this.state.players.size;

            console.log(`Player ${playerName} removed from lobby`);

            // 通知其他玩家
            this.broadcast("playerLeftLobby", {
                playerId: client.sessionId,
                playerName: playerName,
                totalPlayers: this.state.totalPlayers
            });
        }
    }

    /**
     * 業務邏輯：驗證玩家選項
     */
    private async validatePlayerOptions(token: string, sessionId: string) {
        const payload = jwt.verify(token, process.env.JWT_KEY as string) as JWTPayload;
        const app = await getAppContext();
        const dataSource = app.get<DataSource>(DataSource);
        this.characterRepo = dataSource.getRepository(CharacterORM);

        const character = await this.characterRepo.findOne({
            where: {
                id: payload.playerId
            }
        });


        const playerName = character?.name || `Player${sessionId.substring(0, 6)}`;
        const characterId = character?.id || 1;
        const level = character?.Lv || 1;


        return {
            id: sessionId,
            name: playerName.trim(),
            characterId: characterId,
            level: level
        };
    }

    /**
     * 業務邏輯：添加房間到大廳列表
     */
    private addRoomToLobby(roomInfo: LobbyRoomInfo) {
        const lobbyRoomInfo = new LobbyRoomInfo();
        lobbyRoomInfo.roomId = roomInfo.roomId;
        lobbyRoomInfo.roomName = roomInfo.roomName;
        lobbyRoomInfo.hostName = roomInfo.hostName;
        lobbyRoomInfo.currentPlayers = roomInfo.currentPlayers;
        lobbyRoomInfo.maxPlayers = roomInfo.maxPlayers;
        lobbyRoomInfo.isStarted = roomInfo.isStarted;
        lobbyRoomInfo.isPrivate = roomInfo.isPrivate;

        this.state.rooms.set(roomInfo.roomId, lobbyRoomInfo);
        this.state.totalRooms = this.state.rooms.size;

        // 通知所有大廳玩家
        this.broadcast("roomCreated", lobbyRoomInfo);
    }

    /**
     * 業務邏輯：從大廳列表移除房間
     */
    private removeRoomFromLobby(roomId: string) {
        if (this.state.rooms.has(roomId)) {
            this.state.rooms.delete(roomId);
            this.state.totalRooms = this.state.rooms.size;

            // 通知所有大廳玩家
            this.broadcast("roomRemoved", { roomId });
        }
    }

    /**
     * 業務邏輯：更新房間資訊
     */
    private updateRoomInLobby(roomId: string, updates: Partial<LobbyRoomInfo>) {
        const room = this.state.rooms.get(roomId);
        if (room) {
            if (updates.currentPlayers !== undefined) room.currentPlayers = updates.currentPlayers;
            if (updates.isStarted !== undefined) room.isStarted = updates.isStarted;

            // 通知所有大廳玩家
            this.broadcast("roomUpdated", { roomId, ...updates });
        }
    }

    /**
     * 業務邏輯：監控遊戲房間狀態
     */
    private startRoomMonitoring() {
        // 每30秒更新一次房間列表
        this.clock.setInterval(() => {
            this.refreshGameRooms();
        }, 30000);
    }

    /**
     * 業務邏輯：刷新遊戲房間列表
     */
    private async refreshGameRooms() {
        try {
            const rooms = await matchMaker.query({ name: "game_room" });

            // 清理已不存在的房間
            const existingRoomIds = new Set(rooms.map(r => r.roomId));
            const lobbyRoomIds = Array.from(this.state.rooms.keys());

            lobbyRoomIds.forEach(roomId => {
                if (!existingRoomIds.has(roomId)) {
                    this.removeRoomFromLobby(roomId);
                }
            });

            // 更新現有房間資訊
            rooms.forEach(room => {
                const roomInfo = {
                    roomId: room.roomId,
                    roomName: room.metadata?.roomName || "Unknown Room",
                    hostName: room.metadata?.hostName || "Unknown Host",
                    currentPlayers: room.clients,
                    maxPlayers: room.maxClients,
                    isStarted: room.metadata?.isStarted || false,
                    isPrivate: room.metadata?.isPrivate || false
                } as LobbyRoomInfo;

                if (this.state.rooms.has(room.roomId)) {
                    this.updateRoomInLobby(room.roomId, roomInfo);
                } else {
                    this.addRoomToLobby(roomInfo);
                }
            });

        } catch (error) {
            console.error("Error refreshing game rooms:", error);
        }
    }

    /**
     * 設置訊息處理器
     */
    private setupMessageHandlers() {
        // 創建房間
        this.onMessage("createRoom", async (client, message) => {
            await this.handleCreateRoom(client, message);
        });

        // 加入房間
        this.onMessage("joinRoom", async (client, message) => {
            await this.handleJoinRoom(client, message);
        });

        // 快速加入房間
        this.onMessage("quickJoin", async (client, message) => {
            await this.handleQuickJoin(client, message);
        });

        // 刷新房間列表
        this.onMessage("refreshRooms", (client, message) => {
            this.refreshGameRooms();
        });

        // 獲取房間詳情
        this.onMessage("getRoomInfo", async (client, message) => {
            await this.handleGetRoomInfo(client, message);
        });
    }

    /**
     * 業務邏輯：處理創建房間請求
     */
    private async handleCreateRoom(client: Client, message: any) {
        try {
            const player = this.state.players.get(client.sessionId);
            if (!player) {
                client.send("error", { message: "Player not found in lobby" });
                return;
            }

            // 驗證房間設定
            const roomName = message.roomName?.trim();
            if (!roomName || roomName.length < 2) {
                client.send("error", { message: "Room name must be at least 2 characters" });
                return;
            }

            const maxPlayers = message.maxPlayers || 6;
            if (maxPlayers < 2 || maxPlayers > 10) {
                client.send("error", { message: "Max players must be between 2 and 10" });
                return;
            }

            // 創建遊戲房間
            const room = await matchMaker.createRoom("game_room", {
                roomName: roomName,
                maxPlayers: maxPlayers,
                hostId: client.sessionId,
                hostName: player.name,
                hostCharacterId: player.characterId,
                isPrivate: message.isPrivate || false,
            });

            // 更新玩家狀態
            player.status = "inRoom";

            // 添加到大廳房間列表
            this.addRoomToLobby({
                roomId: room.room.roomId,
                roomName: roomName,
                hostName: player.name,
                currentPlayers: 0,
                maxPlayers: maxPlayers,
                isStarted: false,
                isPrivate: message.isPrivate || false,
            } as LobbyRoomInfo);

            // 回傳成功訊息給創建者
            client.send("roomCreated", {
                roomId: room.room.roomId,
                success: true,
                message: "Room created successfully"
            });

            console.log(`Room "${roomName}" created by ${player.name}`);

        } catch (error) {
            console.error("Error creating room:", error);
            client.send("error", { message: "Failed to create room: " + error.message });
        }
    }

    /**
     * 業務邏輯：處理加入房間請求
     */
    private async handleJoinRoom(client: Client, message: any) {
        try {
            const player = this.state.players.get(client.sessionId);
            if (!player) {
                client.send("error", { message: "Player not found in lobby" });
                return;
            }

            if (!message.roomId) {
                client.send("error", { message: "Room ID is required" });
                return;
            }

            // 檢查房間是否存在於大廳列表
            const lobbyRoom = this.state.rooms.get(message.roomId);
            if (!lobbyRoom) {
                client.send("error", { message: "Room not found" });
                return;
            }

            // 檢查房間是否已滿
            if (lobbyRoom.currentPlayers >= lobbyRoom.maxPlayers) {
                client.send("error", { message: "Room is full" });
                return;
            }

            // 檢查房間是否已開始
            if (lobbyRoom.isStarted) {
                client.send("error", { message: "Game has already started" });
                return;
            }

            // 嘗試加入遊戲房間
            const room = await matchMaker.joinById(message.roomId, {
                playerName: player.name,
                characterId: player.characterId,
            });

            // 更新玩家狀態
            player.status = "inRoom";

            // 回傳成功訊息
            client.send("joinedRoom", {
                roomId: room.room.roomId,
                success: true,
                message: "Joined room successfully"
            });

            console.log(`Player ${player.name} joined room ${message.roomId}`);

        } catch (error) {
            console.error("Error joining room:", error);
            client.send("error", { message: "Failed to join room: " + error.message });
        }
    }

    /**
     * 業務邏輯：處理快速加入請求
     */
    private async handleQuickJoin(client: Client, message: any) {
        try {
            const player = this.state.players.get(client.sessionId);
            if (!player) {
                client.send("error", { message: "Player not found in lobby" });
                return;
            }

            // 尋找可用房間
            const availableRooms = Array.from(this.state.rooms.values())
                .filter(room =>
                    !room.isStarted &&
                    !room.isPrivate &&
                    room.currentPlayers < room.maxPlayers
                );

            if (availableRooms.length === 0) {
                // 沒有可用房間，創建新房間
                await this.handleCreateRoom(client, {
                    roomName: `${player.name}'s Room`,
                    maxPlayers: 4,
                    isPrivate: false
                });
                return;
            }

            // 加入第一個可用房間
            const targetRoom = availableRooms[0];
            await this.handleJoinRoom(client, { roomId: targetRoom.roomId });

        } catch (error) {
            console.error("Error in quick join:", error);
            client.send("error", { message: "Quick join failed: " + error.message });
        }
    }

    /**
     * 業務邏輯：處理獲取房間資訊請求
     */
    private async handleGetRoomInfo(client: Client, message: any) {
        try {
            if (!message.roomId) {
                client.send("error", { message: "Room ID is required" });
                return;
            }

            const lobbyRoom = this.state.rooms.get(message.roomId);
            if (lobbyRoom) {
                client.send("roomInfo", lobbyRoom);
            } else {
                // 嘗試從 matchMaker 獲取最新資訊
                const rooms = await matchMaker.query({
                    name: "game_room",
                    roomId: message.roomId,
                });

                if (rooms.length > 0) {
                    const room = rooms[0];
                    client.send("roomInfo", {
                        roomId: room.roomId,
                        roomName: room.metadata?.roomName || "Unknown Room",
                        hostName: room.metadata?.hostName || "Unknown Host",
                        currentPlayers: room.clients,
                        maxPlayers: room.maxClients,
                        isStarted: room.metadata?.isStarted || false,
                        isPrivate: room.metadata?.isPrivate || false,
                    });
                } else {
                    client.send("error", { message: "Room not found" });
                }
            }
        } catch (error) {
            console.error("Error getting room info:", error);
            client.send("error", { message: "Failed to get room info" });
        }
    }

    /**
     * 清理資源
     */
    onDispose() {
        console.log("Lobby room disposed");
        // 清理定時器等資源
        this.clock.clear();
    }
}
