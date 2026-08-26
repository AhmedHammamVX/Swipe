/**
 * WebRTC Handlers - Handles WebRTC signaling events and validation
 * Provides utility functions for WebRTC signaling operations
 */

import callManager from './callManager.js';
import { emitToUser } from './socket.js';
import User from '../models/user.model.js';

/**
 * Validate WebRTC offer/answer structure
 * @param {Object} sdp - SDP object
 * @returns {boolean} True if valid
 */
function validateSDP(sdp) {
    return sdp && 
           typeof sdp === 'object' && 
           sdp.type && 
           sdp.sdp && 
           (sdp.type === 'offer' || sdp.type === 'answer');
}

/**
 * Validate ICE candidate structure
 * @param {Object} candidate - ICE candidate object
 * @returns {boolean} True if valid
 */
function validateIceCandidate(candidate) {
    return candidate && 
           typeof candidate === 'object' && 
           candidate.candidate && 
           candidate.sdpMLineIndex !== undefined && 
           candidate.sdpMid;
}

/**
 * Handle incoming call offer
 * @param {Object} socket - Socket instance
 * @param {Object} data - Call offer data
 */
export async function handleCallOffer(socket, data) {
    try {
        const { calleeId, callType, offer } = data;
        const callerId = callManager.getUserFromSocket(socket.id);

        if (!callerId) {
            socket.emit('call-error', { message: 'User not authenticated' });
            return;
        }

        // Validate input
        if (!calleeId || !callType || !validateSDP(offer)) {
            socket.emit('call-error', { message: 'Invalid call offer data' });
            return;
        }

        if (!['audio', 'video'].includes(callType)) {
            socket.emit('call-error', { message: 'Invalid call type' });
            return;
        }

        // Check if callee exists and is available
        const callee = await User.findById(calleeId);
        if (!callee) {
            socket.emit('call-error', { message: 'User not found' });
            return;
        }

        // Create call session
        const callData = await callManager.createCall(callerId, calleeId, callType);
        
        // Store the offer
        callManager.storeOffer(callData.callId, offer);

        // Map socket to user
        callManager.mapSocketToUser(socket.id, callerId);

        // Send call offer to callee
        emitToUser(calleeId, 'incoming-call', {
            callId: callData.callId,
            callerId,
            callType,
            offer,
            callerInfo: {
                userName: socket.user?.userName || 'Unknown',
                fullName: socket.user?.fullName || 'Unknown User'
            }
        });

        // Confirm to caller
        socket.emit('call-offer-sent', {
            callId: callData.callId,
            status: 'ringing'
        });

        console.log(`Call offer sent from ${callerId} to ${calleeId} (${callType})`);

    } catch (error) {
        console.error('Error handling call offer:', error);
        socket.emit('call-error', { message: error.message });
    }
}

/**
 * Handle call answer
 * @param {Object} socket - Socket instance
 * @param {Object} data - Call answer data
 */
export async function handleCallAnswer(socket, data) {
    try {
        const { callId, answer } = data;
        const userId = callManager.getUserFromSocket(socket.id);

        if (!userId) {
            socket.emit('call-error', { message: 'User not authenticated' });
            return;
        }

        // Validate input
        if (!callId || !validateSDP(answer)) {
            socket.emit('call-error', { message: 'Invalid call answer data' });
            return;
        }

        // Get call data
        const callData = callManager.getCall(callId);
        if (!callData) {
            socket.emit('call-error', { message: 'Call not found' });
            return;
        }

        // Verify user is part of this call
        if (!callData.participants.includes(userId)) {
            socket.emit('call-error', { message: 'Not authorized for this call' });
            return;
        }

        // Store the answer
        callManager.storeAnswer(callId, answer);
        callManager.updateCallStatus(callId, 'active');

        // Send answer to caller
        const callerId = callData.callerId;
        emitToUser(callerId, 'call-answer', {
            callId,
            answer
        });

        // Confirm to answerer
        socket.emit('call-answered', {
            callId,
            status: 'active'
        });

        console.log(`Call answered for call ${callId} by user ${userId}`);

    } catch (error) {
        console.error('Error handling call answer:', error);
        socket.emit('call-error', { message: error.message });
    }
}

/**
 * Handle ICE candidate exchange
 * @param {Object} socket - Socket instance
 * @param {Object} data - ICE candidate data
 */
export async function handleIceCandidate(socket, data) {
    try {
        const { callId, candidate } = data;
        const userId = callManager.getUserFromSocket(socket.id);

        if (!userId) {
            socket.emit('call-error', { message: 'User not authenticated' });
            return;
        }

        // Validate input
        if (!callId || !validateIceCandidate(candidate)) {
            socket.emit('call-error', { message: 'Invalid ICE candidate data' });
            return;
        }

        // Get call data
        const callData = callManager.getCall(callId);
        if (!callData) {
            socket.emit('call-error', { message: 'Call not found' });
            return;
        }

        // Verify user is part of this call
        if (!callData.participants.includes(userId)) {
            socket.emit('call-error', { message: 'Not authorized for this call' });
            return;
        }

        // Store ICE candidate
        callManager.addIceCandidate(callId, socket.id, candidate);

        // Forward ICE candidate to other participants
        const otherParticipants = callData.participants.filter(id => id !== userId);
        otherParticipants.forEach(participantId => {
            emitToUser(participantId, 'ice-candidate', {
                callId,
                candidate,
                fromUserId: userId
            });
        });

        console.log(`ICE candidate exchanged for call ${callId} from user ${userId}`);

    } catch (error) {
        console.error('Error handling ICE candidate:', error);
        socket.emit('call-error', { message: error.message });
    }
}

/**
 * Handle call rejection
 * @param {Object} socket - Socket instance
 * @param {Object} data - Call rejection data
 */
