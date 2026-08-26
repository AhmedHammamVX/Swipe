import { Component, effect, ElementRef, input, signal, ViewChild } from '@angular/core';
import { MessagesService } from '../../../../services/messages.service';
import { Message } from '../../../../models/message';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../../services/auth.service';
import { SocketService } from '../../../../services/socket.service';
import { FriendRequestService } from '../../../../services/friend-request.service';
import { HotToastService } from '@ngxpert/hot-toast';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent {
  allMessages = signal<Message[]>([]);
  sentMessage = input<Message | null>();
  @ViewChild('lastMessage') lastMessageEl?: ElementRef;

  constructor(private messagesService: MessagesService, private authService: AuthService, private socketService: SocketService, private friendRService: FriendRequestService, private toast: HotToastService) {
    effect(() => {
      if (this.selectedFriend) {
        this.getMessages(this.selectedFriend._id);
      } else {
        // to make the chat empty if there is no friend selected
        this.allMessages.set([]);
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const receivedMessage = this.sentMessage();
      if (receivedMessage) {
        this.allMessages.update(messages => [...messages, receivedMessage]);
        this.scrollToBottom();
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const IMessage = this.socketService.IMessage();
      if (IMessage && (this.selectedFriend?._id === IMessage.senderId)) {
        this.allMessages.update(messages => [...messages, IMessage]);
        this.scrollToBottom();
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const IClearedC = this.socketService.IClearedC();
      if (this.selectedFriend && IClearedC === this.selectedFriend._id) {
        this.allMessages.set([]);
      }
    }, { allowSignalWrites: true })
  }

  getMessages(userId: string) {
    this.messagesService.getMessages(userId).subscribe({
      next: (messages) => { this.allMessages.set(messages); this.scrollToBottom(); },
      error: (err) => { console.log(err.error.message) }
    });
  }

  get currentUser() {
    return this.authService.getUser();
  }

  scrollToBottom(): void {
    setTimeout(() => {
      this.lastMessageEl?.nativeElement.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  }

  get selectedFriend() {
    return this.messagesService.getSFriend();
  }

  get selectedFriendRequest() {
    return this.friendRService.getFriendRequest();
  }

  acceptFriendRequest() {
    if (this.selectedFriendRequest) {
      this.friendRService.acceptRequest(this.selectedFriendRequest._id).subscribe({
        next: (response) => { this.toast.success(response.message); this.friendRService.trigger("Remove", this.selectedFriendRequest) },
        error: (err) => { this.toast.error(err.error.message) }
      });
    }
  }

  rejectFriendRequest() {
    if (this.selectedFriendRequest) {
      this.friendRService.rejectRequest(this.selectedFriendRequest._id).subscribe({
        next: (response) => { this.toast.success(response.message); this.friendRService.trigger("Remove", this.selectedFriendRequest) },
        error: (err) => { this.toast.error(err.error.message) }
      });
    }
  }


  ngOnDestroy() {
    this.socketService.offIMessage();
  }
}