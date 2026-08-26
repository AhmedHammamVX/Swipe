import User from "../models/user.model.js";
import { emitToUser } from "../lib/socket.js";

const isBlockedEitherWay = (aUser, bUserId) => {
    const bIdStr = bUserId.toString();
    const aBlocksB = (aUser.blockedUsers || []).some(id => id.toString() === bIdStr);
    return aBlocksB;
};

// Send a friend request
export const sendFriendRequest = async (req, res) => {
    try {
        const fromUserId = req.user._id;
        const { toUserId } = req.body;
        if (fromUserId.toString() === toUserId) {
            return res.status(400).json({ message: "You cannot send a friend request to yourself." });
        }
        const toUser = await User.findById(toUserId);
        if (!toUser) return res.status(404).json({ message: "User not found." });

        // Block enforcement (either direction)
        const fromUserForBlockCheck = await User.findById(fromUserId).select("blockedUsers");
        if (
            isBlockedEitherWay(fromUserForBlockCheck, toUserId) ||
            isBlockedEitherWay(toUser, fromUserId)
        ) {
            return res.status(403).json({ message: "You cannot send a friend request to this user." });
        }

        if (toUser.friendRequests.includes(fromUserId)) {
            return res.status(400).json({ message: "Friend request already sent." });
        }
        if (toUser.friends.includes(fromUserId)) {
            return res.status(400).json({ message: "User is already your friend." });
        }
        // Check if the recipient has already sent a request to the sender
        const fromUser = await User.findById(fromUserId).select('-password');
        if (fromUser.friendRequests.includes(toUserId)) {
            return res.status(400).json({ message: "This user has already sent you a friend request." });
        }
        toUser.friendRequests.push(fromUserId);
        await toUser.save();
        emitToUser(toUserId, "friendRequestReceived", { fromUser });
        res.status(200).json({ message: "Friend request sent." });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error!" });
    }
};

// Accept a friend request
export const acceptFriendRequest = async (req, res) => {
    try {
        const userId = req.user._id;
        const { fromUserId } = req.body;
        const user = await User.findById(userId);
        const fromUser = await User.findById(fromUserId);
        if (!user || !fromUser) return res.status(404).json({ message: "User not found." });

        // Block enforcement
        if (
            isBlockedEitherWay(user, fromUserId) ||
            isBlockedEitherWay(fromUser, userId)
        ) {
            return res.status(403).json({ message: "You cannot accept this request." });
        }

        if (!user.friendRequests.includes(fromUserId)) {
            return res.status(400).json({ message: "No friend request from this user." });
        }
        user.friendRequests = user.friendRequests.filter(id => id.toString() !== fromUserId);
        user.friends.push(fromUserId);
        fromUser.friends.push(userId);
        await user.save();
        await fromUser.save();
        emitToUser(fromUserId, "friendRequestAccepted", { user });
        res.status(200).json({ message: "Friend request accepted." });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error!" });
    }
};

// Reject a friend request
export const rejectFriendRequest = async (req, res) => {
    try {
        const userId = req.user._id;
        const { fromUserId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found." });
        if (!user.friendRequests.includes(fromUserId)) {
            return res.status(400).json({ message: "No friend request from this user." });
        }
        user.friendRequests = user.friendRequests.filter(id => id.toString() !== fromUserId);
        await user.save();
        emitToUser(fromUserId, "friendRequestRejected", { userId });
        res.status(200).json({ message: "Friend request rejected." });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error!" });
    }
};

// Get friends list
export const getFriends = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId)
            .populate("friends", "userName fullName email profilePic blockedUsers");
        if (!user) return res.status(404).json({ message: "User not found." });

        const myBlocked = new Set((user.blockedUsers || []).map(id => id.toString()));

        const visibleFriends = (user.friends || [])
            .filter(friend => {
                const fid = friend._id.toString();
                if (myBlocked.has(fid)) return false;
                const friendBlockedMe = (friend.blockedUsers || []).some(
                    id => id.toString() === userId.toString()
                );
                return !friendBlockedMe;
            })
            .map(friend => ({
                _id: friend._id,
                userName: friend.userName,
                fullName: friend.fullName,
                email: friend.email,
                profilePic: friend.profilePic,
            }));

        res.status(200).json(visibleFriends);
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error!" });
    }
};

