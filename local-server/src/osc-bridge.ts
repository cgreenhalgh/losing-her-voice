import * as OSC from 'osc-js'
import * as redis from 'redis'
import * as dgram from 'dgram'
import { REDIS_CHANNEL_VIEW_STATE, ViewState } from './statetypes'
let PORT = 9123

// redis set-up
let redis_host = process.env.REDIS_HOST || '127.0.0.1';
let redis_config = { host: redis_host, port: 6379, auth_pass:null };
if (process.env.REDIS_PASSWORD) {
  redis_config.auth_pass = process.env.REDIS_PASSWORD;
}

const OSC_LHVA_STATE = "/lhva/state"

export type OscCommandCallback = (command:string, args:any[]) => void

interface OscCommands {
  [propName:string]:OscCommandCallback
}

export class OSCBridge {
  performanceid:string
  commands:OscCommands = {}
  osc:OSC
  
  constructor() {
      console.log('using redis config ' + JSON.stringify(redis_config));
    
      let redisPub = redis.createClient(redis_config);
      redisPub.on("error", function (err) {
        console.log(`ERROR redis error ${err}`, err);
      });
    
      // debugging - OK now (was docker & vagrant config issues)
      /*
      const socket = dgram.createSocket('udp4')
      socket.bind(PORT, '0.0.0.0', ()=> { console.log(`bound`) })
      socket.on('message', function(msg, rinfo) {
        console.log('Received %d bytes from %s:%d\n',
                    msg.length, rinfo.address, rinfo.port);
      });
      socket.on('error', function(err) {
        console.log(`socket error`, err)
      });
      */
      this.osc = new OSC({ 
        plugin: new OSC.DatagramPlugin({
          open: {
            port: PORT,
            host: '0.0.0.0'
          }
        }) 
      })
      this.osc.on('open', () => {
        console.log(`osc open`)
      })
      this.osc.on(OSC_LHVA_STATE, (message) => {
        console.log(`osc /lhva/state message`, message.args)
        if (message.args.length!=1) {
          console.log(`ERROR: osc /lhva/state message with ${message.args.length} arguments`, message.args)
          return
        }
        if (!this.performanceid) {
            console.log(`WARNING: discarding osc /lhva/state message because performanceid is not set`)
            return
        }
        let msg:ViewState = {
            performanceid:this.performanceid,
            state:message.args[0],
        }
        redisPub.publish(REDIS_CHANNEL_VIEW_STATE, JSON.stringify(msg))
      })
      //osc.on('*', (message) => {
      //  console.log(`Warning: osc message`, message)
      //})
      console.log(`bridge OSC from port ${PORT} to redis ${REDIS_CHANNEL_VIEW_STATE}; expecting ${OSC_LHVA_STATE} "..."`)
      this.osc.open()
    }
    addCommand(command:string, cb:OscCommandCallback): void {
      this.commands[command] = cb
      this.osc.on(command, (message) => {
        cb(message.address, message.args)
      })
    }
    setPerformanceid(performanceid:string) {
        this.performanceid = performanceid
    }
}