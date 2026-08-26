import { Component, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HotToastService } from '@ngxpert/hot-toast';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { User } from '../../../models/user';
import { SocketService } from '../../../services/socket.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  Form!: FormGroup;
  /*   main_pos = signal<string>('left'); */
  openSingupPage = output();

  constructor(private _FormBuilder: FormBuilder, private toast: HotToastService, private authService: AuthService, private router:Router, private socketService:SocketService) { }


  loginFormValidation() {
    this.Form = this._FormBuilder.group({
      email: ["", [Validators.required]],
      password: ["", [Validators.required]]
    })
  }

  changeMainPosition() {
    this.openSingupPage.emit();
  }


  login() {
    if (this.Form.valid) {
      this.authService.login(this.Form.value).subscribe({
        next: (user:User) => {
          /* this.authService.setLoggedIn(true); */
          this.authService.setUser(user);
          this.toast.success("Successfully Loged-In!");
          this.socketService.connect();
          this.router.navigate(['/home']);
          this.Form.reset();
        },
        error: err => this.toast.error(err.error.message)
      });
    }else{
      this.toast.error("All Fields Are Required!");
    }
  }


  ngOnInit() {
    this.loginFormValidation();
  }
}
