# node-bercon

This is a NodeJS implementation of [BattleEye RCon specificaton](https://www.battleye.com/downloads/BERConProtocol.txt).

## Usage :
```javascript
const BERCon = require('./bercon');

let options = {
    'host': 'example.org',
    'pass': 'imAPotato123'
    'port': 2302,
    'keepAlive': 38
}

let client = new BERCon(options);

client.on('messageReceived', (message) => {
    console.log('Look what I got : ' + message);
})

client.connect().then(() => {
    client.sendCommand('say -1 such rcon');
    setTimeout(() => {
        client.sendCommand('say -1 much battleeye');
    }, 60*1000);
})
```

`port` and `keepAlive` are optionals, they will default to 2302 and 30.


### Implemented :

- [x] Logging-in
- [x] Responding correctly to server's messages
- [x] Sending commands

### Not Implemented :

- [ ] Multi-Packet responses
- [ ] Handling timeouts/packets losses

### Known issues :
- Trying to chain two commands will lead to some weird things.



This is pretty much WIP, and please forgive me if the code is not that good, I'm not a JS expert.