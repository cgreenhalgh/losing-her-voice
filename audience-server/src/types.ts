// protocol message IDs
export const MSG_CLIENT_HELLO = 'lhva.client.hello'
export const MSG_CONFIGURATION = 'lhva.server.configuration'
export const MSG_CURRENT_STATE = 'lhva.server.state'
export const MSG_OUT_OF_DATE = 'lhva.server.outofdate'

// protocol version number
export const CURRENT_VERSION:number = 2

// body of MSG_CLIENT_HELLO
export interface ClientHello {
  version:number
  clientType:string // e.g. web/pwa, ios, android ??
  clientId:string
}

// body of MSG_OUT_OF_DATE
export interface OutOfDate {
  serverVersion:number
  clientVersion:number
}

// body of MSG_CURRENT_STATE, also current state to control view (availability)
export interface CurrentState {
  forceView?:string
  allowMenu:boolean
  postPerformance:boolean
  error?:string // not usually from server
}

// one card in a view
export interface Card {
  html:string
}

// menu item
export interface MenuItem {
  id:string
  title:string
  postPerformance:boolean
  cards:Card[]
}

// view
export interface View {
  id:string
  cards:Card[]
  act:number // clue for styling?! (1 or 2)
  defaultMenuId?:string
}

export interface Configuration {
  menuItems:MenuItem[]
  views:View[]
}
