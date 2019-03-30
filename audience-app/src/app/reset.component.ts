import { Component } from '@angular/core';
import { Router } from '@angular/router';
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
      private router: Router,
  ) {
  }
  onReset() {
    this.syncService.resetApp()
    this.isReset = true
    this.syncService.log('clearuserdata', undefined)
    this.router.navigate([`/home`])
  }
}
