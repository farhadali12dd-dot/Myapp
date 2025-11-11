import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StellarWalletsKit, WalletNetwork, ISupportedWallet } from '@creit.tech/stellar-wallets-kit';
import { createWalletKit, saveSelectedWallet, clearSelectedWallet, NetworkType } from '@/lib/stellarWalletKit';
import { useToast } from '@/hooks/use-toast';
import { Networks } from '@stellar/stellar-sdk';

interface WalletContextType {
  publicKey: string | null;
  network: NetworkType;
  isConnected: boolean;
  connecting: boolean;
  walletKit: StellarWalletsKit | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  setNetwork: (network: NetworkType) => void;
  signTransaction: (xdr: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [network, setNetworkState] = useState<NetworkType>('testnet');
  const [connecting, setConnecting] = useState(false);
  const [walletKit, setWalletKit] = useState<StellarWalletsKit | null>(null);
  const { toast } = useToast();

  const isConnected = publicKey !== null;

  useEffect(() => {
    const savedNetwork = localStorage.getItem('selectedNetwork') as NetworkType;
    if (savedNetwork) {
      setNetworkState(savedNetwork);
    }
    
    const kit = createWalletKit(savedNetwork || 'testnet');
    setWalletKit(kit);
    
    const checkConnection = async () => {
      try {
        const { address } = await kit.getAddress();
        if (address) {
          setPublicKey(address);
        }
      } catch (error) {
        console.log('No wallet connected on init');
      }
    };

    checkConnection();
  }, []);

  const connect = async () => {
    if (!walletKit) {
      toast({
        title: 'Wallet Kit Not Initialized',
        description: 'Please refresh the page and try again',
        variant: 'destructive',
      });
      return;
    }

    setConnecting(true);
    try {
      await walletKit.openModal({
        onWalletSelected: async (option: ISupportedWallet) => {
          try {
            saveSelectedWallet(option.id);
            walletKit.setWallet(option.id);
            
            const { address } = await walletKit.getAddress();
            setPublicKey(address);
            
            toast({
              title: 'Wallet Connected',
              description: `Successfully connected to ${option.name}`,
            });
          } catch (error) {
            console.error('Error connecting wallet:', error);
            toast({
              title: 'Connection Failed',
              description: error instanceof Error ? error.message : 'Failed to connect wallet',
              variant: 'destructive',
            });
          }
        },
      });
    } catch (error) {
      console.error('Error opening wallet modal:', error);
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to open wallet selection',
        variant: 'destructive',
      });
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    setPublicKey(null);
    clearSelectedWallet();
    
    if (walletKit) {
      const kit = createWalletKit(network);
      setWalletKit(kit);
    }
    
    toast({
      title: 'Wallet Disconnected',
      description: 'Your wallet has been disconnected',
    });
  };

  const setNetwork = (newNetwork: NetworkType) => {
    setNetworkState(newNetwork);
    localStorage.setItem('selectedNetwork', newNetwork);
    
    // Clear wallet state when switching networks
    setPublicKey(null);
    clearSelectedWallet();
    
    // Recreate kit with new network
    const kit = createWalletKit(newNetwork);
    setWalletKit(kit);
    
    toast({
      title: 'Network Changed',
      description: `Switched to ${newNetwork}. Please reconnect your wallet.`,
    });
  };

  const signTransaction = async (xdr: string): Promise<string> => {
    if (!isConnected || !walletKit) {
      throw new Error('Wallet not connected');
    }

    try {
      const networkPassphrase = network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;
      
      const { signedTxXdr } = await walletKit.signTransaction(xdr, {
        networkPassphrase,
      });
      
      return signedTxXdr;
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        network,
        isConnected,
        connecting,
        walletKit,
        connect,
        disconnect,
        setNetwork,
        signTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
