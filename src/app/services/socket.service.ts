import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment.development';
import { AuthService } from './auth.service';
import { MessagesService } from './messages.service';
import { Observable } from 'rxjs';
import { Message } from '../models/message';
import { NotificationService } from './notification.service';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket!: Socket;
  private backendUrl = environment.backendUrl;
  onlinUsers = signal<string[]>([]);
  IMessage = signal<Message | null>(null);
  IReceivedR = signal<User | null>(null);
  IAcceptedR = signal<User | null>(null);
  IRemovedF = signal<string | null>(null);
  IBlockF = signal<string | null>(null);
  IClearedC = signal<string | null>(null);

  constructor(private authService: AuthService, private messagesService: MessagesService, private notificationService:NotificationService) { }

  connect(): void {
    if (!this.authService.getUser() || this.socket?.connected)
      return

    console.log("connect");
    this.socket = io(this.backendUrl, {
      query: {
        userId: this.authService.getUser()?._id
      }
    });

    this.socket.on("getOnlineUsers", (userIds) => {
      this.onlinUsers.set(userIds);
      console.log("online users:", this.onlinUsers());
    });

    this.socket.on('IMessage', (message:Message) => {
      if(this.messagesService.getSFriend()?._id !== message.senderId)
        this.notificationService.MessageN();
      this.IMessage.set(message);
    });

    this.socket.on('friendRequestReceived', (request) => {
      const receivedR = request.fromUser as User;
      this.IReceivedR.set(receivedR);
      this.notificationService.friendRN(receivedR.fullName);
    });

    this.socket.on('friendRequestAccepted', (request) => {
      const acceptedR = request.user as User;
      this.IAcceptedR.set(acceptedR);
      this.notificationService.acceptedFRN(acceptedR.fullName);
    });

    this.socket.on('friendRemoved', (request) => {
      console.log("removed",request);
      const removedF = request.friendId;
      this.IRemovedF.set(null);
      this.IRemovedF.set(removedF);
    });
    
    this.socket.on('blockedUser', (request) => {
      console.log("blocked",request);
      const blockedF = request.userId;
      this.IBlockF.set(null);
      this.IBlockF.set(blockedF);
    });

    this.socket.on('chatCleared', (request) => {
      console.log("cleared",request);
      const clearedC = request.friendId;
      this.IClearedC.set(null);
      this.IClearedC.set(clearedC);
    });
  }


  disconnect(): void {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
  }

  offIMessage(){
    if(this.socket)
      this.socket.off("IMessage");
  }
}
