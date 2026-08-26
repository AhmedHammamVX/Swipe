export interface IceCandidate {
  callId: string;
  candidate: RTCIceCandidateInit;
  fromUserId: string;
}