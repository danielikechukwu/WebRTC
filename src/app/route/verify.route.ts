import { Route, Routes } from "@angular/router";

const routes: Routes = [
    { path: '', redirectTo: 'verify', pathMatch: 'full' },
    { path: 'verify', loadComponent: () => import('../verify-user/verify-user') }
]

export default routes