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
        contractId: "CB65KWOALLI5Z6CXYKBD6JB35HLFWK7KY3CLMNZBCOCECQJQPTDLKVXY",
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
        super(new ContractSpec(["AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAMUG9vbFdhc21IYXNoAAAAAQAAAAAAAAANRGVwbG95ZWRQb29scwAAAAAAAAIAAAATAAAAEwAAAAAAAAAAAAAACEFsbFBvb2xz",
            "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
            "AAAAAAAAACxTZXQgdGhlIHBvb2wgY29udHJhY3QgV2FzbSBoYXNoIChhZG1pbiBvbmx5KQAAABV1cGRhdGVfcG9vbF93YXNtX2hhc2gAAAAAAAACAAAAAAAAAAphZG1pbl9hZGRyAAAAAAATAAAAAAAAAAhuZXdfaGFzaAAAA+4AAAAgAAAAAA==",
            "AAAAAAAAAB9HZXQgdGhlIHBvb2wgY29udHJhY3QgV2FzbSBoYXNoAAAAABJnZXRfcG9vbF93YXNtX2hhc2gAAAAAAAAAAAABAAAD7gAAACA=",
            "AAAAAAAAADxEZXBsb3kgYSBuZXcgcG9vbCBmb3IgYSB0b2tlbiBwYWlyLCByZXZlcnQgaWYgYWxyZWFkeSBleGlzdHMAAAALY3JlYXRlX3Bvb2wAAAAABQAAAAAAAAAHdG9rZW5fYQAAAAATAAAAAAAAAAd0b2tlbl9iAAAAABMAAAAAAAAADWxwX3Rva2VuX25hbWUAAAAAAAAQAAAAAAAAAA9scF90b2tlbl9zeW1ib2wAAAAAEAAAAAAAAAAEc2FsdAAAA+4AAAAgAAAAAQAAABM=",
            "AAAAAAAAADxHZXQgdGhlIHBvb2wgYWRkcmVzcyBmb3IgYSB0b2tlbiBwYWlyLCBvciBOb25lIGlmIG5vdCBleGlzdHMAAAAIZ2V0X3Bvb2wAAAACAAAAAAAAAAd0b2tlbl9hAAAAABMAAAAAAAAAB3Rva2VuX2IAAAAAEwAAAAEAAAPoAAAAEw==",
            "AAAAAAAAABZHZXQgYWxsIGRlcGxveWVkIHBvb2xzAAAAAAANZ2V0X2FsbF9wb29scwAAAAAAAAAAAAABAAAD6gAAABM=",
            "AAAAAAAAABlHZXQgdG90YWwgbnVtYmVyIG9mIHBvb2xzAAAAAAAADmdldF9wb29sX2NvdW50AAAAAAAAAAAAAQAAAAQ="]), options);
        this.options = options;
    }
    fromJSON = {
        update_pool_wasm_hash: (this.txFromJSON),
        get_pool_wasm_hash: (this.txFromJSON),
        create_pool: (this.txFromJSON),
        get_pool: (this.txFromJSON),
        get_all_pools: (this.txFromJSON),
        get_pool_count: (this.txFromJSON)
    };
}
