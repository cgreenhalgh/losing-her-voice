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
