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
        contractId: "CBTEFOXVL6FXZADA7MY2S5EL2JKP72GNU2I5NMGVI7AVX5OVJJF5QQY2",
    }
};
export class Client extends ContractClient {
    options;
    static async deploy(
    /** Constructor/Initialization Args for the contract's `__constructor` method */
    { admin }, 
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options) {
        return ContractClient.deploy({ admin }, options);
    }
    constructor(options) {
        super(new ContractSpec(["AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABQAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAANVG9rZW5XYXNtSGFzaAAAAAAAAAEAAAAAAAAADkRlcGxveWVkVG9rZW5zAAAAAAACAAAAEwAAABMAAAAAAAAAAAAAABFBbGxEZXBsb3llZFRva2VucwAAAAAAAAEAAAAAAAAADVRva2VuTWV0YWRhdGEAAAAAAAABAAAAEw==",
            "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
            "AAAAAAAAACxTZXQgdGhlIHBvb2wgY29udHJhY3QgV2FzbSBoYXNoIChhZG1pbiBvbmx5KQAAABV1cGRhdGVfcG9vbF93YXNtX2hhc2gAAAAAAAACAAAAAAAAAAphZG1pbl9hZGRyAAAAAAATAAAAAAAAAAhuZXdfaGFzaAAAA+4AAAAgAAAAAA==",
            "AAAAAAAAAB9HZXQgdGhlIHBvb2wgY29udHJhY3QgV2FzbSBoYXNoAAAAABJnZXRfcG9vbF93YXNtX2hhc2gAAAAAAAAAAAABAAAD7gAAACA=",
            "AAAAAAAAAAAAAAAMY3JlYXRlX3Rva2VuAAAACAAAAAAAAAAKYWRtaW5fYWRkcgAAAAAAEwAAAAAAAAAKdG9rZW5fbmFtZQAAAAAAEAAAAAAAAAAMdG9rZW5fc3ltYm9sAAAAEAAAAAAAAAAOdG9rZW5fZGVjaW1hbHMAAAAAAAQAAAAAAAAADHRva2VuX3N1cHBseQAAAAsAAAAAAAAAC3Rva2VuX293bmVyAAAAABMAAAAAAAAADnRva2VuX21ldGFkYXRhAAAAAAAQAAAAAAAAAARzYWx0AAAD7gAAACAAAAABAAAAEw==",
            "AAAAAAAAAAAAAAAXZ2V0X2FsbF9kZXBsb3llZF90b2tlbnMAAAAAAAAAAAEAAAPqAAAAEw==",
            "AAAAAAAAAAAAAAASZ2V0X3Rva2VuX21ldGFkYXRhAAAAAAABAAAAAAAAAAp0b2tlbl9hZGRyAAAAAAATAAAAAQAAABA="]), options);
        this.options = options;
    }
    fromJSON = {
        update_pool_wasm_hash: (this.txFromJSON),
        get_pool_wasm_hash: (this.txFromJSON),
        create_token: (this.txFromJSON),
        get_all_deployed_tokens: (this.txFromJSON),
        get_token_metadata: (this.txFromJSON)
    };
}
