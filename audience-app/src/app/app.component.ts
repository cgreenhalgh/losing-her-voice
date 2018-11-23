import { Component } from '@angular/core';

import { SyncService } from './sync.service';
import { CurrentState, Configuration, MenuItem, View } from './types';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  loading:boolean = true
  currentState:CurrentState = null
  menuItems:MenuItem[]
  views:View[]

  constructor(
    private syncService:SyncService,
  ) 
  {
    syncService.getConfiguration().subscribe((configuration) => {
      if (!configuration)
        return
      this.menuItems = configuration.menuItems
      this.views = configuration.views
    })
    syncService.getCurrentState().subscribe((newState) => {
      console.log('home update current state', newState)
      this.currentState = newState
      this.loading = !this.currentState
    })
  }
}
