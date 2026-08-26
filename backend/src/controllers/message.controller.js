import cloudinary from "../lib/cloudinary.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io, emitToUser } from "../lib/socket.js";

const isBlocked = (user, otherUserId) => {
    const otherStr = otherUserId.toString();
    return (user.blockedUsers || []).some(id => id.toString() === otherStr);
};

export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const me = req.user;

        const users = await User.find({ _id: { $ne: loggedInUserId } })
            .select("userName fullName email profilePic blockedUsers");

        const visibleUsers = users.filter(user => {
            if (isBlocked(me, user._id)) return false;
            if (isBlocked(user, loggedInUserId)) return false;
            return true;
        });

        res.status(200).json(visibleUsers);
    } catch (error) {
        console.log("Error in getUsersForSidebar controller", error.message);
        res.status(500).json({ message: "Internal Server Error!" });
    }
}


export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;

        const [me, other] = await Promise.all([
            User.findById(myId).select("blockedUsers"),
            User.findById(userToChatId).select("blockedUsers")
        ]);
        if (!me || !other) return res.status(404).json({ message: "User not found." });
        if (isBlocked(me, userToChatId) || isBlocked(other, myId)) {
            return res.status(403).json({ message: "You cannot view messages with this user." });
        }

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId }
            ]
        });

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getMessages controller", error.message);
        res.status(500).json({ message: "Internal Server Error!" });
    }
}

export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        const [sender, receiver] = await Promise.all([
            User.findById(senderId).select("blockedUsers"),
            User.findById(receiverId).select("blockedUsers")
        ]);
        if (!sender || !receiver) return res.status(404).json({ message: "User not found." });
        if (isBlocked(sender, receiverId) || isBlocked(receiver, senderId)) {
            return res.status(403).json({ message: "You cannot message this user." });
        }

        let imageUrl;
        if (image) {
            //upload image
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl
        });

        await newMessage.save();

        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("IMessage", newMessage);
        }

        res.status(201).json(newMessage);

    } catch (error) {
        console.log("Error in sendMessage controller", error.message);
        res.status(500).json({ message: "Internal Server Error!" });
    }
}

export const clearChat = async (req, res) => {
    try {
        const { id: otherUserId } = req.params;
        const myId = req.user._id;

        const [me, other] = await Promise.all([
            User.findById(myId).select("blockedUsers"),
            User.findById(otherUserId).select("blockedUsers"),
        ]);
        if (!me || !other) return res.status(404).json({ message: "User not found." });

        // Even if blocked, allow clearing own local history on server
        await Message.deleteMany({
            $or: [
                { senderId: myId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: myId },
            ],
        });

        const receiverSocketId = getReceiverSocketId(otherUserId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("chatCleared", { userId: myId.toString() });
        }

        emitToUser(myId, "chatCleared", { friendId: otherUserId.toString() });
        emitToUser(otherUserId, "chatCleared", { friendId: myId.toString() });
        res.status(200).json({ message: "chat cleared." });
    } catch (error) {
        console.log("Error in clearChat controller", error.message);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};