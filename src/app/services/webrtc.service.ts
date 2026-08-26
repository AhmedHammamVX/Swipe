import { computed, effect, Injectable, signal } from '@angular/core';
import { CallStatus } from '../models/callStatus';
import { io, Socket } from 'socket.io-client';
import { CallOffer } from '../models/callOffer';
import { CallAnswer } from '../models/callAnswer';
import { IceCandidate } from '../models/iceCandidate';
import { environment } from '../../environments/environment.development';


@Injectable({
  providedIn: 'root'
})
export class WebrtcService {
  private socket!: Socket;
  private backendUrl = environment.backendUrl;
  private peerConnection: RTCPeerConnection | null = null;
  //private localStream: MediaStream | null = null;
  //private remoteStream: MediaStream | null = null;

  // Signals for reactive state management
  private _callStatus = signal<CallStatus | null>(null);
  private _incomingCall = signal<CallOffer | null>(null);
  private _localStream = signal<MediaStream | null>(null);
  private _remoteStream = signal<MediaStream | null>(null);
  private _isInCall = signal<boolean>(false);
  private _isVideoEnabled = signal<boolean>(true);
  private _isAudioEnabled = signal<boolean>(true);
  private _callError = signal<string | null>(null);

  // Computed signals
  public callStatus = computed(() => this._callStatus());
  public incomingCall = computed(() => this._incomingCall());
  public localStream = computed(() => this._localStream());
  public remoteStream = computed(() => this._remoteStream());
  public isInCall = computed(() => this._isInCall());
  public isVideoEnabled = computed(() => this._isVideoEnabled());
  public isAudioEnabled = computed(() => this._isAudioEnabled());
  public callError = computed(() => this._callError());

  // Computed for UI state
  public showIncomingCall = computed(() => this._incomingCall() !== null);
  public showCallInterface = computed(() => this._isInCall());
  public canStartCall = computed(() =>
    this._callStatus()?.callStatus === 'available' && !this._isInCall()
  );

  constructor() {
    this.initializeSocket();
    this.setupEffects();
  }

