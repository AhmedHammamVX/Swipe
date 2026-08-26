import { Component, DestroyRef, signal } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import { User } from '../../../../models/user';
import { HotToastService } from '@ngxpert/hot-toast';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FriendRequestService } from '../../../../services/friend-request.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  selectedFile: File | null = null;
  base64Image = signal<string | null>(null);
  IsUploading = signal<boolean>(false);
  blockedFriendsList = signal<User[]>([]);

  constructor(private authService: AuthService, private toast: HotToastService, private readonly destroyRef:DestroyRef, private friendRService: FriendRequestService) { }

  get currentUser(): User | null | undefined {
    return this.authService.getUser();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];

      const reader = new FileReader();
      reader.onload = () => {
        this.base64Image.set(reader.result as string);
        this.updateProfileImage();
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  updateProfileImage() {
    if (!this.base64Image()) return;

    this.IsUploading.set(true);

    this.authService.updateProfile(this.base64Image()!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (user) => { this.authService.setUser(user as User); this.toast.success("Picture Uploaded!"); this.IsUploading.set(false) },
      error: (err) => { this.toast.error(err.error.message); this.IsUploading.set(false) }
    });
  }

  unblockFriend(friendId:string) {
    if (friendId) {
      this.friendRService.unblockFriend(friendId).subscribe({
        next: (response) => { this.removeUserFromBlockList(friendId); this.toast.success(response.message)},
        error: (err) => { this.toast.error(err.error.message) }
      });
    }
  }

  removeUserFromBlockList(userId:string){
    this.blockedFriendsList.update(blockedFriendsList => blockedFriendsList.filter((friend) => friend._id !== userId));
  }

  ngOnInit(): void {
    this.friendRService.getBlockedFriends().subscribe({
      next: (friends) => {
        this.blockedFriendsList.set(friends as User[]);
      },
      error: (err) => { console.log(err.error.message) }
    });
  }
}
