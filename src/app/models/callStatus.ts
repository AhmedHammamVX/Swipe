export interface CallStatus {
  callStatus: 'available' | 'busy' | 'away';
  currentCall: {
    callId: string;
    callType: 'audio' | 'video';
    status: 'ringing' | 'active' | 'ended';
    participants: string[];
  } | null;
}