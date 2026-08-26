import { Component, computed, effect, signal } from '@angular/core';
import { User } from '../../../../models/user';
import { MessagesService } from '../../../../services/messages.service';
import { SocketService } from '../../../../services/socket.service';
import { FriendRequestService } from '../../../../services/friend-request.service';
import { HotToastService } from '@ngxpert/hot-toast';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [],
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.css'
})
export class ContactsComponent {
  usersList = signal<User[]>([]);
  friendsList = signal<User[]>([]);
  backupFList = signal<User[]>([]);

  constructor(private messagesService: MessagesService, private socketService: SocketService, private friendRService: FriendRequestService, private toast: HotToastService) {
    effect(() => {
      const IAcceptedR = this.socketService.IAcceptedR();
      if (IAcceptedR) {
        this.friendsList.update(friendsList => [IAcceptedR, ...friendsList]);
        this.backupFList.update(backupFList => [IAcceptedR, ...backupFList]);
      }
    }, { allowSignalWrites: true })

    effect(() => {
      const IRemovedF = this.socketService.IRemovedF();
      const IBlockF = this.socketService.IBlockF();
      console.log("closed");
      if (IRemovedF || IBlockF) {
        this.friendsList.update(friendsList => friendsList.filter((friend) => friend._id !== (IRemovedF || IBlockF)));
        this.backupFList.update(backupFList => backupFList.filter((friend) => friend._id !== (IRemovedF || IBlockF)));
        this.closeModal();
      }
    }, { allowSignalWrites: true })
  }

  selectFriend(friend: User) {
    this.messagesService.setSFriend(friend);
  }

  get onlineUsers() {
    return this.socketService.onlinUsers();
  }

  get selectedFriend() {
    return this.messagesService.getSFriend()
  }

  searchForNewFriend(searchTerm: string) {
    if (searchTerm.trim()) {
      this.friendRService.searchUsers(searchTerm).subscribe({
        next: (results) => { this.friendsList.set(results as User[]) },
        error: (err) => { console.log(err.error.message) }
      });
    } else {
      this.friendsList.set(this.backupFList());
    }
  }

  //check if this user is already one of my friends or not
  checkFriend(user: User) {
    const isFriend = this.backupFList().some(friend => friend._id === user._id);
    return isFriend;
  }

  sendFRequest(user: User) {
    this.friendRService.sendRequest(user._id).subscribe({
      next: (response) => { this.toast.success(response?.message) },
      error: (err) => { this.toast.error(err.error.message) }
    });
  }

  closeModal() {
    this.messagesService.setSFriend(null);
  }

  ngOnInit(): void {
    this.friendRService.getFriends().subscribe({
      next: (friends) => {
        this.friendsList.set(friends as User[]);
        this.backupFList.set(friends as User[])
      },
      error: (err) => { console.log(err.error.message) }
    });
  }
}

/* updatedFriendsList = computed(() => {
  const onlinUsers = this.socketService.onlinUsers();
  return this.friendsList().map(friend => ({
    ...friend,
    isOnline: onlinUsers.includes(friend._id)
  }))
}); */
