import { Component } from '@angular/core';

import { SyncService } from '../sync.service';
import { CurrentState, Configuration, MenuItem, View } from '../types';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
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
