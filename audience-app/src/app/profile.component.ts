import { Component, Output, EventEmitter } from '@angular/core';
import { SyncService } from './sync.service';
import { NamePart } from './types';

@Component({
  selector: 'profile-view',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {
    @Output () fullNameSet: EventEmitter<string> = new EventEmitter()
    nameParts:NamePart[] = []
    
    constructor(
        private syncService:SyncService,
    ) {
        this.syncService.getConfiguration().subscribe((configuration) => {
            if (!configuration)
                return
            if (configuration.nameParts) {
                this.nameParts = configuration.nameParts
                for (let np of this.nameParts) {
                    np.options.sort((a,b) => a.localeCompare(b))
                    if (np.options.length==0 || np.options[0])
                        np.options.splice(0,0,'')
                }
            }
        })
    }
    onSelectChange($event) {
        this.syncService.saveName(this.nameParts)
        if (!this.nameParts.find((np) => !np.value))
            this.fullNameSet.emit(this.syncService.getName())
    }
}
