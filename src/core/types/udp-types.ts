import { RemoteInfo } from 'node:dgram';

export interface ICoreUdpRequest {
  body: string;
  remoteInfo: RemoteInfo;
}
