// Bring in package dependencies
import { Logger } from 'log4js';
import _ from 'lodash';
import dgram, { RemoteInfo, Socket } from 'node:dgram';

// Bring in rule-harvester dependencies
import { IInputProvider, ILogger } from '../../types';
import { ICoreUdpRequest } from '../types/udp-types';

// Export an interface to hold our provider options
export interface ICoreInputUdpProviderOptions {
  inputContextCallback?: (req: ICoreUdpRequest) => void;
}

export default class CoreInputUdpProvider {
  private alreadyRegistered: boolean;
  private logger?: ILogger;
  private udpPorts: Array<number>;
  private udpServer!: Socket[];
  private applyInputCb!: (input: any, context: any) => Promise<any>;
  private options: ICoreInputUdpProviderOptions;

  /**
   * constructor
   *
   * This function sets class level variables.
   *
   * @param udpPorts - an array of numbers, the ports to start HTTP servers on.
   * @param logger - a log4js logger instance to use for logging.
   * @param options
   **/
  constructor(
    udpPorts: Array<number>,
    logger: ILogger | undefined,
    options: ICoreInputUdpProviderOptions
  ) {
    this.alreadyRegistered = false;
    // Save the constructor parameters to local class variables
    this.logger = logger;
    this.udpPorts = udpPorts;
    this.options = options;
  }

  /**
   * registerHandler
   *
   * Does this by...
   * 1. Starts an instance of the Udp Bridge (Coronado Bridge) which starts an Express server
   *    on the ports declared in the private instance properties of the class (passed in the class
   *    constructor).
   * 1. The Udp Bridge receives the passed applyInputCb so that new Udp Requests can be
   *    inputs into the rules engine.
   * 2. If this is the first call then we register the UdpHandler function with the amqp provider
   * *  If not the first call then we do nothing else
   *
   * @param applyInputCb - a handler that will be called when there is input. It should be passed input and context.
   * @returns Promise<void>
   **/
  async registerInput(
    applyInputCb: (input: any, context: any) => Promise<any>
  ) {
    this.logger?.trace(`CoreInputUdp.registerHandler: Start`);

    // Setup a handler for the Udp request
    this.applyInputCb = applyInputCb;

    // Wire in udp bridge to this handler, if we've not done so already!
    if (!this.alreadyRegistered) {
      this.udpServer = [];

      for (let p of this.udpPorts) {
        // Configure then Start up a new instance of the Udp Bridge (note, this wires in the handler!)
        let socket = dgram.createSocket('udp4', this.udpHandler);
        this.logger?.trace(
          `CoreInputUdp.registerHandler: Starting server on port ${p}`
        );
        socket.bind(p, () => {
          this.logger?.trace(
            `CoreInputUdp.registerHandler: Server bound port ${p}`
          );
        });
        socket.on('listening', () => {
          let address = socket.address();
          this.logger?.trace(
            `CoreInputUdp.registerHandler: Server listening on ${address.family} ${address.address}:${address.port}`
          );
        });
        socket.on('message', this.udpHandler.bind(this));
        this.udpServer.push(socket);
      }
      // Keep track so that we only register one udp bridge
      this.alreadyRegistered = true;
    }
    this.logger?.trace(`CoreInputUdp.registerHandler: End`);
  }

  async udpHandler(msg: Buffer, rinfo: RemoteInfo) {
    this.logger?.trace(`CoreInputUdp.udpHandler: Start`);
    //
    try {
      let input: ICoreUdpRequest = {
        body: msg.toString(),
        remoteInfo: rinfo,
      };

      // And an object for our context
      let context: any = {};

      // Call the inputContextCallback if we were passed one
      if (this.options.inputContextCallback) {
        context = _.merge(context, this.options.inputContextCallback(input));
      }

      // Run through rules engine
      await this.applyInputCb({ udpRequest: input }, context);
    } catch (ex) {
      this.logger?.error('ERROR: CoreInputUdp.udpHandler', ex);
    }
    this.logger?.trace(`CoreInputUdp.udpHandler: End`);
  }

  async unregisterInput() {
    return new Promise<void>((resolve, reject) => {
      try {
        for (let socket of this.udpServer) {
          socket.close();
        }
        this.alreadyRegistered = false;
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }
}
