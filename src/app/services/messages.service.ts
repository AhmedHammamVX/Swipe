import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user';
import { Observable } from 'rxjs';
import { Message } from '../models/message';

@Injectable({
  providedIn: 'root'
})
export class MessagesService {
  private messagesUrl = `${environment.apiUrl}/messages`;
  private selectedFriend = signal<User | null>(null);

  constructor(private http: HttpClient) { }

  getUsers(){
    return this.http.get(`${this.messagesUrl}/users`);
  }

  getMessages(userId: string):Observable<Message[]> {
    return this.http.get<Message[]>(`${this.messagesUrl}/${userId}`);
  }

  sendMessage(userId: string, data: any) {
    return this.http.post(`${this.messagesUrl}/send/${userId}`, data);
  }

  setSFriend(friend:User|null){
    this.selectedFriend.set(friend);
  }

  getSFriend(){
    return this.selectedFriend();
  }

  clearChat(friendId:string): Observable<any>{
    return this.http.delete(`${this.messagesUrl}/clear/${friendId}`);
  }

}