// Get incoming friend requests
export const getFriendRequests = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId)
            .populate("friendRequests", "userName fullName email profilePic blockedUsers");
        if (!user) return res.status(404).json({ message: "User not found." });

        const myBlocked = new Set((user.blockedUsers || []).map(id => id.toString()));

        const visibleRequests = (user.friendRequests || [])
            .filter(requestUser => {
                const rid = requestUser._id.toString();
                if (myBlocked.has(rid)) return false;
                const theyBlockedMe = (requestUser.blockedUsers || []).some(
                    id => id.toString() === userId.toString()
                );
                return !theyBlockedMe;
            })
            .map(requestUser => ({
                _id: requestUser._id,
                userName: requestUser.userName,
                fullName: requestUser.fullName,
                email: requestUser.email,
                profilePic: requestUser.profilePic,
            }));

        res.status(200).json(visibleRequests);
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error!" });
    }
};

// Get blocked users list
export const getBlockedUsers = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId)
            .populate("blockedUsers", "userName fullName email profilePic");

        if (!user) return res.status(404).json({ message: "User not found." });

        res.status(200).json(user.blockedUsers || []);
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error!" });
    }
};

// Search users by username or full name
export const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ message: "Query is required." });
        const currentUserId = req.user._id;
        const myBlocked = new Set((req.user.blockedUsers || []).map(id => id.toString()));

        const users = await User.find({
            $or: [
                { userName: { $regex: query, $options: "i" } },
                { fullName: { $regex: query, $options: "i" } }
            ]
        }).select("userName fullName email profilePic blockedUsers");

        const visibleUsers = users
            .filter(user => {
                const uid = user._id.toString();
                if (uid === currentUserId.toString()) return false;
                if (myBlocked.has(uid)) return false;
                const theyBlockedMe = (user.blockedUsers || []).some(
                    id => id.toString() === currentUserId.toString()
                );
                return !theyBlockedMe;
            })
            .map(user => ({
                _id: user._id,
                userName: user.userName,
                fullName: user.fullName,
                email: user.email,
                profilePic: user.profilePic,
            }));

        res.status(200).json(visibleUsers);
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error!" });
    }
};

// Remove friend (both directions)
export const removeFriend = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id: friendId } = req.params;

        if (userId.toString() === friendId) {
            return res.status(400).json({ message: "You cannot remove yourself." });
        }

        const [user, friend] = await Promise.all([
            User.findById(userId),
            User.findById(friendId),
        ]);

        if (!user || !friend) return res.status(404).json({ message: "User not found." });

        user.friends = (user.friends || []).filter(id => id.toString() !== friendId);
        friend.friends = (friend.friends || []).filter(id => id.toString() !== userId.toString());

        // Clean up any pending requests in either direction
        user.friendRequests = (user.friendRequests || []).filter(id => id.toString() !== friendId);
        friend.friendRequests = (friend.friendRequests || []).filter(id => id.toString() !== userId.toString());

        await Promise.all([user.save(), friend.save()]);

        emitToUser(friendId, "friendRemoved", { friendId: userId.toString() });
        emitToUser(userId, "friendRemoved", { friendId: friendId.toString() });
        res.status(200).json({ message: "Friend removed." });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error!" });
    }
};

// Block user (also removes friendship + requests)
export const blockUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const { userId: targetUserId } = req.body;

        if (!targetUserId) return res.status(400).json({ message: "userId is required." });
        if (userId.toString() === targetUserId) {
            return res.status(400).json({ message: "You cannot block yourself." });
        }

        const [user, target] = await Promise.all([
            User.findById(userId),
            User.findById(targetUserId),
        ]);
        if (!user || !target) return res.status(404).json({ message: "User not found." });

        const alreadyBlocked = (user.blockedUsers || []).some(id => id.toString() === targetUserId);
        if (!alreadyBlocked) user.blockedUsers.push(targetUserId);

        // Remove friendship + requests both ways
        user.friends = (user.friends || []).filter(id => id.toString() !== targetUserId);
        target.friends = (target.friends || []).filter(id => id.toString() !== userId.toString());
        user.friendRequests = (user.friendRequests || []).filter(id => id.toString() !== targetUserId);
        target.friendRequests = (target.friendRequests || []).filter(id => id.toString() !== userId.toString());

        await Promise.all([user.save(), target.save()]);

        emitToUser(targetUserId, "blockedUser", { userId: userId.toString() });
        emitToUser(userId, "blockedUser", { userId: targetUserId.toString() });
        res.status(200).json({ message: "User blocked." });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error!" });
    }
};

export const unblockUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const { userId: targetUserId } = req.body;

        if (!targetUserId) return res.status(400).json({ message: "userId is required." });
        if (userId.toString() === targetUserId) {
            return res.status(400).json({ message: "You cannot unblock yourself." });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        user.blockedUsers = (user.blockedUsers || []).filter(id => id.toString() !== targetUserId);
        await user.save();

        emitToUser(targetUserId, "unblockedByUser", { userId: userId.toString() });
        res.status(200).json({ message: "User unblocked." });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error!" });
    }
};