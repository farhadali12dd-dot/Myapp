import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, ArrowLeft, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { buildCreateProjectTransaction, submitTransaction } from "@/lib/sorobanClient";
import { getExplorerUrl } from "@/config/contracts";
import { useWallet } from "@/contexts/WalletContext";

interface ProjectFormData {
  name: string;
  symbol: string;
  totalSupply: string;
  decimals: number;
  description: string;
  twitterUrl: string;
  telegramUrl: string;
  websiteUrl: string;
  airdropPercent: number;
  creatorPercent: number;
  liquidityPercent: number;
  minimumLiquidity: string;
  hasVesting: boolean;
  vestingPeriodDays: number;
  participationPeriodDays: number;
}

interface CreateProjectWizardProps {
  onClose: () => void;
  walletAddress?: string;
  currentUserId?: string;
}

const RocketIcon = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="rocketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#FF6B00', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#FFA366', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <motion.path
      d="M100 20 L120 80 L140 100 L120 120 L100 180 L80 120 L60 100 L80 80 Z"
      fill="url(#rocketGradient)"
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
    />
    <motion.circle
      cx="100"
      cy="60"
      r="8"
      fill="#FFF"
      initial={{ scale: 0.8 }}
      animate={{ scale: 1.2 }}
      transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
    />
    <motion.path
      d="M70 120 Q60 140 50 160"
      stroke="#FF8533"
      strokeWidth="3"
      fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 0.6 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    />
    <motion.path
      d="M130 120 Q140 140 150 160"
      stroke="#FF8533"
      strokeWidth="3"
      fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 0.6 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="settingsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#FF6B00', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#FFA366', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <motion.circle
      cx="100"
      cy="100"
      r="30"
      fill="url(#settingsGradient)"
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      style={{ originX: "100px", originY: "100px" }}
    />
    <motion.g
      animate={{ rotate: -360 }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      style={{ originX: "100px", originY: "100px" }}
    >
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <rect
          key={i}
          x="95"
          y="50"
          width="10"
          height="25"
          fill="#FF8533"
          transform={`rotate(${angle} 100 100)`}
        />
      ))}
    </motion.g>
    <circle cx="100" cy="100" r="15" fill="#1A1A1A" />
  </svg>
);

const LaunchIcon = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="launchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#FF6B00', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#FFA366', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <motion.circle
      cx="100"
      cy="100"
      r="50"
      stroke="url(#launchGradient)"
      strokeWidth="4"
      fill="none"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6 }}
    />
    <motion.circle
      cx="100"
      cy="100"
      r="40"
      fill="url(#launchGradient)"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    />
    <motion.path
      d="M100 60 L110 90 L140 90 L115 110 L125 140 L100 120 L75 140 L85 110 L60 90 L90 90 Z"
      fill="#FFF"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      style={{ originX: "100px", originY: "100px" }}
    />
  </svg>
);

