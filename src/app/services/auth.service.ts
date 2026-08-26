import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authUrl = `${environment.apiUrl}/auth`;
  private loggedIn = signal<boolean>(false);
  private currentUser = signal<User | null | undefined>(undefined);

  constructor(private http: HttpClient) { }

  login(data: any): Observable<any> {
    return this.http.post(`${this.authUrl}/login`, data);
  }

  signup(data: any): Observable<any> {
    return this.http.post(`${this.authUrl}/signup`, data);
  }

  logout(): Observable<any> {
    return this.http.post(`${this.authUrl}/logout`, {});
  }

  checkAuth(): Observable<any> {
    return this.http.get(`${this.authUrl}/check`);
  }

  setLoggedIn(value: boolean) {
    this.loggedIn.set(value);
  }

  isLoggedIn() {
    return this.loggedIn();
  }

  setUser(user:User|null){
    this.currentUser.set(user);
  }

  getUser(){
    return this.currentUser();
  }

  updateProfile(base64Image:string){
    return this.http.put(`${this.authUrl}/update-profile`, {profilePic:base64Image});
  }
}
