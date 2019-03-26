import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { MatIconModule } from '@angular/material';
import { FormsModule } from '@angular/forms';
import { StorageServiceModule } from 'ngx-webstorage-service';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ProfileComponent } from './profile.component';
import { SelfieComponent } from './selfie.component';
import { ResetComponent } from './reset.component';
import { HomeComponent } from './home.component';
import { ItemComponent } from './item.component';
import { PostsComponent } from './posts.component';
import { PostspageComponent } from './postspage.component';
import { SyncService } from './sync.service';

@NgModule({
  declarations: [
    AppComponent,
    ProfileComponent,
    SelfieComponent,
    ResetComponent,
    HomeComponent,
    PostsComponent,
    PostspageComponent,
    ItemComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    MatIconModule,
    StorageServiceModule,
    AppRoutingModule
  ],
  providers: [
    {provide: DOCUMENT, useValue: document },
    { provide: 'Window', useValue: window }, 
    SyncService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
