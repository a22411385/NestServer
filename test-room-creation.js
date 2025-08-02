// 測試腳本：檢查房間創建功能
const testCreateRoom = async () => {
    const createRoomData = {
        roomName: "測試房間",
        maxPlayers: 6,
        hostId: "test-host-123",
        hostName: "測試主機",
        hostCharacterId: 1,
        isPrivate: false
    };

    try {
        const response = await fetch('http://localhost:8000/game/rooms/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(createRoomData)
        });

        const result = await response.json();
        console.log('Room creation result:', result);

        if (result.success) {
            console.log('✅ Room created successfully');
            console.log('Room ID:', result.data.roomId);
            console.log('Session ID:', result.data.sessionId);
        } else {
            console.log('❌ Room creation failed');
        }
    } catch (error) {
        console.error('❌ Error testing room creation:', error);
    }
};

// 如果在 Node.js 環境中運行
if (typeof window === 'undefined') {
    // 模擬 fetch API
    const fetch = require('node-fetch');
    testCreateRoom();
} else {
    // 在瀏覽器中運行
    console.log('Run testCreateRoom() in browser console');
}
