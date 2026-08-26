import { Component, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { HotToastService } from '@ngxpert/hot-toast';
import { Router } from '@angular/router';
import { User } from '../../../models/user';
import { SocketService } from '../../../services/socket.service';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.css'
})
export class SignUpComponent {
  Form!: FormGroup;
  openLoginPage = output();
  shownFields: Set<string> = new Set();/* shown errors or info */

  constructor(private _FormBuilder: FormBuilder, private authService: AuthService, private toast: HotToastService, private router:Router, private socketService:SocketService) { }

  FormValidation() {
    this.Form = this._FormBuilder.group(
      {
        fullName: ["", [Validators.required, Validators.minLength(6), Validators.maxLength(20), Validators.pattern(/^[A-Za-z]+\s[A-Za-z]+$/)]],
        email: ["", [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
        userName: ["", [Validators.required, Validators.minLength(5), Validators.maxLength(10), Validators.pattern(/^[_-\w\.\$@\*\!]*$/)]],/* , [customValidator.username(this.usernameVS)] */
        password: ["", [Validators.required, Validators.minLength(6), Validators.maxLength(20), Validators.pattern(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/)]],
      },
      { updateOn: 'blur' });/* change */
  }


  signup() {
    if (this.Form.valid) {
      console.log("signup");
      console.log(this.Form.value);
      this.authService.signup(this.Form.value).subscribe({
        next: (user:User) => {
          /* this.authService.setLoggedIn(true); */
          this.authService.setUser(user);
          this.toast.success("Successfully Signed-Up!");
          this.socketService.connect();
          this.router.navigate(['/home']);
          this.Form.reset();
          /* this.router.navigate(['/chat']); */
        },
        error: err => this.toast.error(err.error.message)
      });
    }
  }


  changeMainPosition() {
    this.openLoginPage.emit();
  }


  checkValidity(fieldName: string) {
    const control = this.Form.controls[fieldName];
    const isInvalid = control.invalid && (control.touched || control.dirty);

    if (isInvalid && !this.shownFields.has(fieldName)) {
      switch (fieldName) {
        case 'fullName':
          this.toast.info("FullName length 6 - 20 letters(including space)");
          break;
        case 'userName':
          this.toast.info("Username length 5 - 10 letters");
          break;
        case 'password':
          this.toast.info("Password atleast 6 letters, including 1 uppercase letter, 1 numeric digit and 1 special character");
          break;
      }
      this.shownFields.add(fieldName);
    }

    if (!isInvalid) {
      this.shownFields.delete(fieldName);
    }

    return isInvalid;
  }



  ngOnInit(): void {
    this.FormValidation();
  }
}

