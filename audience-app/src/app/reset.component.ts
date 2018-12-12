import { Component } from '@angular/core';
import { SyncService } from './sync.service';
import { NamePart } from './types';

@Component({
  selector: 'reset-view',
  templateUrl: './reset.component.html',
  styleUrls: ['./reset.component.css']
})
export class ResetComponent {
  isReset:boolean = false
  constructor(
      private syncService:SyncService,
  ) {
  }
  onReset() {
    this.syncService.resetApp()
    this.isReset = true
  }
}
