import toast from 'react-hot-toast';

export const notify = {
  success: (message: string) => toast.success(message),

  error: (message: string) => toast.error(message),

  info: (message: string) =>
    toast(message, {
      icon: 'ℹ️',
      style: { border: '1px solid rgba(124,58,237,0.35)' },
    }),

  // Coin earning celebration
  coinsEarned: (amount: number, taskTitle?: string) =>
    toast.success(`+${amount} 🪙 earned${taskTitle ? ` — ${taskTitle}` : ''}`, {
      icon: '🎉',
      duration: 4000,
      style: {
        border: '1px solid rgba(16,185,129,0.35)',
        background: '#151D2E',
        fontWeight: '600',
      },
    }),

  // Wallet funded
  walletFunded: (amount: number) =>
    toast.success(`🪙${amount.toLocaleString()} added to your wallet!`, {
      icon: '💳',
    }),

  // Task posted (advertiser)
  taskPosted: (totalCost: number) =>
    toast.success(`Task posted! 🪙${totalCost.toLocaleString()} deducted from wallet.`, {
      icon: '🚀',
    }),
};