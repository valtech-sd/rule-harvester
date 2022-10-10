// Bring in package dependencies
import _ from 'lodash';
import dgram, { RemoteInfo, Socket } from 'node:dgram';

// Bring in rule-harvester dependencies
import { IInputProvider, ILogger } from '../../types';
import { ICoreUdpRequest } from '../types/udp-types';

// Export an interface to hold our provider options
export interface ICoreInputUdpProviderOptions {
  inputContextCallback?: (req: ICoreUdpRequest) => void;
}

export default class CoreInputUdpProvider implements IInputProvider {
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
   * @param logger - a logger instance to use for logging.
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
   * This is called by the rules engine when it starts. This function sets up the udp listener
   *
   * Do this by...
   * 1. Set the rules engine apply function for use later
   * 2. If we are not already setup then loop over every configured port
   * 3. for every configured port create udp socket
   * 4. for every configured port bind socket
   * 5. for every configured port setup listening event
   * 6. for every configured port setup message handler
   * 7. for every configured port save the socket for later removal if we ever unregisterInput
   *
   * @param applyInputCb - a handler that will be called when there is input. It should be passed input and context.
   * @returns Promise<void>
   **/
  async registerInput(
    applyInputCb: (input: any, context: any) => Promise<any>
  ) {
    this.logger?.trace(`CoreInputUdp.registerHandler: Start`);

    // Setup a handler for the Udp request
    // 1. Set the rules engine apply function for use later
    this.applyInputCb = applyInputCb;

    // Wire in udp bridge to this handler, if we've not done so already!
    if (!this.alreadyRegistered) {
      this.udpServer = [];

      // 2. If we are not already setup then loop over every configured port
      for (let p of this.udpPorts) {
        // Configure then Start up a new instance of the Udp Bridge (note, this wires in the handler!)
        // 3. for every configured port create udp socket
        let socket = dgram.createSocket('udp4', this.udpHandler);
        this.logger?.trace(
          `CoreInputUdp.registerHandler: Starting server on port ${p}`
        );
        // 4. for every configured port bind socket
        socket.bind(p, () => {
          this.logger?.trace(
            `CoreInputUdp.registerHandler: Server bound port ${p}`
          );
        });
        // 5. for every configured port setup listening event
        socket.on('listening', () => {
          let address = socket.address();
          this.logger?.trace(
            `CoreInputUdp.registerHandler: Server listening on ${address.family} ${address.address}:${address.port}`
          );
        });
        // 6. for every configured port setup message handler
        socket.on('message', this.udpHandler.bind(this));
        // 7. for every configured port save the socket for later removal if we ever unregisterInput
        this.udpServer.push(socket);
      }
      // Keep track so that we only register one udp bridge
      this.alreadyRegistered = true;
    }
    this.logger?.trace(`CoreInputUdp.registerHandler: End`);
  }

  /**
   * udpHandler
   * Handle the udp message
   *
   * does this by
   * 1. Build input facts
   * 2. Optionaly call inputContextCallback if it is defined to build a context
   * 3. Pass input facts and context to the rules engine
   */
  async udpHandler(msg: Buffer, rinfo: RemoteInfo) {
    this.logger?.trace(`CoreInputUdp.udpHandler: Start`);
    try {
      //  1. Build input facts
      let input: ICoreUdpRequest = {
        body: msg.toString(),
        remoteInfo: rinfo,
      };

      // And an object for our context
      let context: any = {};

      // 2. Optionaly call inputContextCallback if it is defined to build a context
      if (this.options.inputContextCallback) {
        context = _.merge(context, this.options.inputContextCallback(input));
      }

      // 3. Pass input facts and context to the rules engine
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
        this.udpServer = [];
        this.alreadyRegistered = false;
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }
}
