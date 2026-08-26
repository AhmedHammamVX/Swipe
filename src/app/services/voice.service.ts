import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class VoiceService {
  private voiceUrl = `${environment.apiUrl}`;
  private recognition: any;
  isListening = signal<boolean>(false);

  constructor(private http: HttpClient) { }

  startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.isListening.set(true);
      const SpeechRecognition = (window as any).SpeechRecognition
        || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'en-US';
      this.recognition.interimResults = false;

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript); // e.g. "send hello to Alice"
      };
      this.recognition.onerror = reject;
      this.recognition.start();

      this.recognition.onend = () => {
        this.isListening.set(false);
        this.recognition.stop();
        console.log("stop1");
      };
    });
  }

  stop() {
    if (this.recognition) {
      this.recognition.stop();
      this.isListening.set(false);
      console.log("stop2");
    }
  }

  speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
  }

  async parseVoice(transcript:string): Promise<any> {
    const intent = await this.http.post(`${this.voiceUrl}/parse-voice`, { transcript }).toPromise() as any;
    return intent
  }
}