export default function CreateProjectWizard({ onClose, walletAddress, currentUserId }: CreateProjectWizardProps) {
  const { toast } = useToast();
  const { network, signTransaction: walletSignTransaction } = useWallet();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    symbol: "",
    totalSupply: "",
    decimals: 7,
    description: "",
    twitterUrl: "",
    telegramUrl: "",
    websiteUrl: "",
    airdropPercent: 40,
    creatorPercent: 30,
    liquidityPercent: 30,
    minimumLiquidity: "500",
    hasVesting: false,
    vestingPeriodDays: 180,
    participationPeriodDays: 7,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData & { walletAddress: string }) => {
      const placeholderTokenAddress = "GBGTK4RQSA3XRJLOW7MX3FJBFPXZVFZLZXUK2WVQXG3DFI5NBVSAMPLE";
      
      const unsignedXDR = await buildCreateProjectTransaction(
        data.walletAddress,
        {
          name: data.name,
          symbol: data.symbol,
          tokenAddress: placeholderTokenAddress,
          totalSupply: data.totalSupply,
          airdropPercent: data.airdropPercent,
          creatorPercent: data.creatorPercent,
          liquidityPercent: data.liquidityPercent,
          minimumLiquidity: data.minimumLiquidity,
          participationPeriodDays: data.participationPeriodDays,
          hasVesting: data.hasVesting,
          vestingPeriodDays: data.vestingPeriodDays,
        },
        network
      );
      
      const signedXDR = await walletSignTransaction(unsignedXDR);
      const { hash } = await submitTransaction(signedXDR);
      
      const res = await apiRequest("POST", "/api/projects/create", {
        ...data,
        txHash: hash,
      });
      const result = await res.json();
      
      return { ...result, txHash: hash, network };
    },
    onSuccess: (data: { name: string; txHash: string; network: 'testnet' | 'mainnet' }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId, "projects"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/stats/global"] });
      
      toast({
        title: "🚀 Token Launched Successfully!",
        description: `${data.name} is now live on Stellar blockchain`,
      });
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error?.details?.[0]?.message || error?.error || error?.message || "Failed to create project";
      toast({
        title: "Launch Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handlePercentChange = (field: 'airdropPercent' | 'creatorPercent' | 'liquidityPercent', value: number) => {
    const newData = { ...formData, [field]: value };
    const total = newData.airdropPercent + newData.creatorPercent + newData.liquidityPercent;
    if (total <= 100) {
      setFormData(newData);
    }
  };

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.name.trim()) newErrors.name = "Token name is required";
      if (!formData.symbol.trim()) newErrors.symbol = "Symbol is required";
      if (!formData.totalSupply || parseFloat(formData.totalSupply) <= 0) {
        newErrors.totalSupply = "Valid total supply is required";
      }
      if (!formData.description.trim()) newErrors.description = "Description is required";
    }

    if (currentStep === 2) {
      const total = formData.airdropPercent + formData.creatorPercent + formData.liquidityPercent;
      if (total !== 100) {
        newErrors.allocation = "Total allocation must equal 100%";
      }
    }

    if (currentStep === 3) {
      if (!formData.minimumLiquidity || parseFloat(formData.minimumLiquidity) < 500) {
        newErrors.minimumLiquidity = "Minimum 500 XLM required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleSubmit = () => {
    if (!walletAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (validateStep(3)) {
      createProjectMutation.mutate({
        ...formData,
        walletAddress,
      });
    }
  };

  const totalPercent = formData.airdropPercent + formData.creatorPercent + formData.liquidityPercent;

  const steps = [
    { number: 1, title: "Basic Info", icon: RocketIcon },
    { number: 2, title: "Tokenomics", icon: SettingsIcon },
    { number: 3, title: "Launch Config", icon: LaunchIcon },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-4xl my-8"
      >
        <Card className="relative border-card-border bg-card/95 backdrop-blur max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-10 p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          </button>

          <div className="p-8 md:p-10">
            <div className="mb-8">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-orange-400 to-primary bg-clip-text text-transparent mb-2">
                  Launch Your Token
                </h2>
                <p className="text-muted-foreground text-base">
                  Deploy on Stellar in 3 simple steps
                </p>
              </motion.div>
            </div>

            <div className="mb-10">
              <div className="flex items-center justify-between mb-6">
                {steps.map((s, idx) => (
                  <div key={s.number} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-2">
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ 
                          scale: step >= s.number ? 1 : 0.9,
                          borderColor: step >= s.number ? "hsl(27 100% 56%)" : "hsl(0 0% 30%)"
                        }}
                        transition={{ duration: 0.3 }}
                        className={`relative w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 transition-all ${
                          step >= s.number 
                            ? "bg-gradient-to-br from-primary to-orange-400 border-primary shadow-lg shadow-primary/30" 
                            : "bg-secondary border-border"
                        }`}
                      >
                        <span className="text-lg md:text-xl font-bold text-white">
                          {s.number}
                        </span>
                      </motion.div>
                      <span className={`text-xs md:text-sm font-medium hidden sm:block ${
                        step >= s.number ? "text-primary" : "text-muted-foreground"
                      }`}>
                        {s.title}
                      </span>
                    </div>
                    {idx < steps.length - 1 && (
                      <div className="flex-1 h-0.5 mx-2 md:mx-4 bg-border relative overflow-hidden">
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: step > s.number ? 1 : 0 }}
                          transition={{ duration: 0.4 }}
                          className="absolute inset-0 bg-gradient-to-r from-primary to-orange-400 origin-left"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Progress value={(step / 3) * 100} className="h-1.5" />
            </div>

            <div className="grid md:grid-cols-[1fr_280px] gap-8 mb-8">
              <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-sm font-medium">
                            Token Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="name"
                            placeholder="e.g., Stellar Token"
                            value={formData.name}
                            onChange={(e) => updateField("name", e.target.value)}
                            className={`h-12 bg-input border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
                              errors.name ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
                            }`}
                            data-testid="input-token-name"
                          />
                          {errors.name && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs text-destructive"
                            >
                              {errors.name}
                            </motion.p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="symbol" className="text-sm font-medium">
                            Symbol <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="symbol"
                            placeholder="e.g., STR"
                            value={formData.symbol}
                            onChange={(e) => updateField("symbol", e.target.value.toUpperCase())}
                            className={`h-12 bg-input border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
                              errors.symbol ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
                            }`}
                            data-testid="input-token-symbol"
                          />
                          {errors.symbol && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs text-destructive"
                            >
                              {errors.symbol}
                            </motion.p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="supply" className="text-sm font-medium">
                            Total Supply <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="supply"
                            type="number"
                            placeholder="1000000"
                            value={formData.totalSupply}
                            onChange={(e) => updateField("totalSupply", e.target.value)}
                            className={`h-12 bg-input border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
                              errors.totalSupply ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
                            }`}
                            data-testid="input-total-supply"
                          />
                          {errors.totalSupply && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs text-destructive"
                            >
                              {errors.totalSupply}
                            </motion.p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="decimals" className="text-sm font-medium">
                            Decimals
                          </Label>
                          <Input
                            id="decimals"
                            type="number"
                            value={formData.decimals}
                            onChange={(e) => updateField("decimals", parseInt(e.target.value))}
                            className="h-12 bg-input border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            data-testid="input-decimals"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium">
                          Description <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="description"
                          placeholder="Describe your token project..."
                          value={formData.description}
                          onChange={(e) => updateField("description", e.target.value)}
                          rows={4}
                          className={`bg-input border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none ${
                            errors.description ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
                          }`}
                          data-testid="input-description"
                        />
                        {errors.description && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-destructive"
                          >
                            {errors.description}
                          </motion.p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="twitter" className="text-xs text-muted-foreground">
                            Twitter
                          </Label>
                          <Input
                            id="twitter"
                            placeholder="https://twitter.com/..."
                            value={formData.twitterUrl}
                            onChange={(e) => updateField("twitterUrl", e.target.value)}
                            className="h-10 text-sm bg-input border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            data-testid="input-twitter"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telegram" className="text-xs text-muted-foreground">
                            Telegram
                          </Label>
                          <Input
                            id="telegram"
                            placeholder="https://t.me/..."
                            value={formData.telegramUrl}
                            onChange={(e) => updateField("telegramUrl", e.target.value)}
                            className="h-10 text-sm bg-input border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            data-testid="input-telegram"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="website" className="text-xs text-muted-foreground">
                            Website
                          </Label>
                          <Input
                            id="website"
                            placeholder="https://..."
                            value={formData.websiteUrl}
                            onChange={(e) => updateField("websiteUrl", e.target.value)}
                            className="h-10 text-sm bg-input border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            data-testid="input-website"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-8"
                    >
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Airdrop Allocation</Label>
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                              {formData.airdropPercent}%
                            </Badge>
                          </div>
                          <Slider
                            value={[formData.airdropPercent]}
                            onValueChange={([value]) => handlePercentChange("airdropPercent", value)}
                            max={100}
                            step={1}
                            className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-primary [&_.bg-primary]:to-orange-400"
                            data-testid="slider-airdrop"
                          />
                          <p className="text-xs text-muted-foreground">Tokens distributed to community participants</p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Creator Allocation</Label>
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                              {formData.creatorPercent}%
                            </Badge>
                          </div>
                          <Slider
                            value={[formData.creatorPercent]}
                            onValueChange={([value]) => handlePercentChange("creatorPercent", value)}
                            max={100}
                            step={1}
                            className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-primary [&_.bg-primary]:to-orange-400"
                            data-testid="slider-creator"
                          />
                          <p className="text-xs text-muted-foreground">Reserved for project team and development</p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Liquidity Pool</Label>
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                              {formData.liquidityPercent}%
                            </Badge>
                          </div>
                          <Slider
                            value={[formData.liquidityPercent]}
                            onValueChange={([value]) => handlePercentChange("liquidityPercent", value)}
                            max={100}
                            step={1}
                            className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-primary [&_.bg-primary]:to-orange-400"
                            data-testid="slider-liquidity"
                          />
                          <p className="text-xs text-muted-foreground">Locked in DEX liquidity pool for trading</p>
                        </div>
                      </div>

                      <div className={`p-6 rounded-xl border-2 transition-all ${
                        totalPercent === 100 
                          ? "bg-primary/5 border-primary/30" 
                          : "bg-destructive/5 border-destructive/30"
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Total Allocation</span>
                          <Badge 
                            variant={totalPercent === 100 ? "default" : "destructive"}
                            className="text-base px-4 py-1"
                          >
                            {totalPercent}%
                          </Badge>
                        </div>
                        {totalPercent !== 100 && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-destructive mt-2"
                          >
                            Please adjust allocations to equal 100%
                          </motion.p>
                        )}
                        {totalPercent === 100 && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-primary mt-2"
                          >
                            Perfect! Your tokenomics are balanced
                          </motion.p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="minLiquidity" className="text-sm font-medium">
                          Initial Liquidity (XLM) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="minLiquidity"
                          type="number"
                          placeholder="500"
                          value={formData.minimumLiquidity}
                          onChange={(e) => updateField("minimumLiquidity", e.target.value)}
                          className={`h-12 bg-input border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
                            errors.minimumLiquidity ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
                          }`}
                          data-testid="input-min-liquidity"
                        />
                        {errors.minimumLiquidity ? (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-destructive"
                          >
                            {errors.minimumLiquidity}
                          </motion.p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Minimum 500 XLM required for liquidity lock
                          </p>
                        )}
                      </div>

                      <div className="p-6 bg-secondary/50 rounded-xl border border-border space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="vesting" className="text-sm font-medium cursor-pointer">
                              Enable Team Vesting
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Lock team tokens with time-based release schedule
                            </p>
                          </div>
                          <Switch
                            id="vesting"
                            checked={formData.hasVesting}
                            onCheckedChange={(checked) => updateField("hasVesting", checked)}
                            className="data-[state=checked]:bg-primary"
                            data-testid="switch-vesting"
                          />
                        </div>

                        <AnimatePresence>
                          {formData.hasVesting && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="space-y-2 pt-2 border-t border-border"
                            >
                              <Label htmlFor="vestingDays" className="text-sm font-medium">
                                Vesting Period (Days)
                              </Label>
                              <Input
                                id="vestingDays"
                                type="number"
                                value={formData.vestingPeriodDays}
                                onChange={(e) => updateField("vestingPeriodDays", parseInt(e.target.value))}
                                className="h-10 bg-input border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                data-testid="input-vesting-days"
                              />
                              <p className="text-xs text-muted-foreground">
                                Tokens will be locked and released gradually over this period
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Participation Period</Label>
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                            {formData.participationPeriodDays} days
                          </Badge>
                        </div>
                        <Slider
                          value={[formData.participationPeriodDays]}
                          onValueChange={([value]) => updateField("participationPeriodDays", value)}
                          min={3}
                          max={15}
                          step={1}
                          className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-primary [&_.bg-primary]:to-orange-400"
                          data-testid="slider-participation"
                        />
                        <p className="text-xs text-muted-foreground">
                          How long users can participate in the airdrop (3-15 days)
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="hidden md:flex items-center justify-center">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ duration: 0.5, type: "spring" }}
                  className="w-48 h-48"
                >
                  {step === 1 && <RocketIcon />}
                  {step === 2 && <SettingsIcon />}
                  {step === 3 && <LaunchIcon />}
                </motion.div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={step === 1 ? onClose : () => setStep(step - 1)}
                disabled={createProjectMutation.isPending}
                className="hover:bg-white/5 border-border h-12 px-6"
                data-testid="button-back"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {step === 1 ? "Cancel" : "Back"}
              </Button>

              <Button
                onClick={step === 3 ? handleSubmit : handleNext}
                disabled={(step === 2 && totalPercent !== 100) || createProjectMutation.isPending}
                className="bg-gradient-to-r from-primary to-orange-400 hover:from-primary/90 hover:to-orange-400/90 h-12 px-8 shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40"
                data-testid="button-next"
              >
                {step === 3 ? (
                  createProjectMutation.isPending ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      Launching...
                    </>
                  ) : (
                    "Launch Token"
                  )
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
