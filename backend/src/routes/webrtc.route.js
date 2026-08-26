/**
 * WebRTC Routes - REST API routes for WebRTC functionality
 */

import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
    getCallStatus,
    updateCallStatus,
    getActiveCalls,
    endCall,
    getAvailableUsers,
    cleanupOrphanedCalls
} from "../controllers/webrtc.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Get user's current call status
router.get("/status", getCallStatus);

// Update user's call status
router.put("/status", updateCallStatus);

// Get users available for calls
router.get("/available-users", getAvailableUsers);

// Get active calls (for debugging/admin)
router.get("/calls", getActiveCalls);

// End a specific call
router.delete("/calls/:callId", endCall);

// Clean up orphaned calls (admin endpoint)
router.post("/cleanup", cleanupOrphanedCalls);

export default router;

