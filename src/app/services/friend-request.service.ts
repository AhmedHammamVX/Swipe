import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Observable } from 'rxjs';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class FriendRequestService {
  private baseUrl = `${environment.apiUrl}/friends`;
  private friendRequest = signal<User | null>(null);
  /* friendRequestStatus = signal<"Remove"|null>(null); */
  private _trigger = signal<{ action: 'Remove' | 'Accept'; request: User | null } | null>(null);
  friendRequestTrigger = this._trigger.asReadonly(); // Read-only signal for consumers

  constructor(private http: HttpClient) { }

  sendRequest(toUserId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/request`, { toUserId });
  }

  acceptRequest(fromUserId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/accept`, { fromUserId });
  }

  rejectRequest(fromUserId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/reject`, { fromUserId });
  }

  getRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/requests`);
  }

  setFriendRequest(request: User | null) {
    this.friendRequest.set(request);
  }

  getFriendRequest(): User | null {
    return this.friendRequest();
  }

  // Trigger function
  trigger(action: 'Remove' | 'Accept', request: User | null) {
    this._trigger.set({ action, request });
  }

  // Reset function (optional)
  resetTrigger() {
    this._trigger.set(null);
  }

  searchUsers(query: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/search?query=${encodeURIComponent(query)}`);
  }

  getFriends(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/friends`);
  }

  removeFriend(friendId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/remove/${friendId}`);
  }

  blockFriend(friendId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/block`, { userId: friendId });
  }

  unblockFriend(friendId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/unblock`, { userId: friendId });
  }

  getBlockedFriends(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/blocked`);
  }
}
