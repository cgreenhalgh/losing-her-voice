import { Component, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { Item } from './socialtypes';
import { StoreService } from './store.service';

@Component({
  selector: 'live-view',
  templateUrl: './live.component.html',
  styleUrls: ['./live.component.css']
})
export class LiveComponent implements AfterViewInit {
    items: Item[];
    @ViewChild('feedChild') feedChild: ElementRef; 
    @ViewChild('itemsChild') itemsChild: ElementRef; 
    top:number = 0
    
    constructor(private store:StoreService) {
        this.items = [];
        this.store.getItems().subscribe((item:Item) => {
            // update?
            for (let ix = 0; ix < this.items.length; ix++) {
                let i = this.items[ix]
                if (i.id == item.id) {
                    console.log(`update item ${item.id}`, item)
                    this.items.splice(ix, 1, item)
                    return
                }
            }
            this.items.push(item)
            if (this.feedChild && this.itemsChild)
                this.update()
        })
    }
    ngAfterViewInit() {
            this.update()
    }
    update() {
        setTimeout(() => {
            this.top = this.feedChild.nativeElement.offsetHeight - this.itemsChild.nativeElement.offsetHeight;
            console.log(`feedChild ${this.feedChild.nativeElement.offsetHeight} & itemsChild ${this.itemsChild.nativeElement.offsetHeight} -> ${this.top}`, this.feedChild, this.itemsChild)
        }, 0);
    }
}
