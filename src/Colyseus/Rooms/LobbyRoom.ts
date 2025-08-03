import { Room, Client } from "colyseus";
import { LobbyPlayer, LobbyRoomInfo, LobbyState } from "../../Shared/Schema/LobbyState";
import { matchMaker } from "colyseus";
import { MapSchema } from "@colyseus/schema";
export class LobbyRoom extends Room<LobbyState> {
    maxClients = 100; // 大廳可以容納很多玩家
    autoDispose = false; // 大廳不自動銷毀

    onCreate() {
        console.log("Lobby room created");
        let state = new LobbyState();
        state.totalRooms = 0;
        state.rooms = new MapSchema<LobbyRoomInfo>();
        state.players = new MapSchema<LobbyPlayer>();
        this.state = state;

        this.setupMessageHandlers();

        // 監聽其他房間的變化
        this.onMessage("*", (client, type, message) => {
            console.log(`Lobby received message: ${type}`, message);
        });
    }

    onJoin(client: Client, options: any) {
        console.log(`Player ${client.sessionId} joined lobby`);
        const sessionId = client.sessionId;

        try {
            // 確保參數有效
            const playerName = options.playerName || `Player${sessionId.substring(0, 6)}`;
            const characterId = options.characterId || 1;

            console.log(`Adding player to lobby: ${playerName}, characterId: ${characterId}`);

            let player = new LobbyPlayer();
            player.id = sessionId;
            player.name = playerName;
            player.characterId = characterId;

            this.state.players.set(sessionId, player);

            console.log(`Player ${sessionId} successfully added to lobby state`);
            //通知其他玩家有新玩家加入大廳
            this.broadcast("playerJoinedLobby", {
                playerId: sessionId,
                playerName: playerName,
                characterId: characterId,
            }, { except: client });



        } catch (error) {
            console.error(`Error in onJoin for player ${sessionId}:`, error);
            console.error('Error stack:', error.stack);
            client.send("error", { message: "Failed to join lobby" });
            client.leave();
        }
    }

    onLeave(client: Client, consented: boolean) {
        console.log(`Player ${client.sessionId} left lobby`);

        const player = this.state.players.get(client.sessionId);
        if (player) {
            this.state.players.delete(client.sessionId);


            // 通知其他玩家
            this.broadcast("playerLeftLobby", {
                playerId: client.sessionId,
                playerName: player.name,
            });
        }
    }

    private setupMessageHandlers() {
        // 創建房間
        this.onMessage("createRoom", async (client, message) => {
            try {
                const player = this.state.players.get(client.sessionId);
                if (!player) {
                    client.send("error", { message: "Player not found in lobby" });
                    return;
                }

                // 創建遊戲房間
                const room = await matchMaker.createRoom("game_room", {
                    roomName: message.roomName,
                    maxPlayers: message.maxPlayers || 6,
                    hostId: client.sessionId,
                    hostName: player.name,
                    hostCharacterId: player.characterId,
                });


                player.status = "inRoom";

                // 通知所有大廳玩家新房間已創建
                this.broadcast("roomCreated", {
                    roomId: room.roomId,
                    roomName: message.roomName,
                    hostName: player.name,
                    currentPlayers: 0,
                    maxPlayers: message.maxPlayers || 6,
                    isPrivate: message.isPrivate || false,
                });

                // 回傳房間資訊給創建者
                client.send("roomCreated", {
                    roomId: room.room.roomId,
                    success: true,
                });

            } catch (error) {
                console.error("Error creating room:", error);
                client.send("error", { message: "Failed to create room" });
            }
        });

        // 加入房間
        this.onMessage("joinRoom", async (client, message) => {
            try {
                const player = this.state.players.get(client.sessionId);
                if (!player) {
                    client.send("error", { message: "Player not found in lobby" });
                    return;
                }

                // 嘗試加入遊戲房間
                const room = await matchMaker.joinById(message.roomId, {
                    playerName: player.name,
                    characterId: player.characterId,
                });

                player.status = "inRoom";

                // 回傳成功訊息
                client.send("joinedRoom", {
                    roomId: room.room.roomId,
                    success: true,
                });

            } catch (error) {
                console.error("Error joining room:", error);
                client.send("error", { message: "Failed to join room" });
            }
        });

        // 快速加入房間
        this.onMessage("quickJoin", async (client, message) => {
            try {
                const player = this.state.players.get(client.sessionId);
                if (!player) {
                    client.send("error", { message: "Player not found in lobby" });
                    return;
                }

                // 嘗試快速加入可用房間
                const room = await matchMaker.joinOrCreate("game_room", {
                    playerName: player.name,
                    characterId: player.characterId,
                });

                player.status = "inRoom";

                client.send("joinedRoom", {
                    roomId: room.room.roomId,
                    success: true,
                });

            } catch (error) {
                console.error("Error quick joining:", error);
                client.send("error", { message: "No available rooms" });
            }
        });

        // 獲取房間詳情
        this.onMessage("getRoomInfo", async (client, message) => {
            try {
                const rooms = await matchMaker.query({
                    name: "game_room",
                    roomId: message.roomId,
                });

                if (rooms.length > 0) {
                    client.send("roomInfo", {
                        roomId: rooms[0].roomId,
                        name: rooms[0].metadata?.roomName,
                        currentPlayers: rooms[0].clients,
                        maxPlayers: rooms[0].maxClients,
                        isStarted: rooms[0].metadata?.isStarted || false,
                    });
                } else {
                    client.send("error", { message: "Room not found" });
                }
            } catch (error) {
                client.send("error", { message: "Failed to get room info" });
            }
        });
    }

}
