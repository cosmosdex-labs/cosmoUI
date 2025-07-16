import { Buffer } from "buffer";
import { Address } from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Typepoint,
  Duration,
} from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk'
export * as contract from '@stellar/stellar-sdk/contract'
export * as rpc from '@stellar/stellar-sdk/rpc'

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CAJPAMWRL4XFPAVBCYOJW3Q4GU3W5BDDIAAY2INIFIASOMCDNYLKNMP6",
  }
} as const

export type DataKey = {tag: "Admin", values: void} | {tag: "PoolWasmHash", values: void} | {tag: "DeployedPools", values: readonly [string, string]} | {tag: "AllPools", values: void};

export interface Client {
  /**
   * Construct and simulate a update_pool_wasm_hash transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the pool contract Wasm hash (admin only)
   */
  update_pool_wasm_hash: ({admin_addr, new_hash}: {admin_addr: string, new_hash: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_pool_wasm_hash transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the pool contract Wasm hash
   */
  get_pool_wasm_hash: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Buffer>>

  /**
   * Construct and simulate a create_pool transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deploy a new pool for a token pair, revert if already exists
   */
  create_pool: ({token_a, token_b, lp_token_name, lp_token_symbol, salt}: {token_a: string, token_b: string, lp_token_name: string, lp_token_symbol: string, salt: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_pool transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the pool address for a token pair, or None if not exists
   */
  get_pool: ({token_a, token_b}: {token_a: string, token_b: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a get_all_pools transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get all deployed pools
   */
  get_all_pools: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<string>>>

  /**
   * Construct and simulate a get_pool_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get total number of pools
   */
  get_pool_count: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u32>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin}: {admin: string},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAMUG9vbFdhc21IYXNoAAAAAQAAAAAAAAANRGVwbG95ZWRQb29scwAAAAAAAAIAAAATAAAAEwAAAAAAAAAAAAAACEFsbFBvb2xz",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAACxTZXQgdGhlIHBvb2wgY29udHJhY3QgV2FzbSBoYXNoIChhZG1pbiBvbmx5KQAAABV1cGRhdGVfcG9vbF93YXNtX2hhc2gAAAAAAAACAAAAAAAAAAphZG1pbl9hZGRyAAAAAAATAAAAAAAAAAhuZXdfaGFzaAAAA+4AAAAgAAAAAA==",
        "AAAAAAAAAB9HZXQgdGhlIHBvb2wgY29udHJhY3QgV2FzbSBoYXNoAAAAABJnZXRfcG9vbF93YXNtX2hhc2gAAAAAAAAAAAABAAAD7gAAACA=",
        "AAAAAAAAADxEZXBsb3kgYSBuZXcgcG9vbCBmb3IgYSB0b2tlbiBwYWlyLCByZXZlcnQgaWYgYWxyZWFkeSBleGlzdHMAAAALY3JlYXRlX3Bvb2wAAAAABQAAAAAAAAAHdG9rZW5fYQAAAAATAAAAAAAAAAd0b2tlbl9iAAAAABMAAAAAAAAADWxwX3Rva2VuX25hbWUAAAAAAAAQAAAAAAAAAA9scF90b2tlbl9zeW1ib2wAAAAAEAAAAAAAAAAEc2FsdAAAA+4AAAAgAAAAAQAAABM=",
        "AAAAAAAAADxHZXQgdGhlIHBvb2wgYWRkcmVzcyBmb3IgYSB0b2tlbiBwYWlyLCBvciBOb25lIGlmIG5vdCBleGlzdHMAAAAIZ2V0X3Bvb2wAAAACAAAAAAAAAAd0b2tlbl9hAAAAABMAAAAAAAAAB3Rva2VuX2IAAAAAEwAAAAEAAAPoAAAAEw==",
        "AAAAAAAAABZHZXQgYWxsIGRlcGxveWVkIHBvb2xzAAAAAAANZ2V0X2FsbF9wb29scwAAAAAAAAAAAAABAAAD6gAAABM=",
        "AAAAAAAAABlHZXQgdG90YWwgbnVtYmVyIG9mIHBvb2xzAAAAAAAADmdldF9wb29sX2NvdW50AAAAAAAAAAAAAQAAAAQ=" ]),
      options
    )
  }
  public readonly fromJSON = {
    update_pool_wasm_hash: this.txFromJSON<null>,
        get_pool_wasm_hash: this.txFromJSON<Buffer>,
        create_pool: this.txFromJSON<string>,
        get_pool: this.txFromJSON<Option<string>>,
        get_all_pools: this.txFromJSON<Array<string>>,
        get_pool_count: this.txFromJSON<u32>
  }
}