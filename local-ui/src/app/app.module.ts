import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { AppComponent } from './app.component';
import { LiveComponent } from './live.component';
import { ModerateComponent } from './moderate.component';
import { ItemComponent } from './item.component';
import { SelfieImageComponent } from './selfieImage.component'
import { ControlComponent } from './control.component';
import { AppRoutingModule } from './app-routing.module';
import { StoreService } from './store.service';

@NgModule({
  declarations: [
    AppComponent,
    LiveComponent,
    ModerateComponent,
    ItemComponent,
    SelfieImageComponent,
    ControlComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [
    {provide: DOCUMENT, useValue: document }, 
    StoreService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
