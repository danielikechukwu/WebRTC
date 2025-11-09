import { Routes } from '@angular/router';
import Layout from '../layout/layout';
import { roomGuard } from '../guards/room-guard';

const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', redirectTo: 'room', pathMatch: 'full' },
      { path: 'room', loadComponent: () => import('../room/room'), data: { title: 'Meeting Room' }, canDeactivate: [roomGuard] },
    ],
  },
];

export default routes;
