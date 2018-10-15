import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LiveComponent } from './live.component';

const routes: Routes = [
  { path: '', redirectTo: '/live', pathMatch: 'full' },
  { path: 'live',  component: LiveComponent },
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}

