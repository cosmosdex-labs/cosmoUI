import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'import.meta.env.PUBLIC_STELLAR_RPC_URL': JSON.stringify(process.env.PUBLIC_STELLAR_RPC_URL),
    'import.meta.env.PUBLIC_STELLAR_NETWORK_PASSPHRASE': JSON.stringify(process.env.PUBLIC_STELLAR_NETWORK_PASSPHRASE)
  }
}); 