import { Component } from '@angular/core';
import { Item } from './types';

@Component({
  selector: 'live-view',
  templateUrl: './live.component.html',
  styleUrls: ['./live.component.css']
})
export class LiveComponent {
    items: Item[];
    
    constructor() {
        let DEFAULT_USER_ICON = '/assets/images/default_user.png'
        this.items = [
            { title: 'Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1', 
              user_icon: DEFAULT_USER_ICON, 
              date: 'Jul 13 20:42', 
              content: 'this and this ... this and this ... this and this ... this and this ... this and this ... this and this ... this and this ... this and this ... this and this ... ', 
              image: '/assets/images/default_user.png' },
            { title: 'Item 2', user_icon: DEFAULT_USER_ICON, date: 'Jul 13 20:45', content: 'this and this and the other... ' },
        ]
    }
}
