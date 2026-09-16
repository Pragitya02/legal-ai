// =====================================================
// NYAYA AI — WEBRTC SIGNALING SERVICE
// =====================================================
//
// This service keeps temporary WebRTC signaling messages
// in server memory.
//
// IMPORTANT:
// - Audio/video does NOT pass through this service.
// - Only WebRTC signaling data passes through it:
//   offer, answer, ICE candidates, hangup, etc.
// - Actual media will flow between the two browsers.
// =====================================================

const rooms = new Map();

const MESSAGE_TTL = 10 * 60 * 1000; // 10 minutes
const MAX_MESSAGES_PER_ROOM = 100;

// -----------------------------------------------------
// Get or create a signaling room
// -----------------------------------------------------

function getRoom(appointmentId) {
    const key = String(appointmentId);

    let room = rooms.get(key);

    if (!room) {
        room = {
            messages: [],
            participants: new Map(),
            lastActivity: Date.now(),
        };

        rooms.set(key, room);
    }

    room.lastActivity = Date.now();

    return room;
}

// -----------------------------------------------------
// Remove expired rooms
// -----------------------------------------------------

function cleanupRooms() {
    const now = Date.now();

    for (const [appointmentId, room] of rooms.entries()) {
        if (now - room.lastActivity > MESSAGE_TTL) {
            rooms.delete(appointmentId);
        }
    }
}

setInterval(cleanupRooms, 60 * 1000);

// -----------------------------------------------------
// Register participant
// -----------------------------------------------------

function joinRoom(appointmentId, userId, role) {
    const room = getRoom(appointmentId);

    const participantKey = String(userId);

    room.participants.set(participantKey, {
        userId: Number(userId),
        role,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
    });

    return {
        success: true,
        participantCount: room.participants.size,
    };
}

// -----------------------------------------------------
// Update participant activity
// -----------------------------------------------------

function touchParticipant(appointmentId, userId) {
    const room = rooms.get(String(appointmentId));

    if (!room) {
        return false;
    }

    const participant = room.participants.get(String(userId));

    if (!participant) {
        return false;
    }

    participant.lastSeen = Date.now();
    room.lastActivity = Date.now();

    return true;
}

// -----------------------------------------------------
// Remove participant
// -----------------------------------------------------

function leaveRoom(appointmentId, userId) {
    const room = rooms.get(String(appointmentId));

    if (!room) {
        return false;
    }

    room.participants.delete(String(userId));
    room.lastActivity = Date.now();

    return true;
}

// -----------------------------------------------------
// Add signaling message
// -----------------------------------------------------

function addMessage(appointmentId, senderId, message) {
    const room = getRoom(appointmentId);

    touchParticipant(appointmentId, senderId);

    const messageId = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;

    const entry = {
        id: messageId,
        senderId: Number(senderId),
        type: message.type,
        payload: message.payload,
        createdAt: Date.now(),
    };

    room.messages.push(entry);

    // Prevent unlimited memory growth.
    if (room.messages.length > MAX_MESSAGES_PER_ROOM) {
        room.messages.splice(
            0,
            room.messages.length - MAX_MESSAGES_PER_ROOM
        );
    }

    room.lastActivity = Date.now();

    return entry;
}

// -----------------------------------------------------
// Get messages after a specific message ID
// -----------------------------------------------------

function getMessages(appointmentId, userId, afterId) {
    const room = rooms.get(String(appointmentId));

    if (!room) {
        return [];
    }

    touchParticipant(appointmentId, userId);

    let startIndex = 0;

    if (afterId) {
        const index = room.messages.findIndex(
            (message) => message.id === String(afterId)
        );

        if (index >= 0) {
            startIndex = index + 1;
        }
    }

    // Never send the sender's own signaling messages back.
    return room.messages
        .slice(startIndex)
        .filter(
            (message) =>
                Number(message.senderId) !== Number(userId)
        );
}

// -----------------------------------------------------
// Clear room
// -----------------------------------------------------

function clearRoom(appointmentId) {
    rooms.delete(String(appointmentId));
}

// -----------------------------------------------------
// Exports
// -----------------------------------------------------

module.exports = {
    joinRoom,
    touchParticipant,
    leaveRoom,
    addMessage,
    getMessages,
    clearRoom,
};