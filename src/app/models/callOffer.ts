export interface CallOffer {
  callId: string;
  callerId: string;
  callType: 'audio' | 'video';
  offer: RTCSessionDescriptionInit;
  callerInfo: {
    userName: string;
    fullName: string;
  };
}