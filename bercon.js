const CRC32 = require('crc-32');
const DGRAM = require('dgram');
const EventEmitter = require('events').EventEmitter;

const RconMessageType = {
    'Login' : 0x00,
    'Command' : 0x01,
    'Log' : 0x02
}

class BERCon extends EventEmitter {

    constructor(options) {
        super();
        if (!options) {
            reject('You must pass an option object that contains host and password');
        }
        if (!options.host) {
            reject('Host is not defined');
        }
        if (!options.pass) {
            reject('Password is not defined');
        }
        if (!options.port) {
            options.port = 2302;
        }
        if (!options.keepAlive) {
            this.keepAlive = 30;
        } else if (options.keepAlive > 45 || options.keepAlive <= 0) {
            reject('The keepAlive option must be between 1 and 45.');
        }

        this.host = options.host;
        this.port = options.port;
        this.pass = options.pass;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.client = DGRAM.createSocket('udp4');
            let packet = this._buildPacket(RconMessageType.Login, this.pass);
            this.client.on('message', (m) => {
                this._handleMessage(m);
            });
            this._sendPacket(packet).then(() => {
                this.sequence = 0;
                this.keepAliveTimer = setTimeout(() => {
                    this._sendPacket(this._buildPacket(RconMessageType.Command, 'keepalive'));
                }, this.keepAlive * 1000);
                resolve();
            }).catch((e) => {
                reject(e);
            });
        })
    }

    disconnect() {
        return new Promise((resolve, reject) => {
            clearTimeout(this.keepAliveTimer);
        })
    }

    sendCommand(command) {
        this._sendPacket(this._buildPacket(RconMessageType.Command, command));
    }

    sendAcknowledge(byte) {
        this._sendPacket(this._buildPacket(RconMessageType.Log, byte));
    }

    _getCrc(hash) {
        let crc = Buffer.alloc(4);
        crc.writeInt32LE(CRC32.buf(hash));

        return crc;
    }

    _buildHeader(hash) {
        let crc = this._getCrc(hash);

        return Buffer.from([0x42, 0x45, crc[0], crc[1], crc[2], crc[3], 0xFF]);
    }

    _buildPacket(messageType, command) {
        let msgType = Buffer.from([messageType]);
        let cmd;
        if ('keepalive' !== command) {
            cmd = Buffer.from(command, 'ascii');
        } else {
            cmd = Buffer.from(new Uint8Array([0, 0]));
        }
        let hash;
        let sequence;
        if (messageType === RconMessageType.Command) {
            sequence = Buffer.from(new Uint8Array([this.sequence++]));
            hash = Buffer.concat([Buffer.from([0xFF]), msgType, sequence, cmd]);
        } else {
            hash = Buffer.concat([Buffer.from([0xFF]), msgType, cmd]);
        }
        let header = this._buildHeader(hash);

        if (messageType === RconMessageType.Command) {
            return Buffer.concat([header, msgType, sequence, cmd]);
        } else {
            return Buffer.concat([header, msgType, cmd]);
        }

    }

    _sendPacket(packet) {
        return new Promise((resolve, reject) => {
            this.client.send(packet, 0, packet.length, this.port, this.host, (e) => {
                if (e) reject(e);
                resolve();
            });
        })
    }

    _handleMessage(message) {
        if (this.isAuthed) {
            let type = message[7];
            if (2 === type) {
                this.sendAcknowledge(String.fromCharCode(message[8]));
            }
            this.emit('messageReceived', message);
        } else {
            let authSucceeded = 1 === message[message.length-1];
            if (!authSucceeded) {
                this.client.close();
                throw 'Authentication failed'
            } else {
                this.isAuthed = true;
            }
        }
    }
}

module.exports = BERCon;