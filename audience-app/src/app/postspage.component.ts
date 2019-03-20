import { Component } from '@angular/core';

import { SyncService } from './sync.service';

@Component({
  selector: 'postspage',
  templateUrl: './postspage.component.html',
  styleUrls: ['./postspage.component.css']
})
export class PostspageComponent {
  profileName:string
  editProfile:boolean

  constructor(
      private syncService:SyncService,
  ) 
  {
    syncService.getNameObservable().subscribe((name) => {
      this.profileName = name
    })
  }
  onToggleEditProfile() :void {
    this.editProfile = !this.editProfile
  }
}