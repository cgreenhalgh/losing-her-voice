// social media types - to share with app and audience

export enum ItemType {
  SIMPLE = 'simple',
  REPOST = 'repost',
  SELFIE = 'selfie',
  QUIZ = 'quiz',
  POLL = 'poll',
}

export interface Item {
  id?:string
  itemType:ItemType
  user_name:string
  user_icon:string
  date?:string
  toAudience?:boolean
}

export interface SimpleItem extends Item {
  content?:string
  image?:string
  likes?:number
}

export interface RepostItem extends Item {
  item:Item
}

export interface SelfieItem extends Item {
  image:string  
  rejected?:boolean
  approved?:boolean
  moderator?:string
}

export interface SelfieImage {
  image:string // data url or base64 encoded?
  hash?:string
  rejected?:boolean
  approved?:boolean
  moderator?:string
}

export interface QuizOrPollItem extends Item {
  content:string
  options:QuizOption[]
  totalCount?:number
  updateLive?:boolean
  openPrompt?:string
  closedPrompt?:string
  closed?:boolean
}

export interface QuizOption {
  content:string
  correct?:boolean // quiz only
  count?:number
  selected?:boolean // internal
}

export const REDIS_CHANNEL_ANNOUNCE = 'lhva.announce.v1'

export const REDIS_CHANNEL_FEEDBACK = 'lhva.feedback.v2'

export interface LikeItem {
  id:string
  likes?:number
}
export interface ChooseOption {
  itemId:string
  option:number // index from 0
  count?:number
}

export interface Feedback {
  likeItem?:LikeItem
  chooseOption?:ChooseOption
}