import { Component, effect, inject } from '@angular/core';
import { HomeNavigationComponent } from "./home-navigation/home-navigation.component";
import { HomeMainComponent } from "./home-main/home-main.component";
import { RouterModule } from '@angular/router';
import { MessagesService } from '../../services/messages.service';
import { VoiceService } from '../../services/voice.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HomeNavigationComponent, HomeMainComponent, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  private messagesService = inject(MessagesService);
  private voiceService = inject(VoiceService);
  isListening: boolean = false;
  isNoSpeech: boolean = false;

  constructor() {
    effect(() => {
      this.isListening = this.voiceService.isListening();
    })
  }

  get selectedFriend() {
    return this.messagesService.getSFriend();
  }

  async listen() {
    /* const text = await this.voiceService.startListening();
    console.log(text); */

    await this.voiceService.startListening().then(async (text) => {
      console.log(text);
      const intent  = await this.voiceService.parseVoice(text);
      console.log("intent",intent);
    }).catch((error) => {
      if (error.error === 'no-speech') {
        this.isNoSpeech = true;
        setTimeout(() => {
          this.isNoSpeech = false;
        }, 2000);
      }
    })
  }

}
