import { effect, Injectable, signal } from '@angular/core';
import { HotToastService } from '@ngxpert/hot-toast';
import { MessagesService } from './messages.service';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  MessageNStatus = signal<'ON'|"OFF">("ON")

  constructor(private toast: HotToastService) { }
  

  MessageN(){
    this.playMessageNSound();
    this.toast.show('You have a new message!',
      {
        icon: '🗨️',
        position: 'bottom-right',
        dismissible:true,
        theme: 'snackbar'
      }
    );
  }

  private playMessageNSound() {
    let audio = new Audio('assets/sound/notification_simple-02.wav');
    audio.play().catch(error => {
      console.warn('Sound play failed:', error);
    });
  }

  friendRN(name:string){
    this.playfriendRNSound();
    this.toast.show(`${name} wants to connect with you!`,
      {
        icon: '👋',
        position: 'bottom-right',
        dismissible:true,
        theme: 'snackbar'
      }
    );
  }

  acceptedFRN(name:string){
    this.playfriendRNSound();
    this.toast.show(`${name} accepted your friend request!`,
      {
        icon: '👋',
        position: 'bottom-right',
        dismissible:true,
        theme: 'snackbar'
      }
    );
  }

  private playfriendRNSound() {
    let audio = new Audio('assets/sound/notification_high-intensity.wav');
    audio.play().catch(error => {
      console.warn('Sound play failed:', error);
    });
  }
}
