import * as LucideIcons from "lucide-react";

export const Icons = {
  // Navigation
  Dashboard: LucideIcons.LayoutDashboard,
  Tasks: LucideIcons.ListChecks,
  Wallet: LucideIcons.Wallet,
  Submissions: LucideIcons.ClipboardList,
  Review: LucideIcons.ClipboardCheck,
  Profile: LucideIcons.UserCircle,
  Bell: LucideIcons.Bell,
  Logout: LucideIcons.LogOut,
  Home: LucideIcons.Home,

  // Auth
  Mail: LucideIcons.Mail,
  Lock: LucideIcons.Lock,
  User: LucideIcons.User,
  Eye: LucideIcons.Eye,
  EyeOff: LucideIcons.EyeOff,
  ArrowRight: LucideIcons.ArrowRight,
  ArrowLeft: LucideIcons.ArrowLeft,

  // Roles
  Advertiser: LucideIcons.Megaphone,
  Earner: LucideIcons.Coins,

  // Actions
  Pause: LucideIcons.Pause,
  Play: LucideIcons.Play,
  Cancel: LucideIcons.XCircle,
  Approve: LucideIcons.CheckCircle,
  Edit: LucideIcons.Pencil,
  Confirm: LucideIcons.Check,
  Close: LucideIcons.X,
  Rocket: LucideIcons.Rocket,
  Send: LucideIcons.Send,
  Refresh: LucideIcons.RefreshCw,
  Download: LucideIcons.Download,
  Upload: LucideIcons.Upload,
  Copy: LucideIcons.Copy,
  Trash: LucideIcons.Trash2,
  Plus: LucideIcons.Plus,
  Filter: LucideIcons.Filter,

  // Status / info
  Clock: LucideIcons.Clock,
  Trending: LucideIcons.TrendingUp,
  Star: LucideIcons.Star,
  ExternalLink: LucideIcons.ExternalLink,
  MarkAllRead: LucideIcons.CheckCheck,
  Verified: LucideIcons.ShieldCheck,
  Info: LucideIcons.Info,
  Warning: LucideIcons.AlertTriangle,
  Success: LucideIcons.CheckCircle2,
  Error: LucideIcons.XCircle,
  Trophy: LucideIcons.Trophy,
  Award: LucideIcons.Award,
  Share: LucideIcons.Share2,
  Users: LucideIcons.Users,

  // Finance
  CoinIn: LucideIcons.ArrowDownCircle,
  CoinOut: LucideIcons.ArrowUpCircle,
  Banknote: LucideIcons.Banknote,
  CreditCard: LucideIcons.CreditCard,
  PiggyBank: LucideIcons.PiggyBank,
  Coins: LucideIcons.Coins,

  // Misc
  Globe: LucideIcons.Globe,
  Link: LucideIcons.Link,
  Image: LucideIcons.Image,
  File: LucideIcons.File,
  Search: LucideIcons.Search,
  Settings: LucideIcons.Settings,
  HelpCircle: LucideIcons.HelpCircle,
  ChevronDown: LucideIcons.ChevronDown,
  ChevronRight: LucideIcons.ChevronRight,
} as const;

export type IconName = keyof typeof Icons;
