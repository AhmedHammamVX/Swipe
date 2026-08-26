/**
 * WebRTC Controller - Handles REST API endpoints for WebRTC functionality
 * Provides endpoints for call management and user status
 */

import callManager from '../lib/callManager.js';
import User from '../models/user.model.js';

/**
 * Get user's current call status
 * GET /api/webrtc/status
 */
export const getCallStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select('callStatus currentCall');
        const currentCall = callManager.getCallByUser(userId);

        res.status(200).json({
            callStatus: user.callStatus,
            currentCall: currentCall ? {
                callId: currentCall.callId,
                callType: currentCall.callType,
                status: currentCall.status,
                participants: currentCall.participants,
                startTime: currentCall.startTime
            } : null
        });
    } catch (error) {
        console.log("Error in getCallStatus controller", error.message);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};

/**
 * Update user's call status
 * PUT /api/webrtc/status
 */
export const updateCallStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const userId = req.user._id;

        if (!['available', 'busy', 'away'].includes(status)) {
            return res.status(400).json({ message: "Invalid status. Must be 'available', 'busy', or 'away'" });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { callStatus: status },
            { new: true }
        ).select('callStatus');

        res.status(200).json({
            message: "Call status updated successfully",
            callStatus: user.callStatus
        });
    } catch (error) {
        console.log("Error in updateCallStatus controller", error.message);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};

/**
 * Get active calls (for admin/debugging purposes)
 * GET /api/webrtc/calls
 */
export const getActiveCalls = async (req, res) => {
    try {
        const activeCalls = callManager.getActiveCalls();
        
        // Populate user details for each call
        const callsWithDetails = await Promise.all(
            activeCalls.map(async (call) => {
                const participants = await User.find({
                    _id: { $in: call.participants }
                }).select('userName fullName profilePic');

                return {
                    ...call,
                    participants: participants
                };
            })
        );

        res.status(200).json({
            activeCalls: callsWithDetails,
            totalCalls: callsWithDetails.length
        });
    } catch (error) {
        console.log("Error in getActiveCalls controller", error.message);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};

/**
 * End a call by call ID
 * DELETE /api/webrtc/calls/:callId
 */
export const endCall = async (req, res) => {
    try {
        const { callId } = req.params;
        const userId = req.user._id;

        const callData = callManager.getCall(callId);
        if (!callData) {
            return res.status(404).json({ message: "Call not found" });
        }

        if (!callData.participants.includes(userId)) {
            return res.status(403).json({ message: "Not authorized to end this call" });
        }

        await callManager.endCall(callId, userId);

        res.status(200).json({
            message: "Call ended successfully",
            callId
        });
    } catch (error) {
        console.log("Error in endCall controller", error.message);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};

/**
 * Get users available for calls
 * GET /api/webrtc/available-users
 */
export const getAvailableUsers = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        
        // Get users who are friends and available for calls
        const availableUsers = await User.find({
            _id: { $ne: loggedInUserId },
            callStatus: 'available',
            friends: loggedInUserId
        }).select('userName fullName profilePic callStatus');

        res.status(200).json(availableUsers);
    } catch (error) {
        console.log("Error in getAvailableUsers controller", error.message);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};

/**
 * Clean up orphaned calls (admin endpoint)
 * POST /api/webrtc/cleanup
 */
export const cleanupOrphanedCalls = async (req, res) => {
    try {
        const cleanedCount = await callManager.cleanupOrphanedCalls();
        
        res.status(200).json({
            message: "Cleanup completed",
            orphanedCallsRemoved: cleanedCount
        });
    } catch (error) {
        console.log("Error in cleanupOrphanedCalls controller", error.message);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};

