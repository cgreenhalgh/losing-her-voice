import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LiveComponent } from './live.component';
import { ControlComponent } from './control.component';
import { ModerateComponent } from './moderate.component';

const routes: Routes = [
  { path: '', redirectTo: '/live', pathMatch: 'full' },
  { path: 'live',  component: LiveComponent },
  { path: 'control',  component: ControlComponent },
  { path: 'moderate',  component: ModerateComponent },
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}

