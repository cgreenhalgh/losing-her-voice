import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ProfileComponent } from './profile.component';
import { SelfieComponent } from './selfie.component';
import { ResetComponent } from './reset.component';
import { HomeComponent } from './home.component';
import { ItemComponent } from './item.component';

const routes: Routes = [
  { path: 'profile', component: ProfileComponent },
  { path: 'selfie', component: SelfieComponent },
  { path: 'reset', component: ResetComponent },
  { path: 'home', component: HomeComponent },
  { path: '', component: HomeComponent },
  { path: ':id', component: ItemComponent },
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }