import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";
import * as webrtcHandlers from "./webrtcHandlers.js";
import callManager from "./callManager.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:4200"]
    }
});

export function getReceiverSocketId(userId){
    return userSocketMap[userId]
}

//used to store online users
const userSocketMap = {};

io.on("connection", async (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId;
    if (userId) {
        userSocketMap[userId] = socket.id;
        
        // Load user data and attach to socket for WebRTC handlers
        try {
            const user = await User.findById(userId).select("-password");
            socket.user = user;
        } catch (error) {
            console.error("Error loading user data:", error);
        }
    }
    
    // io.emit() is used to send events to all the connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // ===== WebRTC Signaling Event Handlers =====
    
    // Handle call offer (initiate call)
    socket.on("call-offer", (data) => {
        webrtcHandlers.handleCallOffer(socket, data);
    });

    // Handle call answer (accept call)
    socket.on("call-answer", (data) => {
        webrtcHandlers.handleCallAnswer(socket, data);
    });

    // Handle ICE candidate exchange
    socket.on("ice-candidate", (data) => {
        webrtcHandlers.handleIceCandidate(socket, data);
    });

    // Handle call rejection
    socket.on("call-reject", (data) => {
        webrtcHandlers.handleCallReject(socket, data);
    });

    // Handle call hangup/end
    socket.on("call-hangup", (data) => {
        webrtcHandlers.handleCallHangup(socket, data);
    });

    // Handle call status updates (available, busy, away)
    socket.on("update-call-status", (data) => {
        webrtcHandlers.handleCallStatusUpdate(socket, data);
    });

    // Handle get call status request
    socket.on("get-call-status", () => {
        webrtcHandlers.handleGetCallStatus(socket);
    });

    // Handle join call room (for future group calls)
    socket.on("join-call-room", (data) => {
        const { callId } = data;
        if (callId) {
            socket.join(`call-${callId}`);
            socket.emit("joined-call-room", { callId });
        }
    });

    // Handle leave call room
    socket.on("leave-call-room", (data) => {
        const { callId } = data;
        if (callId) {
            socket.leave(`call-${callId}`);
            socket.emit("left-call-room", { callId });
        }
    });

    // ===== End WebRTC Event Handlers =====

    socket.on("disconnect", async () => {
        console.log("A user disconnected", socket.id);

        // Clean up WebRTC call state
        await webrtcHandlers.handleUserDisconnect(socket.id);

        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export function emitToUser(userId, event, data) {
    const socketId = userSocketMap[userId];
    if (socketId) {
        io.to(socketId).emit(event, data);
    }
}

export { io, app, server };