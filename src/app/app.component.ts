import { Component, DestroyRef } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SocketService } from './services/socket.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'chat-app';

  constructor(private auth:AuthService, private router:Router,private readonly destroyRef:DestroyRef, private socketService:SocketService){}

  ngOnInit() {
    this.auth.checkAuth().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: user => {this.auth.setUser(user); this.socketService.connect(); console.log("Reresh!")},
      error: () => {
        this.auth.setUser(null);
        //you should delete the token - internet disconnected state
        this.router.navigate(["/auth"]);
      }
    });
  }
}
