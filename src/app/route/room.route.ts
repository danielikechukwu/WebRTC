import { Routes } from '@angular/router';
import Layout from '../layout/layout';

const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', redirectTo: 'room', pathMatch: 'full' },
      { path: 'room', loadComponent: () => import('../room/room'), data: { title: 'Meeting Room' } },
    ],
  },
];

export default routes;
