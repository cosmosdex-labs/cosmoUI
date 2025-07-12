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
    contractId: "CDCS43PAY362OOESTL66UJ4SGZAOGIH2SX7ED6K46SPMJY4W6NFBEJE5",
  }
} as const

export type DataKey = {tag: "Admin", values: void} | {tag: "TokenWasmHash", values: void} | {tag: "DeployedTokens", values: readonly [string, string]} | {tag: "AllDeployedTokens", values: void} | {tag: "TokenMetadata", values: readonly [string]};

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
   * Construct and simulate a create_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_token: ({admin_addr, token_name, token_symbol, token_decimals, token_supply, token_owner, token_metadata, salt}: {admin_addr: string, token_name: string, token_symbol: string, token_decimals: u32, token_supply: i128, token_owner: string, token_metadata: string, salt: Buffer}, options?: {
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
   * Construct and simulate a get_all_deployed_tokens transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_all_deployed_tokens: (options?: {
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
   * Construct and simulate a get_token_metadata transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_token_metadata: ({token_addr}: {token_addr: string}, options?: {
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
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABQAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAANVG9rZW5XYXNtSGFzaAAAAAAAAAEAAAAAAAAADkRlcGxveWVkVG9rZW5zAAAAAAACAAAAEwAAABMAAAAAAAAAAAAAABFBbGxEZXBsb3llZFRva2VucwAAAAAAAAEAAAAAAAAADVRva2VuTWV0YWRhdGEAAAAAAAABAAAAEw==",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAACxTZXQgdGhlIHBvb2wgY29udHJhY3QgV2FzbSBoYXNoIChhZG1pbiBvbmx5KQAAABV1cGRhdGVfcG9vbF93YXNtX2hhc2gAAAAAAAACAAAAAAAAAAphZG1pbl9hZGRyAAAAAAATAAAAAAAAAAhuZXdfaGFzaAAAA+4AAAAgAAAAAA==",
        "AAAAAAAAAB9HZXQgdGhlIHBvb2wgY29udHJhY3QgV2FzbSBoYXNoAAAAABJnZXRfcG9vbF93YXNtX2hhc2gAAAAAAAAAAAABAAAD7gAAACA=",
        "AAAAAAAAAAAAAAAMY3JlYXRlX3Rva2VuAAAACAAAAAAAAAAKYWRtaW5fYWRkcgAAAAAAEwAAAAAAAAAKdG9rZW5fbmFtZQAAAAAAEAAAAAAAAAAMdG9rZW5fc3ltYm9sAAAAEAAAAAAAAAAOdG9rZW5fZGVjaW1hbHMAAAAAAAQAAAAAAAAADHRva2VuX3N1cHBseQAAAAsAAAAAAAAAC3Rva2VuX293bmVyAAAAABMAAAAAAAAADnRva2VuX21ldGFkYXRhAAAAAAAQAAAAAAAAAARzYWx0AAAD7gAAACAAAAABAAAAEw==",
        "AAAAAAAAAAAAAAAXZ2V0X2FsbF9kZXBsb3llZF90b2tlbnMAAAAAAAAAAAEAAAPqAAAAEw==",
        "AAAAAAAAAAAAAAASZ2V0X3Rva2VuX21ldGFkYXRhAAAAAAABAAAAAAAAAAp0b2tlbl9hZGRyAAAAAAATAAAAAQAAABA=" ]),
      options
    )
  }
  public readonly fromJSON = {
    update_pool_wasm_hash: this.txFromJSON<null>,
        get_pool_wasm_hash: this.txFromJSON<Buffer>,
        create_token: this.txFromJSON<string>,
        get_all_deployed_tokens: this.txFromJSON<Array<string>>,
        get_token_metadata: this.txFromJSON<string>
  }
}