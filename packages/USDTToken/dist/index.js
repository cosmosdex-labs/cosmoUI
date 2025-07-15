import { Buffer } from "buffer";
import { Client as ContractClient, Spec as ContractSpec, } from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk';
export * as contract from '@stellar/stellar-sdk/contract';
export * as rpc from '@stellar/stellar-sdk/rpc';
if (typeof window !== 'undefined') {
    //@ts-ignore Buffer exists
    window.Buffer = window.Buffer || Buffer;
}
export const networks = {
    testnet: {
        networkPassphrase: "Test SDF Network ; September 2015",
        contractId: "CBKKMMHDIZ3JBJLNKVSCSN3G5YBBJXLHNYT2SF7CGKKPET3WQBWAXGLW",
    }
};
export class Client extends ContractClient {
    options;
    static async deploy(
    /** Constructor/Initialization Args for the contract's `__constructor` method */
    { admin, decimal, name, symbol }, 
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options) {
        return ContractClient.deploy({ admin, decimal, name, symbol }, options);
    }
    constructor(options) {
        super(new ContractSpec(["AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAQAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAHZGVjaW1hbAAAAAAEAAAAAAAAAARuYW1lAAAAEAAAAAAAAAAGc3ltYm9sAAAAAAAQAAAAAA==",
            "AAAAAAAAAAAAAAAEbWludAAAAAIAAAAAAAAAAnRvAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
            "AAAAAAAAAAAAAAAJc2V0X2FkbWluAAAAAAAAAQAAAAAAAAAJbmV3X2FkbWluAAAAAAAAEwAAAAA=",
            "AAAAAAAAAAAAAAAJYWxsb3dhbmNlAAAAAAAAAgAAAAAAAAAEZnJvbQAAABMAAAAAAAAAB3NwZW5kZXIAAAAAEwAAAAEAAAAL",
            "AAAAAAAAAAAAAAAHYXBwcm92ZQAAAAAEAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAHc3BlbmRlcgAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAEWV4cGlyYXRpb25fbGVkZ2VyAAAAAAAABAAAAAA=",
            "AAAAAAAAAAAAAAAHYmFsYW5jZQAAAAABAAAAAAAAAAJpZAAAAAAAEwAAAAEAAAAL",
            "AAAAAAAAAAAAAAAIdHJhbnNmZXIAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAACdG8AAAAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAA=",
            "AAAAAAAAAAAAAAANdHJhbnNmZXJfZnJvbQAAAAAAAAQAAAAAAAAAB3NwZW5kZXIAAAAAEwAAAAAAAAAEZnJvbQAAABMAAAAAAAAAAnRvAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
            "AAAAAAAAAAAAAAAEYnVybgAAAAIAAAAAAAAABGZyb20AAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
            "AAAAAAAAAAAAAAAJYnVybl9mcm9tAAAAAAAAAwAAAAAAAAAHc3BlbmRlcgAAAAATAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==",
            "AAAAAAAAAAAAAAAIZGVjaW1hbHMAAAAAAAAAAQAAAAQ=",
            "AAAAAAAAAAAAAAAEbmFtZQAAAAAAAAABAAAAEA==",
            "AAAAAAAAAAAAAAAGc3ltYm9sAAAAAAAAAAAAAQAAABA=",
            "AAAAAQAAAAAAAAAAAAAAEEFsbG93YW5jZURhdGFLZXkAAAACAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAHc3BlbmRlcgAAAAAT",
            "AAAAAQAAAAAAAAAAAAAADkFsbG93YW5jZVZhbHVlAAAAAAACAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAEWV4cGlyYXRpb25fbGVkZ2VyAAAAAAAABA==",
            "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABgAAAAEAAAAAAAAACUFsbG93YW5jZQAAAAAAAAEAAAfQAAAAEEFsbG93YW5jZURhdGFLZXkAAAABAAAAAAAAAAdCYWxhbmNlAAAAAAEAAAATAAAAAQAAAAAAAAAFU3RhdGUAAAAAAAABAAAAEwAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAALVG90YWxTdXBwbHkAAAAAAAAAAAAAAAAKVG9rZW5Pd25lcgAA",
            "AAAAAQAAAAAAAAAAAAAADVRva2VuTWV0YWRhdGEAAAAAAAADAAAAAAAAAAdkZWNpbWFsAAAAAAQAAAAAAAAABG5hbWUAAAAQAAAAAAAAAAZzeW1ib2wAAAAAABA="]), options);
        this.options = options;
    }
    fromJSON = {
        mint: (this.txFromJSON),
        set_admin: (this.txFromJSON),
        allowance: (this.txFromJSON),
        approve: (this.txFromJSON),
        balance: (this.txFromJSON),
        transfer: (this.txFromJSON),
        transfer_from: (this.txFromJSON),
        burn: (this.txFromJSON),
        burn_from: (this.txFromJSON),
        decimals: (this.txFromJSON),
        name: (this.txFromJSON),
        symbol: (this.txFromJSON)
    };
}
