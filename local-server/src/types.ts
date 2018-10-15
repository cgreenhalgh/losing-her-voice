export interface Item {
    title:string;
    content?:string;
    date?:string;
    user_icon:string;
    image?:string;
    likes?:number;
}

export interface ControlItem {
    id:string;
    item:Item;
    postCount:number;
}

export const MSG_CLIENT_HELLO = 'lhr.client.hello'
export const MSG_ANNOUNCE_CONTROL_ITEMS = 'lhr.announce.controlItems'
export const MSG_ANNOUNCE_ITEMS = 'lhr.announce.items'
export const MSG_ANNOUNCE_ITEM = 'lhr.announce.item'
export const MSG_POST_ITEM = 'lhr.post.item'

export interface ClientHello {
}
export interface AnnounceControlItems {
    controlItems:ControlItem[]
}
export interface AnnounceItems {
    items:Item[]
}
export interface AnnounceItem {
    item:Item
}
export interface PostItem {
    controlItem:ControlItem
}
