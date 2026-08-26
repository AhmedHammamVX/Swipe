import { Component, DestroyRef, TemplateRef, ViewChild } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { HotToastService } from '@ngxpert/hot-toast';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { User } from '../../../models/user';
import { SocketService } from '../../../services/socket.service';

@Component({
  selector: 'app-home-navigation',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './home-navigation.component.html',
  styleUrl: './home-navigation.component.css'
})
export class HomeNavigationComponent {

  constructor(private auth: AuthService, private toast: HotToastService, private readonly destroyRef: DestroyRef, private router: Router,private socketService:SocketService) { }

  get currentUser(): User | null | undefined {
    return this.auth.getUser();
  }

  exit() {
    this.auth.logout().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.auth.setUser(null);
        this.socketService.disconnect();
        this.router.navigate(["/auth"]);
      },
      error: err => this.toast.error(err.error.message)
    });
  }
}
