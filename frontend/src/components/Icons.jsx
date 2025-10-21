/**
 * Custom Icon Components
 * Clean, minimal, monochromatic line-based icons in WAGO green (#009933)
 */

const IconWrapper = ({ children, size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    {children}
  </svg>
);

// Dashboard / Home
export const DashboardIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <rect x="3" y="3" width="8" height="8" stroke="currentColor" strokeWidth="2" />
    <rect x="13" y="3" width="8" height="8" stroke="currentColor" strokeWidth="2" />
    <rect x="3" y="13" width="8" height="8" stroke="currentColor" strokeWidth="2" />
    <rect x="13" y="13" width="8" height="8" stroke="currentColor" strokeWidth="2" />
  </IconWrapper>
);

// Battery Charging / Stations
export const BatteryChargingIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <rect x="4" y="6" width="13" height="12" rx="1" stroke="currentColor" strokeWidth="2" />
    <path d="M17 10h1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1" stroke="currentColor" strokeWidth="2" />
    <path d="M11 9l-2 4h3l-2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </IconWrapper>
);

// Power / Electric
export const PowerIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M12 6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </IconWrapper>
);

// Activity / Load
export const ActivityIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M3 12h4l3-9 4 18 3-9h4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </IconWrapper>
);

// Sun / Solar / PV
export const SunIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42m12.72-12.72l1.42-1.42"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </IconWrapper>
);

// Calendar / Schedule
export const CalendarIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="7" y="14" width="2" height="2" fill="currentColor" />
    <rect x="11" y="14" width="2" height="2" fill="currentColor" />
    <rect x="15" y="14" width="2" height="2" fill="currentColor" />
  </IconWrapper>
);

// Chart / Analytics
export const ChartIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M4 20V10m5 10V4m5 16v-9m5 9V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </IconWrapper>
);

// Settings / Gear
export const SettingsIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 1v3m0 16v3M3.93 3.93l2.12 2.12m12.02 12.02l2.12 2.12M1 12h3m16 0h3M3.93 20.07l2.12-2.12m12.02-12.02l2.12-2.12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </IconWrapper>
);

// Plus / Add
export const PlusIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </IconWrapper>
);

// Trash / Delete
export const TrashIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </IconWrapper>
);

// X / Close
export const XIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </IconWrapper>
);

// Moon / Dark Mode
export const MoonIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </IconWrapper>
);

// Upload
export const UploadIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M12 4v13m0-13l-4 4m4-4l4 4M3 20h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </IconWrapper>
);

// File / Document
export const FileTextIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 2v6h6M10 13h4M10 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </IconWrapper>
);

// Alert / Warning
export const AlertCircleIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </IconWrapper>
);

// Check / Success
export const CheckCircleIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </IconWrapper>
);

// Sparkles / AI
export const SparklesIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </IconWrapper>
);

// Loader / Spinner
export const LoaderIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="15" strokeLinecap="round" />
    <path d="M12 6v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </IconWrapper>
);

// Menu / Hamburger
export const MenuIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </IconWrapper>
);

// Zap / Lightning
export const ZapIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </IconWrapper>
);

// Gauge / Meter
export const GaugeIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" stroke="currentColor" strokeWidth="2" />
    <path d="M12 12l3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </IconWrapper>
);

// Layers
export const LayersIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </IconWrapper>
);

// Download
export const DownloadIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M12 4v13m0 0l-4-4m4 4l4-4M3 20h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </IconWrapper>
);

// Info
export const InfoIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 16v-4m0-4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </IconWrapper>
);

// Eye
export const EyeIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
  </IconWrapper>
);

// Copy
export const CopyIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" />
  </IconWrapper>
);

// Filter
export const FilterIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </IconWrapper>
);

// Refresh
export const RefreshIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M21.5 2v6h-6M2.5 22v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </IconWrapper>
);

// TrendingUp
export const TrendingUpIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M23 6l-9.5 9.5-5-5L1 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </IconWrapper>
);

// AlertTriangle
export const AlertTriangleIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 9v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </IconWrapper>
);

// Clock
export const ClockIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </IconWrapper>
);

// DollarSign
export const DollarSignIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </IconWrapper>
);

// Battery (for Energy page)
export const BatteryIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <rect x="2" y="7" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M18 10h1a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-1" stroke="currentColor" strokeWidth="2" />
  </IconWrapper>
);

// Save (floppy disk)
export const SaveIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </IconWrapper>
);

export default {
  Dashboard: DashboardIcon,
  BatteryCharging: BatteryChargingIcon,
  Power: PowerIcon,
  Activity: ActivityIcon,
  Sun: SunIcon,
  Calendar: CalendarIcon,
  Chart: ChartIcon,
  Settings: SettingsIcon,
  Plus: PlusIcon,
  Trash: TrashIcon,
  X: XIcon,
  Moon: MoonIcon,
  Upload: UploadIcon,
  FileText: FileTextIcon,
  AlertCircle: AlertCircleIcon,
  CheckCircle: CheckCircleIcon,
  Sparkles: SparklesIcon,
  Loader: LoaderIcon,
  Menu: MenuIcon,
  Zap: ZapIcon,
  Gauge: GaugeIcon,
  Layers: LayersIcon,
  Download: DownloadIcon,
  Info: InfoIcon,
  Eye: EyeIcon,
  Copy: CopyIcon,
  Filter: FilterIcon,
  Refresh: RefreshIcon,
  TrendingUp: TrendingUpIcon,
  AlertTriangle: AlertTriangleIcon,
  Clock: ClockIcon,
  DollarSign: DollarSignIcon,
  Battery: BatteryIcon,
  Save: SaveIcon,
};
