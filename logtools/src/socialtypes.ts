// social media types - to share with app and audience

export enum ItemType {
  SIMPLE = 'simple',
  REPOST = 'repost',
  SELFIE = 'selfie',
  QUIZ = 'quiz',
  POLL = 'poll',
  BLANK = 'blank',
  RESET = 'reset',
}

export interface Item {
  id?:string
  itemType:ItemType
  user_name:string
  user_icon?:string
  date?:string
  toAudience?:boolean
}

export interface SimpleItem extends Item {
  content?:string
  image?:string
  likes?:number
  canLike?:boolean
  canShare?:boolean
}

export interface RepostItem extends Item {
  item:Item
  submitted?:number // date
}

export interface SelfieItem extends Item {
  image:string  
  hash?:string
  rejected?:boolean
  approved?:boolean
  moderator?:string
  submitted?:number // date
}

export interface SelfieImage {
  image:string // data url or base64 encoded?
  performanceid?:string // required on local server side
  hash?:string
  rejected?:boolean
  approved?:boolean
  moderator?:string
  submitted?:number // date
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

export const REDIS_CHANNEL_ANNOUNCE = 'lhva.announce.v2'

export interface Announce {
    performanceid:string
    item:Item
}

export const REDIS_CHANNEL_FEEDBACK = 'lhva.feedback.v5'
export const REDIS_LIST_FEEDBACK = 'lhva:feedback:v5'

// ping can be any message! must be sent after adding to list

export interface LikeItem {
  id:string
  likes?:number
}
export interface ShareItem {
  id:string
  user_name:string
  key?:string
}
export interface ChooseOption {
  itemId:string
  option:number // index from 0
  count?:number
}
export interface ShareSelfie {
  user_name:string
  image?:string // data url or base64 encoded?
  hash?:string // required if image omitted
  key?:string
}
export interface Feedback {
  performanceid:string
  likeItem?:LikeItem
  shareItem?:ShareItem
  chooseOption?:ChooseOption
  selfieImage?:SelfieImage
  shareSelfie?:ShareSelfie
}
