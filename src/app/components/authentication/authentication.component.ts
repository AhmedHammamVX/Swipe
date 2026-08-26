import { Component } from '@angular/core';
import { LoginComponent } from "./login/login.component";
import { SignUpComponent } from "./sign-up/sign-up.component";
import { HotToastService } from '@ngxpert/hot-toast';

@Component({
  selector: 'app-authentication',
  standalone: true,
  imports: [LoginComponent, SignUpComponent],
  templateUrl: './authentication.component.html',
  styleUrl: './authentication.component.css'
})
export class AuthenticationComponent {
  main_pos: string = 'left';

  constructor(private toast:HotToastService){}

  changeMainPosition(pos: string) {
    this.main_pos = pos;
  }
}
