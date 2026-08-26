/**
 * Call Manager - Handles WebRTC call sessions and room management
 * Manages call state, participant tracking, and call lifecycle
 */

import { v4 as uuidv4 } from 'uuid';
import User from '../models/user.model.js';

class CallManager {
    constructor() {
        // Active call sessions: callId -> callData
        this.activeCalls = new Map();
        
        // User to call mapping: userId -> callId
        this.userToCall = new Map();
        
        // Socket to user mapping: socketId -> userId
        this.socketToUser = new Map();
    }

    /**
     * Create a new call session
     * @param {string} callerId - ID of the user initiating the call
     * @param {string} calleeId - ID of the user being called
     * @param {string} callType - 'audio' or 'video'
     * @returns {Object} Call session data
     */
    async createCall(callerId, calleeId, callType) {
        try {
            // Check if either user is already in a call
            if (this.userToCall.has(callerId) || this.userToCall.has(calleeId)) {
                throw new Error('One or both users are already in a call');
            }

            // Verify users exist and are available
            const [caller, callee] = await Promise.all([
                User.findById(callerId),
                User.findById(calleeId)
            ]);

            if (!caller || !callee) {
                throw new Error('User not found');
            }

            if (caller.callStatus === 'busy' || callee.callStatus === 'busy') {
                throw new Error('User is busy and cannot receive calls');
            }

            const callId = uuidv4();
            const callData = {
                callId,
                callType,
                callerId,
                calleeId,
                participants: [callerId, calleeId],
                status: 'ringing',
                startTime: new Date(),
                endTime: null,
                offer: null,
                answer: null,
                iceCandidates: new Map() // socketId -> [candidates]
            };

            // Store call data
            this.activeCalls.set(callId, callData);
            this.userToCall.set(callerId, callId);
            this.userToCall.set(calleeId, callId);

            // Update user call status
            await Promise.all([
                User.findByIdAndUpdate(callerId, { 
                    callStatus: 'busy',
                    'currentCall.callId': callId,
                    'currentCall.callType': callType,
                    'currentCall.participants': [callerId, calleeId]
                }),
                User.findByIdAndUpdate(calleeId, { 
                    callStatus: 'busy',
                    'currentCall.callId': callId,
                    'currentCall.callType': callType,
                    'currentCall.participants': [callerId, calleeId]
                })
            ]);

            return callData;
        } catch (error) {
            console.error('Error creating call:', error);
            throw error;
        }
    }

    /**
     * Join an existing call (for group calls in the future)
     * @param {string} callId - ID of the call to join
     * @param {string} userId - ID of the user joining
     * @returns {Object} Call session data
     */
    async joinCall(callId, userId) {
        const callData = this.activeCalls.get(callId);
        if (!callData) {
            throw new Error('Call not found');
        }

        if (callData.participants.includes(userId)) {
            throw new Error('User already in call');
        }

        // Add user to call
        callData.participants.push(userId);
        this.userToCall.set(userId, callId);

        // Update user status
        await User.findByIdAndUpdate(userId, {
            callStatus: 'busy',
            'currentCall.callId': callId,
            'currentCall.callType': callData.callType,
            'currentCall.participants': callData.participants
        });

        return callData;
    }

    /**
     * End a call session
     * @param {string} callId - ID of the call to end
     * @param {string} userId - ID of the user ending the call
     */
    async endCall(callId, userId) {
        const callData = this.activeCalls.get(callId);
        if (!callData) {
            throw new Error('Call not found');
        }

        if (!callData.participants.includes(userId)) {
            throw new Error('User not in this call');
        }

        // Update call status
        callData.status = 'ended';
        callData.endTime = new Date();

        // Clear user call status for all participants
        const updatePromises = callData.participants.map(participantId => 
            User.findByIdAndUpdate(participantId, {
                callStatus: 'available',
                'currentCall.callId': null,
                'currentCall.callType': null,
                'currentCall.participants': []
            })
        );

        await Promise.all(updatePromises);

        // Clean up mappings
        callData.participants.forEach(participantId => {
            this.userToCall.delete(participantId);
        });
        this.activeCalls.delete(callId);

        return callData;
    }

