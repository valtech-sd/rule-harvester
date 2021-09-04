import { BridgeError, OutboundResponse, IProviderReq } from 'coronado-bridge';

/**
 * Export a class based on Coronado Bridge's BridgeError so we can rename it to make
 * more sense for Rules Harvester.
 */
export class ICoreHttpError extends BridgeError {}

/**
 * Export a class based on Coronado Bridge's OutboundResponse so we can
 * rename it to make more sense for Rules Harvester.
 */
export class ICoreHttpResponseAction extends OutboundResponse {}

/**
 * Export an interface masking Coronado Bridge's IProviderReq so
 * that typescript apps can benefit from it.
 */
export interface ICoreHttpRequest extends IProviderReq {}
