import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriends,
    getFriendRequests,
    searchUsers,
    removeFriend,
    blockUser,
    unblockUser,
    getBlockedUsers
} from "../controllers/friend.controller.js";

const router = express.Router();

router.post("/request", protectRoute, sendFriendRequest);
router.post("/accept", protectRoute, acceptFriendRequest);
router.post("/reject", protectRoute, rejectFriendRequest);
router.get("/friends", protectRoute, getFriends);
router.get("/requests", protectRoute, getFriendRequests);
router.get("/search", protectRoute, searchUsers);
router.get("/blocked", protectRoute, getBlockedUsers);
router.delete("/remove/:id", protectRoute, removeFriend);
router.post("/block", protectRoute, blockUser);
router.post("/unblock", protectRoute, unblockUser);

export default router;