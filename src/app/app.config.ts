import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHotToastConfig } from '@ngxpert/hot-toast';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes),importProvidersFrom(BrowserAnimationsModule),provideHotToastConfig({
    duration: 4000, // Optional settings
    position: 'top-center',
  }),provideHttpClient(withInterceptors([authInterceptor]))]
};
