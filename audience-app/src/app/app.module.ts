import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatIconModule } from '@angular/material';

import { AppComponent } from './app.component';
import { SyncService } from './sync.service';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    MatIconModule
  ],
  providers: [{provide: DOCUMENT, useValue: document }, SyncService],
  bootstrap: [AppComponent]
})
export class AppModule { }
