import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatIconModule } from '@angular/material';
import { FormsModule } from '@angular/forms';
import { StorageServiceModule } from 'ngx-webstorage-service';

import { AppComponent } from './app.component';
import { ProfileComponent } from './profile.component';
import { SelfieComponent } from './selfie.component';
import { SyncService } from './sync.service';

@NgModule({
  declarations: [
    AppComponent,
    ProfileComponent,
    SelfieComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    MatIconModule,
    StorageServiceModule
  ],
  providers: [{provide: DOCUMENT, useValue: document }, SyncService],
  bootstrap: [AppComponent]
})
export class AppModule { }