export async function handleCallReject(socket, data) {
    try {
        const { callId, reason } = data;
        const userId = callManager.getUserFromSocket(socket.id);

        if (!userId) {
            socket.emit('call-error', { message: 'User not authenticated' });
            return;
        }

        // Get call data
        const callData = callManager.getCall(callId);
        if (!callData) {
            socket.emit('call-error', { message: 'Call not found' });
            return;
        }

        // Verify user is the callee
        if (callData.calleeId !== userId) {
            socket.emit('call-error', { message: 'Not authorized to reject this call' });
            return;
        }

        // Notify caller about rejection
        emitToUser(callData.callerId, 'call-rejected', {
            callId,
            reason: reason || 'Call rejected'
        });

        // End the call
        await callManager.endCall(callId, userId);

        // Confirm to rejector
        socket.emit('call-rejected', {
            callId,
            status: 'rejected'
        });

        console.log(`Call ${callId} rejected by user ${userId}`);

    } catch (error) {
        console.error('Error handling call rejection:', error);
        socket.emit('call-error', { message: error.message });
    }
}

/**
 * Handle call hangup
 * @param {Object} socket - Socket instance
 * @param {Object} data - Call hangup data
 */
export async function handleCallHangup(socket, data) {
    try {
        const { callId } = data;
        const userId = callManager.getUserFromSocket(socket.id);

        if (!userId) {
            socket.emit('call-error', { message: 'User not authenticated' });
            return;
        }

        // Get call data
        const callData = callManager.getCall(callId);
        if (!callData) {
            socket.emit('call-error', { message: 'Call not found' });
            return;
        }

        // Verify user is part of this call
        if (!callData.participants.includes(userId)) {
            socket.emit('call-error', { message: 'Not authorized for this call' });
            return;
        }

        // Notify other participants about hangup
        const otherParticipants = callData.participants.filter(id => id !== userId);
        otherParticipants.forEach(participantId => {
            emitToUser(participantId, 'call-ended', {
                callId,
                endedBy: userId
            });
        });

        // End the call
        await callManager.endCall(callId, userId);

        // Confirm to hanger
        socket.emit('call-ended', {
            callId,
            status: 'ended'
        });

        console.log(`Call ${callId} ended by user ${userId}`);

    } catch (error) {
        console.error('Error handling call hangup:', error);
        socket.emit('call-error', { message: error.message });
    }
}

/**
 * Handle call timeout (when callee doesn't answer)
 * @param {string} callId - ID of the call
 */
export async function handleCallTimeout(callId) {
    try {
        const callData = callManager.getCall(callId);
        if (!callData || callData.status !== 'ringing') {
            return;
        }

        // Notify caller about timeout
        emitToUser(callData.callerId, 'call-timeout', {
            callId,
            message: 'Call timed out - no answer'
        });

        // End the call
        await callManager.endCall(callId, callData.callerId);

        console.log(`Call ${callId} timed out`);

    } catch (error) {
        console.error('Error handling call timeout:', error);
    }
}

/**
 * Handle user call status update
 * @param {Object} socket - Socket instance
 * @param {Object} data - Status update data
 */
export async function handleCallStatusUpdate(socket, data) {
    try {
        const { status } = data;
        const userId = callManager.getUserFromSocket(socket.id);

        if (!userId) {
            socket.emit('call-error', { message: 'User not authenticated' });
            return;
        }

        if (!['available', 'busy', 'away'].includes(status)) {
            socket.emit('call-error', { message: 'Invalid status' });
            return;
        }

        // Update user status
        await User.findByIdAndUpdate(userId, { callStatus: status });

        // Broadcast status update to friends/contacts
        socket.broadcast.emit('user-call-status-updated', {
            userId,
            status
        });

        // Confirm to user
        socket.emit('call-status-updated', {
            status
        });

        console.log(`User ${userId} call status updated to ${status}`);

    } catch (error) {
        console.error('Error handling call status update:', error);
        socket.emit('call-error', { message: error.message });
    }
}

/**
 * Get user's current call status
 * @param {Object} socket - Socket instance
 */
export async function handleGetCallStatus(socket) {
    try {
        const userId = callManager.getUserFromSocket(socket.id);

        if (!userId) {
            socket.emit('call-error', { message: 'User not authenticated' });
            return;
        }

        const user = await User.findById(userId).select('callStatus currentCall');
        const currentCall = callManager.getCallByUser(userId);

        socket.emit('call-status', {
            callStatus: user.callStatus,
            currentCall: currentCall ? {
                callId: currentCall.callId,
                callType: currentCall.callType,
                status: currentCall.status,
                participants: currentCall.participants
            } : null
        });

    } catch (error) {
        console.error('Error getting call status:', error);
        socket.emit('call-error', { message: error.message });
    }
}

/**
 * Clean up user's call state on disconnect
 * @param {string} socketId - Socket ID
 */
export async function handleUserDisconnect(socketId) {
    try {
        const userId = callManager.getUserFromSocket(socketId);
        if (!userId) {
            return;
        }

        // Get user's current call
        const callData = callManager.getCallByUser(userId);
        if (callData) {
            // Notify other participants about disconnection
            const otherParticipants = callData.participants.filter(id => id !== userId);
            otherParticipants.forEach(participantId => {
                emitToUser(participantId, 'participant-disconnected', {
                    callId: callData.callId,
                    userId
                });
            });

            // End the call
            await callManager.endCall(callData.callId, userId);
        }

        // Clean up socket mapping
        callManager.removeSocketMapping(socketId);

        console.log(`User ${userId} disconnected, cleaned up call state`);

    } catch (error) {
        console.error('Error handling user disconnect:', error);
    }
}

