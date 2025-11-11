import {
  StellarWalletsKit,
  WalletNetwork,
  ISupportedWallet,
  FREIGHTER_ID,
  xBullModule,
  AlbedoModule,
  FreighterModule,
  LobstrModule,
  RabetModule,
  HanaModule,
  HotWalletModule,
} from '@creit.tech/stellar-wallets-kit';

export type NetworkType = 'testnet' | 'mainnet';

export const WALLET_IDS = {
  FREIGHTER: FREIGHTER_ID,
  XBULL: 'xbull',
  ALBEDO: 'albedo',
  LOBSTR: 'lobstr',
  RABET: 'rabet',
  HANA: 'hana',
  HOT: 'hotwallet',
} as const;

export const WALLET_METADATA: Record<string, { name: string; icon: string }> = {
  [WALLET_IDS.FREIGHTER]: {
    name: 'Freighter',
    icon: 'https://raw.githubusercontent.com/stellar/freighter/master/public/icon-128.png',
  },
  [WALLET_IDS.XBULL]: {
    name: 'xBull',
    icon: 'https://creit.tech/imgs/products/xBull/Icon.png',
  },
  [WALLET_IDS.ALBEDO]: {
    name: 'Albedo',
    icon: 'https://albedo.link/assets/albedo-logo.svg',
  },
  [WALLET_IDS.LOBSTR]: {
    name: 'LOBSTR',
    icon: 'https://lobstr.co/assets/lobstr-logo.svg',
  },
  [WALLET_IDS.RABET]: {
    name: 'Rabet',
    icon: 'https://rabet.io/assets/logo.svg',
  },
  [WALLET_IDS.HANA]: {
    name: 'Hana Wallet',
    icon: 'https://raw.githubusercontent.com/dsrvlabs/wds-code-docs/main/static/img/wallet/hana.svg',
  },
  [WALLET_IDS.HOT]: {
    name: 'HOT Wallet',
    icon: 'https://hotwallet.com/assets/logo.svg',
  },
};

export function createWalletKit(network: NetworkType = 'testnet'): StellarWalletsKit {
  const walletNetwork = network === 'testnet' ? WalletNetwork.TESTNET : WalletNetwork.PUBLIC;
  
  const savedWalletId = localStorage.getItem('selectedWalletId') || WALLET_IDS.FREIGHTER;
  
  const kit = new StellarWalletsKit({
    network: walletNetwork,
    selectedWalletId: savedWalletId,
    modules: [
      new FreighterModule(),
      new xBullModule(),
      new AlbedoModule(),
      new LobstrModule(),
      new RabetModule(),
      new HanaModule(),
      new HotWalletModule(),
    ],
  });
  
  return kit;
}

export function saveSelectedWallet(walletId: string): void {
  localStorage.setItem('selectedWalletId', walletId);
}

export function getSelectedWalletId(): string | null {
  return localStorage.getItem('selectedWalletId');
}

export function clearSelectedWallet(): void {
  localStorage.removeItem('selectedWalletId');
}
