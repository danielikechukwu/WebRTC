import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', redirectTo: 'verify', pathMatch: 'full' },
    { path: 'verify', loadChildren: () => import('./route/verify.route') },
    { path: 'app', loadChildren: () => import('./route/room.route') }
];