  private initializeSocket(): void {
    this.socket = io(environment.backendUrl, {
      query: {
        userId: localStorage.getItem('userId')
      }
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    // Incoming call
    this.socket.on('incoming-call', (data: CallOffer) => {
      this._incomingCall.set(data);
    });

    // Call answer received
    this.socket.on('call-answer', (data: CallAnswer) => {
      this.handleCallAnswer(data);
    });

    // ICE candidate received
    this.socket.on('ice-candidate', (data: IceCandidate) => {
      this.handleIceCandidate(data);
    });

    // Call rejected
    this.socket.on('call-rejected', (data: any) => {
      this.handleCallRejected(data);
    });

    // Call ended
    this.socket.on('call-ended', (data: any) => {
      this.handleCallEnded(data);
    });

    // Call timeout
    this.socket.on('call-timeout', (data: any) => {
      this.handleCallTimeout(data);
    });

    // Call status update
    this.socket.on('call-status', (data: CallStatus) => {
      this._callStatus.set(data);
    });

    // User call status updated
    this.socket.on('user-call-status-updated', (data: any) => {
      console.log('User call status updated:', data);
    });

    // Participant disconnected
    this.socket.on('participant-disconnected', (data: any) => {
      this.handleParticipantDisconnected(data);
    });

    // Call errors
    this.socket.on('call-error', (data: any) => {
      this._callError.set(data.message);
      console.error('Call error:', data);
    });
  }


  private setupEffects(): void {
    // Effect to handle call status changes
    effect(() => {
      const status = this._callStatus();
      if (status?.currentCall?.status === 'active') {
        this._isInCall.set(true);
      } else if (status?.currentCall?.status === 'ended') {
        this._isInCall.set(false);
      }
    });

    // Effect to handle call ended
    effect(() => {
      const callEnded = this._callStatus()?.currentCall?.status === 'ended';
      if (callEnded) {
        this.cleanup();
      }
    });
  }

  // ===== WebRTC Methods =====

  async startVideoCall(calleeId: string): Promise<void> {
    try {
      this._callError.set(null);
      await this.initializeLocalStream(true, true);
      await this.createPeerConnection();
      await this.createOffer(calleeId, 'video');
    } catch (error) {
      console.error('Error starting video call:', error);
      this._callError.set('Failed to start video call');
      throw error;
    }
  }

  async startAudioCall(calleeId: string): Promise<void> {
    try {
      this._callError.set(null);
      await this.initializeLocalStream(false, true);
      await this.createPeerConnection();
      await this.createOffer(calleeId, 'audio');
    } catch (error) {
      console.error('Error starting audio call:', error);
      this._callError.set('Failed to start audio call');
      throw error;
    }
  }

  private async initializeLocalStream(video: boolean, audio: boolean): Promise<void> {
    try {
      const constraints = {
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false,
        audio: audio
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this._localStream.set(stream);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error('Unable to access camera/microphone');
    }
  }

  private async createPeerConnection(): Promise<void> {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    const localStream = this._localStream();
    if (localStream) {
      localStream.getTracks().forEach((track: MediaStreamTrack) => {
        this.peerConnection!.addTrack(track, localStream);
      });
    }

    this.peerConnection.ontrack = (event) => {
      this._remoteStream.set(event.streams[0]);
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendIceCandidate(event.candidate);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
    };
  }

  private async createOffer(calleeId: string, callType: 'audio' | 'video'): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.socket.emit('call-offer', {
      calleeId,
      callType,
      offer
    });
  }

  async acceptCall(callOffer: CallOffer): Promise<void> {
    try {
      this._callError.set(null);
      await this.initializeLocalStream(
        callOffer.callType === 'video',
        true
      );
      await this.createPeerConnection();
      await this.createAnswer(callOffer);
      this._incomingCall.set(null);
    } catch (error) {
      console.error('Error accepting call:', error);
      this._callError.set('Failed to accept call');
      throw error;
    }
  }

  private async createAnswer(callOffer: CallOffer): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(callOffer.offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.socket.emit('call-answer', {
      callId: callOffer.callId,
      answer
    });
  }

  async rejectCall(callId: string, reason?: string): Promise<void> {
    this.socket.emit('call-reject', { callId, reason });
    this._incomingCall.set(null);
  }

  async endCall(callId: string): Promise<void> {
    this.socket.emit('call-hangup', { callId });
    this.cleanup();
  }

  private sendIceCandidate(candidate: RTCIceCandidate): void {
    const callId = this.getCurrentCallId();
    if (callId) {
      this.socket.emit('ice-candidate', {
        callId,
        candidate
      });
    }
  }

  private handleCallAnswer(data: CallAnswer): void {
    if (this.peerConnection) {
      this.peerConnection.setRemoteDescription(data.answer);
    }
  }

  private handleIceCandidate(data: IceCandidate): void {
    if (this.peerConnection) {
      this.peerConnection.addIceCandidate(data.candidate);
    }
  }

  private handleCallRejected(data: any): void {
    console.log('Call rejected:', data);
    this.cleanup();
  }

  private handleCallEnded(data: any): void {
    console.log('Call ended:', data);
    this._isInCall.set(false);
    this.cleanup();
  }

  private handleCallTimeout(data: any): void {
    console.log('Call timeout:', data);
    this.cleanup();
  }

  private handleParticipantDisconnected(data: any): void {
    console.log('Participant disconnected:', data);
    this.cleanup();
  }

  private cleanup(): void {
    const localStream = this._localStream();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      this._localStream.set(null);
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this._remoteStream.set(null);
    this._incomingCall.set(null);
    this._isInCall.set(false);
  }

  private getCurrentCallId(): string | null {
    return this._callStatus()?.currentCall?.callId || null;
  }

  // ===== Call Status Methods =====

  updateCallStatus(status: 'available' | 'busy' | 'away'): void {
    this.socket.emit('update-call-status', { status });
  }

  getCallStatus(): void {
    this.socket.emit('get-call-status');
  }

  // ===== Media Controls =====

  toggleVideo(): void {
    const localStream = this._localStream();
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this._isVideoEnabled.set(videoTrack.enabled);
      }
    }
  }

  toggleAudio(): void {
    const localStream = this._localStream();
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this._isAudioEnabled.set(audioTrack.enabled);
      }
    }
  }

  // ===== Utility Methods =====

  isVideoCall(): boolean {
    return (this._localStream()?.getVideoTracks().length ?? 0) > 0;
  }

  clearError(): void {
    this._callError.set(null);
  }

  disconnect(): void {
    this.cleanup();
    if (this.socket) {
      this.socket.disconnect();
    }
  }

}
