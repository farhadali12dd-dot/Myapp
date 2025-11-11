import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { WALLET_METADATA } from '@/lib/stellarWalletKit';
import { Wallet } from 'lucide-react';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
}

interface WalletSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectWallet: (walletId: string) => void;
  availableWallets?: WalletOption[];
}

const DEFAULT_WALLETS: WalletOption[] = Object.entries(WALLET_METADATA).map(([id, meta]) => ({
  id,
  name: meta.name,
  icon: meta.icon,
}));

export default function WalletSelectionModal({
  open,
  onClose,
  onSelectWallet,
  availableWallets = DEFAULT_WALLETS,
}: WalletSelectionModalProps) {
  const handleSelect = (walletId: string) => {
    onSelectWallet(walletId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-orange-400">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <DialogTitle className="text-2xl">Connect Wallet</DialogTitle>
          </div>
          <DialogDescription>
            Choose your preferred Stellar wallet to connect
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {availableWallets.map((wallet) => (
            <Card
              key={wallet.id}
              className="p-4 cursor-pointer hover-elevate active-elevate-2 transition-all"
              onClick={() => handleSelect(wallet.id)}
              data-testid={`wallet-option-${wallet.id}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                  <img
                    src={wallet.icon}
                    alt={wallet.name}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{wallet.name}</h3>
                </div>
                <svg
                  className="w-5 h-5 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            Make sure you have your preferred wallet extension installed and unlocked
          </p>
        </div>

        <Button variant="outline" onClick={onClose} className="w-full" data-testid="button-cancel-wallet-selection">
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
