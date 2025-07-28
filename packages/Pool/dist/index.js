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
        contractId: "CDAHYNVQVWFQQAJI2JVA6BRQRSWQCAFUXWJM3GISMH22RLQEWBFF4RKM",
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
            "AAAAAQAAAAAAAAAAAAAACkZlZVRyYWNrZXIAAAAAAAMAAAAAAAAAEWZlZXNfcGVyX2xwX3Rva2VuAAAAAAAACwAAAAAAAAASbGFzdF91cGRhdGVfbGVkZ2VyAAAAAAAEAAAAAAAAABF0b3RhbF9mZWVzX2Vhcm5lZAAAAAAAAAs=",
            "AAAAAQAAAAAAAAAAAAAADVZvbHVtZVRyYWNrZXIAAAAAAAAEAAAAAAAAABBsYXN0X3N3YXBfbGVkZ2VyAAAABAAAAAAAAAAQdG90YWxfdm9sdW1lXzI0aAAAAAsAAAAAAAAAD3RvdGFsX3ZvbHVtZV83ZAAAAAALAAAAAAAAABV0b3RhbF92b2x1bWVfYWxsX3RpbWUAAAAAAAAL",
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
            "AAAAAAAAAAAAAAAVZ2V0X3RvdGFsX2ZlZXNfZWFybmVkAAAAAAAAAAAAAAEAAAAL",
            "AAAAAAAAAAAAAAAVZ2V0X2ZlZXNfcGVyX2xwX3Rva2VuAAAAAAAAAAAAAAEAAAAL",
            "AAAAAAAAAAAAAAAXZ2V0X3VzZXJfdW5jbGFpbWVkX2ZlZXMAAAAAAQAAAAAAAAAEdXNlcgAAABMAAAABAAAACw==",
            "AAAAAAAAAAAAAAAKY2xhaW1fZmVlcwAAAAAAAQAAAAAAAAAGY2FsbGVyAAAAAAATAAAAAQAAAAs=",
            "AAAAAAAAAAAAAAAUZ2V0X3RvdGFsX3ZvbHVtZV8yNGgAAAAAAAAAAQAAAAs=",
            "AAAAAAAAAAAAAAATZ2V0X3RvdGFsX3ZvbHVtZV83ZAAAAAAAAAAAAQAAAAs=",
            "AAAAAAAAAAAAAAAZZ2V0X3RvdGFsX3ZvbHVtZV9hbGxfdGltZQAAAAAAAAAAAAABAAAACw==",
            "AAAAAAAAAAAAAAAbZ2V0X3VzZXJfbGlxdWlkaXR5X3Bvc2l0aW9uAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAA+0AAAADAAAACwAAAAsAAAAL",
            "AAAAAAAAAAAAAAAMZ2V0X3Bvb2xfdHZsAAAAAAAAAAEAAAAL",
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
        get_total_fees_earned: (this.txFromJSON),
        get_fees_per_lp_token: (this.txFromJSON),
        get_user_unclaimed_fees: (this.txFromJSON),
        claim_fees: (this.txFromJSON),
        get_total_volume_24h: (this.txFromJSON),
        get_total_volume_7d: (this.txFromJSON),
        get_total_volume_all_time: (this.txFromJSON),
        get_user_liquidity_position: (this.txFromJSON),
        get_pool_tvl: (this.txFromJSON),
        balance_of: (this.txFromJSON)
    };
}
