import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { tap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { HotToastService } from '@ngxpert/hot-toast';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast =  inject(HotToastService);

  return auth.checkAuth().pipe(
    tap({
      next: () => { console.log("guard"); return true},
      error: () => { toast.error("Unauthorized!"); auth.setUser(null); return router.navigate(["/auth"])}
    })
  );
};
