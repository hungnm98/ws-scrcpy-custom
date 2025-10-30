import { Mw } from '../../mw/Mw';
import Util from '../../../app/Util';
import Protocol from '@dead50f7/adbkit/lib/adb/protocol';
import { Multiplexer } from '../../../packages/multiplexer/Multiplexer';
import { ChannelCode } from '../../../common/ChannelCode';
import fs from 'fs';

export class AutoBankerLog extends Mw {
    public static readonly TAG = 'AutoBankerLog';
    protected name = 'AutoBankerLog';

    public static processChannel(ws: Multiplexer, code: string, data: ArrayBuffer): Mw | undefined {
        if (code !== ChannelCode.AUTL) {
            return;
        }
        if (!data || data.byteLength < 4) {
            return;
        }
        const buffer = Buffer.from(data);
        const length = buffer.readInt32LE(0);
        const serial = Util.utf8ByteArrayToString(buffer.slice(4, 4 + length));
        return new AutoBankerLog(ws, serial);
    }

    constructor(ws: Multiplexer, private readonly serial: string) {
        super(ws);
        ws.on('channel', (params) => {
            AutoBankerLog.handleNewChannel(this.serial, params.channel);
        });
    }

    protected sendMessage = (): void => {
        throw Error('Do not use this method. You must send data over channels');
    };

    protected onSocketMessage(): void {
        // Nothing here. All communication are performed over the channels. See `handleNewChannel` below.
    }

    private static handleNewChannel(serial: string, channel: Multiplexer): void {
        AutoBankerLog.handle(serial, channel).catch((error: Error) => {
            console.error(`[${AutoBankerLog.TAG}]`, error.message);
        });
    }

    private static async handle(serial: string, channel: Multiplexer): Promise<void> {
        try {
            console.log(serial);
            return new Promise((resolve, reject) => {
                try {
                    const data = fs.readFileSync('/Users/joe/test.txt');
                    channel.send(data);
                    channel.close();
                    resolve();
                } catch (e: any) {
                    reject(e);
                }
            });
        } catch (error: any) {
            AutoBankerLog.sendError(error?.message, channel);
        }
    }

    private static sendError(message: string, channel: Multiplexer): void {
        if (channel.readyState === channel.OPEN) {
            const length = Buffer.byteLength(message, 'utf-8');
            const buf = Buffer.alloc(4 + 4 + length);
            let offset = buf.write(Protocol.FAIL, 'ascii');
            offset = buf.writeUInt32LE(length, offset);
            buf.write(message, offset, 'utf-8');
            channel.send(buf);
            channel.close();
        }
    }
}
