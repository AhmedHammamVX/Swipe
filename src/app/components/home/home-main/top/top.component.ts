import { Component, effect, inject, output, ViewChild } from '@angular/core';
import { MessagesService } from '../../../../services/messages.service';
import { SocketService } from '../../../../services/socket.service';
import { User } from '../../../../models/user';
import { FriendRequestService } from '../../../../services/friend-request.service';
import { HotToastService } from '@ngxpert/hot-toast';
import { ConfirmationComponent } from "../../../shared/confirmation/confirmation.component";

@Component({
  selector: 'app-top',
  standalone: true,
  imports: [ConfirmationComponent],
  templateUrl: './top.component.html',
  styleUrl: './top.component.css'
})
export class TopComponent {
  call = output<'video' | 'audio'>();
  @ViewChild('confirmDialog') dialog!: ConfirmationComponent;

  constructor(private messagesService: MessagesService, private socketService: SocketService, private friendRService: FriendRequestService, private toast: HotToastService) {
    effect(() => {
      if (this.selectedFriend)
        this.friendRService.setFriendRequest(null);
    }, { allowSignalWrites: true });

    effect(() => {
      if (this.selectedFriendRequest)
        this.messagesService.setSFriend(null);
    }, { allowSignalWrites: true });
  }

  get selectedFriend() {
    return this.messagesService.getSFriend();
  }

  isOnline(): boolean {
    if (!this.selectedFriend) return false;
    return this.socketService.onlinUsers().includes(this.selectedFriend._id);
  }

  get selectedFriendRequest() {
    return this.friendRService.getFriendRequest();
  }

  closeModal() {
    this.messagesService.setSFriend(null);
  }

  /* startCall(type:'video'|'audio'){
    this.call.emit(type);
  } */

  async removeFriend() {
    if (this.selectedFriend && await this.openDialog()) {
      this.friendRService.removeFriend(this.selectedFriend._id).subscribe({
        next: (response) => { this.toast.success(response.message) },
        error: (err) => { this.toast.error(err.error.message) }
      });
    }
  }

  async blockFriend() {
    if (this.selectedFriend && await this.openDialog()) {
      this.friendRService.blockFriend(this.selectedFriend._id).subscribe({
        next: (response) => { this.toast.success(response.message) },
        error: (err) => { this.toast.error(err.error.message) }
      });
    }
  }

  async clearChat() {
    if (this.selectedFriend && await this.openDialog()) {
      this.messagesService.clearChat(this.selectedFriend._id).subscribe({
        next: (response) => { this.toast.success(response.message) },
        error: (err) => { this.toast.error(err.error.message) }
      });
    }
  }

  openDialog(): Promise<boolean> {
    return this.dialog.open();
  }

}
