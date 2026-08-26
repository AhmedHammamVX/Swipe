import { Component, effect, signal } from '@angular/core';
import { FriendRequestService } from '../../../../services/friend-request.service';
import { User } from '../../../../models/user';
import { SocketService } from '../../../../services/socket.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent {
  myRequests = signal<User[]>([]);

  constructor(private friendRService: FriendRequestService, private socketService:SocketService) {
    console.log(this.myRequests());
    effect(()=>{
      console.log("Remove");
      const triggerData = this.friendRService.friendRequestTrigger();
      if (!triggerData) return;

      const { action, request } = triggerData;

      if (action === 'Remove' && request) {
        this.myRequests.update(list => list.filter(f => f._id !== request._id));
      }

      /* this.friendRService.resetTrigger(); */
      this.friendRService.setFriendRequest(null);
      this.socketService.IReceivedR.set(null);
    },{allowSignalWrites:true});

    effect(() => {
      const IRequest = this.socketService.IReceivedR();
      if (IRequest) {
        //this.myRequests.set([IRequest]);
        this.myRequests.update(myRequests => [IRequest,...myRequests]);
      }
    }, { allowSignalWrites: true })
  }

  selectRequest(request:User){
    this.friendRService.setFriendRequest(request);
  }


  ngOnInit(): void {
    this.friendRService.getRequests().subscribe({
      next: (Requests) => {this.myRequests.set(Requests)},
      error: (err) => { console.log(err.error.message)}
    });
  }
}
