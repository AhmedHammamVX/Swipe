import { Component, output, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MessagesService } from '../../../../services/messages.service';
import { HotToastService } from '@ngxpert/hot-toast';
import { Message } from '../../../../models/message';

@Component({
  selector: 'app-typing',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './typing.component.html',
  styleUrl: './typing.component.css',
})
export class TypingComponent {
  Form!: FormGroup;
  selectedFile: File | null = null;
  base64Image = signal<string | null>(null);
  isSending = signal<boolean>(false);
  sentMessage = output<Message>();

  constructor(
    private _FormBuilder: FormBuilder,
    private messagesService: MessagesService,
    private toast: HotToastService
  ) {}

  chatFormValidation() {
    this.Form = this._FormBuilder.group({
      message: ['', [Validators.required]],
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];

      if (!this.selectedFile.type.startsWith('image/')) {
        this.toast.error('Please select an image file!');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.base64Image.set(reader.result as string);
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  sendMessage() {
    const selectedFriend = this.messagesService.getSFriend();
    if ((this.Form.valid || this.base64Image()) && selectedFriend) {
      const text = this.Form.controls['message'].value;
      this.isSending.set(true); //sending state
      this.messagesService
        .sendMessage(selectedFriend._id, { text, image: this.base64Image() })
        .subscribe({
          next: (message) => {
            if (this.base64Image()) {
              this.cancelImgSelection();
            }
            this.isSending.set(false);
            this.Form.reset();
            this.sentMessage.emit(message as Message);
            console.log(message);
          },
          error: (err) => {
            this.isSending.set(false);
            this.toast.error(
              err.error.message ||
                `Error ${err.status} – ${
                  err.statusText || 'Something went wrong'
                }`
            );
          },
        });
    }
  }

  cancelImgSelection() {
    this.base64Image.set(null);
    this.selectedFile = null;
  }

  ngOnInit() {
    this.chatFormValidation();
  }
}
