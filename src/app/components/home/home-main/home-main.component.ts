import { Component, inject, signal } from '@angular/core';
import { TopComponent } from "./top/top.component";
import { ChatComponent } from "./chat/chat.component";
import { TypingComponent } from "./typing/typing.component";
import { Message } from '../../../models/message';
import { MessagesService } from '../../../services/messages.service';
import { FriendRequestService } from '../../../services/friend-request.service';
import { CallComponent } from "./call/call.component";

@Component({
  selector: 'app-home-main',
  standalone: true,
  imports: [TopComponent, ChatComponent, TypingComponent, CallComponent],
  templateUrl: './home-main.component.html',
  styleUrl: './home-main.component.css'
})
export class HomeMainComponent {

  isChatSelected:boolean = true;
  sentMessage = signal<Message|null>(null);
  call = signal<'video'|'audio'|null>(null);
  private messageService = inject(MessagesService);
  private friendRService = inject(FriendRequestService);
  
  // message from typing component
  onMessageFromTypingC(message: Message) {
    this.sentMessage.set(message);
  }

  get selectedFriend(){
    return this.messageService.getSFriend();
  }

  get selectedFriendRequest(){
    return this.friendRService.getFriendRequest();
  }

  startCall(type:'video'|'audio'){
    this.call.set(type);
  }

}
