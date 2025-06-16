import * as Client from '../packages/PoolFactory';
import { rpcUrl } from './util';

export default new Client.Client({
  ...Client.networks.testnet,
  rpcUrl,
  allowHttp: true,
});