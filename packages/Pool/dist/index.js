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
        contractId: "CCY3SWS3PF6OQOEOQWK7B7FGRC5PT7DLYF2ZNMKRB7GNBVXOBZD6J74F",
    }
};
export class Client extends ContractClient {
    options;
    static async deploy(
    /** Constructor/Initialization Args for the contract's `__constructor` method */
    { token_a, token_b, lp_token_name, lp_token_symbol }, 
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options) {
        return ContractClient.deploy({ token_a, token_b, lp_token_name, lp_token_symbol }, options);
    }
    constructor(options) {
        super(new ContractSpec(["AAAAAQAAAAAAAAAAAAAACFBvb2xJbmZvAAAABAAAAAAAAAAJcmVzZXJ2ZV9hAAAAAAAACwAAAAAAAAAJcmVzZXJ2ZV9iAAAAAAAACwAAAAAAAAAHdG9rZW5fYQAAAAATAAAAAAAAAAd0b2tlbl9iAAAAABM=",
            "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAQAAAAAAAAAB3Rva2VuX2EAAAAAEwAAAAAAAAAHdG9rZW5fYgAAAAATAAAAAAAAAA1scF90b2tlbl9uYW1lAAAAAAAAEAAAAAAAAAAPbHBfdG9rZW5fc3ltYm9sAAAAABAAAAAA",
            "AAAAAAAAAAAAAAANYWRkX2xpcXVpZGl0eQAAAAAAAAMAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAAAAAAIYW1vdW50X2EAAAALAAAAAAAAAAhhbW91bnRfYgAAAAsAAAABAAAACw==",
            "AAAAAAAAAAAAAAAQcmVtb3ZlX2xpcXVpZGl0eQAAAAIAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAAAAAAJbGlxdWlkaXR5AAAAAAAACwAAAAEAAAPtAAAAAgAAAAsAAAAL",
            "AAAAAAAAAAAAAAAEc3dhcAAAAAMAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAAAAAALaW5wdXRfdG9rZW4AAAAAEwAAAAAAAAAJYW1vdW50X2luAAAAAAAACwAAAAEAAAAL",
            "AAAAAAAAAAAAAAALZ2V0X3Rva2VuX2EAAAAAAAAAAAEAAAAT",
            "AAAAAAAAAAAAAAALZ2V0X3Rva2VuX2IAAAAAAAAAAAEAAAAT",
            "AAAAAAAAAAAAAAAMZ2V0X3Jlc2VydmVzAAAAAAAAAAEAAAPtAAAAAgAAAAsAAAAL",
            "AAAAAAAAAAAAAAAGc3VwcGx5AAAAAAAAAAAAAQAAAAs=",
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
            "AAAAAQAAAAAAAAAAAAAADVRva2VuTWV0YWRhdGEAAAAAAAADAAAAAAAAAAdkZWNpbWFsAAAAAAQAAAAAAAAABG5hbWUAAAAQAAAAAAAAAAZzeW1ib2wAAAAAABA="]), options);
        this.options = options;
    }
    fromJSON = {
        add_liquidity: (this.txFromJSON),
        remove_liquidity: (this.txFromJSON),
        swap: (this.txFromJSON),
        get_token_a: (this.txFromJSON),
        get_token_b: (this.txFromJSON),
        get_reserves: (this.txFromJSON),
        supply: (this.txFromJSON),
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
