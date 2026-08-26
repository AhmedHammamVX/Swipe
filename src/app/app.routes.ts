import { Routes } from '@angular/router';
import { AuthenticationComponent } from './components/authentication/authentication.component';
import { HomeComponent } from './components/home/home.component';
import { DiscussionsComponent } from './components/home/home-sidebar/discussions/discussions.component';
import { authGuard } from './guards/auth.guard';
import { ContactsComponent } from './components/home/home-sidebar/contacts/contacts.component';
import { SettingsComponent } from './components/home/home-sidebar/settings/settings.component';
import { NotificationsComponent } from './components/home/home-sidebar/notifications/notifications.component';

export const routes: Routes = [
    { path: '', redirectTo: '/auth', pathMatch: 'full' },
    { path: 'auth', component: AuthenticationComponent },
    {
        path: 'home', component: HomeComponent, children: [
            { path: '', redirectTo: 'chat', pathMatch: 'full' },
            { path: 'chat', component: DiscussionsComponent , canActivate:[authGuard]},
            { path: 'contacts', component: ContactsComponent},
            { path: 'notifications', component: NotificationsComponent},
            { path: 'settings', component: SettingsComponent},
        ]
    },
];
