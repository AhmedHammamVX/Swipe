import { Component } from '@angular/core';
import { MessagesService } from '../../../../services/messages.service';

@Component({
  selector: 'app-call',
  standalone: true,
  imports: [],
  templateUrl: './call.component.html',
  styleUrl: './call.component.css'
})
export class CallComponent {

  constructor(private messagesService:MessagesService){}

  get selectedFriend(){
    return this.messagesService.getSFriend();
  }
}
