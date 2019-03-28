import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ProfileComponent } from './profile.component';
import { SelfieComponent } from './selfie.component';
import { ResetComponent } from './reset.component';
import { HomeComponent } from './home.component';
import { ItemComponent } from './item.component';
import { PostspageComponent } from './postspage.component';
import { PageNotFoundComponent } from './pagenotfound.component';

const routes: Routes = [
  { path: ':perf/profile', component: ProfileComponent },
  { path: ':perf/selfie', component: SelfieComponent },
  { path: ':perf/reset', component: ResetComponent },
  { path: ':perf/home', component: HomeComponent },
  { path: ':perf/posts', component: PostspageComponent },
  { path: ':perf/', component: HomeComponent },
  { path: ':perf/:id', component: ItemComponent },
  { path: '**', component: PageNotFoundComponent },
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }