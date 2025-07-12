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
        contractId: "CD6IA7W6YLDXBGETEQ7GBVQGDJAGABO7TI7YVCTLCIUZN4WP2MPL43RN",
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
        super(new ContractSpec(["AAAAAQAAAAAAAAAAAAAACFBvb2xJbmZvAAAABgAAAAAAAAALaXNfeGxtX3Bvb2wAAAAAAQAAAAAAAAAJcmVzZXJ2ZV9hAAAAAAAACwAAAAAAAAAJcmVzZXJ2ZV9iAAAAAAAACwAAAAAAAAAHdG9rZW5fYQAAAAATAAAAAAAAAAd0b2tlbl9iAAAAABMAAAAAAAAAD3hsbV90b2tlbl9pbmRleAAAAAPoAAAABQ==",
            "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAQAAAAAAAAAB3Rva2VuX2EAAAAAEwAAAAAAAAAHdG9rZW5fYgAAAAATAAAAAAAAAA1scF90b2tlbl9uYW1lAAAAAAAAEAAAAAAAAAAPbHBfdG9rZW5fc3ltYm9sAAAAABAAAAAA",
            "AAAAAAAAAAAAAAANYWRkX2xpcXVpZGl0eQAAAAAAAAMAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAAAAAAIYW1vdW50X2EAAAALAAAAAAAAAAhhbW91bnRfYgAAAAsAAAABAAAACw==",
            "AAAAAAAAAAAAAAAQcmVtb3ZlX2xpcXVpZGl0eQAAAAIAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAAAAAAJbGlxdWlkaXR5AAAAAAAACwAAAAEAAAPtAAAAAgAAAAsAAAAL",
            "AAAAAAAAAAAAAAAEc3dhcAAAAAMAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAAAAAALaW5wdXRfdG9rZW4AAAAAEwAAAAAAAAAJYW1vdW50X2luAAAAAAAACwAAAAEAAAAL",
            "AAAAAAAAAAAAAAALZ2V0X3Rva2VuX2EAAAAAAAAAAAEAAAAT",
            "AAAAAAAAAAAAAAALZ2V0X3Rva2VuX2IAAAAAAAAAAAEAAAAT",
            "AAAAAAAAAAAAAAAMZ2V0X3Jlc2VydmVzAAAAAAAAAAEAAAPtAAAAAgAAAAsAAAAL",
            "AAAAAAAAAAAAAAALaXNfeGxtX3Bvb2wAAAAAAAAAAAEAAAAB",
            "AAAAAAAAAAAAAAATZ2V0X3hsbV90b2tlbl9pbmRleAAAAAAAAAAAAQAAA+gAAAAF",
            "AAAAAAAAAAAAAAAPZ2V0X3hsbV9iYWxhbmNlAAAAAAAAAAABAAAACw==",
            "AAAAAAAAAAAAAAAGc3VwcGx5AAAAAAAAAAAAAQAAAAs=",
            "AAAAAAAAAAAAAAAKYmFsYW5jZV9vZgAAAAAAAQAAAAAAAAACaWQAAAAAABMAAAABAAAACw=="]), options);
        this.options = options;
    }
    fromJSON = {
        add_liquidity: (this.txFromJSON),
        remove_liquidity: (this.txFromJSON),
        swap: (this.txFromJSON),
        get_token_a: (this.txFromJSON),
        get_token_b: (this.txFromJSON),
        get_reserves: (this.txFromJSON),
        is_xlm_pool: (this.txFromJSON),
        get_xlm_token_index: (this.txFromJSON),
        get_xlm_balance: (this.txFromJSON),
        supply: (this.txFromJSON),
        balance_of: (this.txFromJSON)
    };
}