    /**
     * Get call data by ID
     * @param {string} callId - ID of the call
     * @returns {Object|null} Call data or null if not found
     */
    getCall(callId) {
        return this.activeCalls.get(callId) || null;
    }

    /**
     * Get call data by user ID
     * @param {string} userId - ID of the user
     * @returns {Object|null} Call data or null if user not in call
     */
    getCallByUser(userId) {
        const callId = this.userToCall.get(userId);
        return callId ? this.activeCalls.get(callId) : null;
    }

    /**
     * Update call status
     * @param {string} callId - ID of the call
     * @param {string} status - New status ('ringing', 'active', 'ended')
     */
    updateCallStatus(callId, status) {
        const callData = this.activeCalls.get(callId);
        if (callData) {
            callData.status = status;
        }
    }

    /**
     * Store WebRTC offer
     * @param {string} callId - ID of the call
     * @param {Object} offer - WebRTC offer
     */
    storeOffer(callId, offer) {
        const callData = this.activeCalls.get(callId);
        if (callData) {
            callData.offer = offer;
        }
    }

    /**
     * Store WebRTC answer
     * @param {string} callId - ID of the call
     * @param {Object} answer - WebRTC answer
     */
    storeAnswer(callId, answer) {
        const callData = this.activeCalls.get(callId);
        if (callData) {
            callData.answer = answer;
        }
    }

    /**
     * Add ICE candidate for a socket
     * @param {string} callId - ID of the call
     * @param {string} socketId - Socket ID
     * @param {Object} candidate - ICE candidate
     */
    addIceCandidate(callId, socketId, candidate) {
        const callData = this.activeCalls.get(callId);
        if (callData) {
            if (!callData.iceCandidates.has(socketId)) {
                callData.iceCandidates.set(socketId, []);
            }
            callData.iceCandidates.get(socketId).push(candidate);
        }
    }

    /**
     * Get ICE candidates for a socket
     * @param {string} callId - ID of the call
     * @param {string} socketId - Socket ID
     * @returns {Array} Array of ICE candidates
     */
    getIceCandidates(callId, socketId) {
        const callData = this.activeCalls.get(callId);
        return callData ? (callData.iceCandidates.get(socketId) || []) : [];
    }

    /**
     * Map socket to user
     * @param {string} socketId - Socket ID
     * @param {string} userId - User ID
     */
    mapSocketToUser(socketId, userId) {
        this.socketToUser.set(socketId, userId);
    }

    /**
     * Get user ID from socket ID
     * @param {string} socketId - Socket ID
     * @returns {string|null} User ID or null if not found
     */
    getUserFromSocket(socketId) {
        return this.socketToUser.get(socketId) || null;
    }

    /**
     * Remove socket mapping
     * @param {string} socketId - Socket ID
     */
    removeSocketMapping(socketId) {
        this.socketToUser.delete(socketId);
    }

    /**
     * Get all active calls (for debugging/admin purposes)
     * @returns {Array} Array of active call data
     */
    getActiveCalls() {
        return Array.from(this.activeCalls.values());
    }

    /**
     * Clean up orphaned calls (calls without active participants)
     */
    async cleanupOrphanedCalls() {
        const orphanedCalls = [];
        
        for (const [callId, callData] of this.activeCalls) {
            const hasActiveParticipants = callData.participants.some(participantId => 
                this.userToCall.has(participantId)
            );
            
            if (!hasActiveParticipants) {
                orphanedCalls.push(callId);
            }
        }

        // Clean up orphaned calls
        for (const callId of orphanedCalls) {
            await this.endCall(callId, callData.participants[0]);
        }

        return orphanedCalls.length;
    }
}

// Create singleton instance
const callManager = new CallManager();

export default callManager;

