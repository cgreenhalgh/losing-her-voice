const PING_INTERVAL_MS = 20000

export function startPing(redisClient) {
    setInterval(() => { 
        //console.log(`ping ${redisClient}`)
        redisClient.ping() 
    }, PING_INTERVAL_MS)
}