/**
 * Custom Icon Components
 * Monochromatic icons with transparent background in WAGO green (#009933)
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
    <path
      d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Battery Charging / Stations
export const BatteryChargingIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4zM11 20v-5.5H9L13 7v5.5h2L11 20z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Power / Electric
export const PowerIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Activity / Load
export const ActivityIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M3 12l2-2 4 4 4-4 4 4 4-4v10H3V12z"
      fill="currentColor"
      opacity="0.3"
    />
    <path
      d="M3 12l2-2 4 4 4-4 4 4 4-4"
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
    <circle cx="12" cy="12" r="5" fill="currentColor" />
    <path
      d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </IconWrapper>
);

// Calendar / Schedule
export const CalendarIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM7 12h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Chart / Analytics
export const ChartIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M3 13h2v8H3v-8zm4-6h2v14H7V7zm4-4h2v18h-2V3zm4 9h2v9h-2v-9zm4-5h2v14h-2V7z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Settings / Gear
export const SettingsIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Plus / Add
export const PlusIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Trash / Delete
export const TrashIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
      fill="currentColor"
    />
  </IconWrapper>
);

// X / Close
export const XIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Moon / Dark Mode
export const MoonIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Upload
export const UploadIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"
      fill="currentColor"
    />
  </IconWrapper>
);

// File / Document
export const FileTextIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-6h8v2H8v-2zm0-3h8v2H8v-2zm0-3h5v2H8V8z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Alert / Warning
export const AlertCircleIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Check / Success
export const CheckCircleIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Sparkles / AI
export const SparklesIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M7 21l1.5-3.5L12 16l-3.5-1.5L7 11l-1.5 3.5L2 16l3.5 1.5L7 21zm5.5-9l1.09-2.41L16 8.5l-2.41-1.09L12.5 5l-1.09 2.41L9 8.5l2.41 1.09L12.5 12zm6.5 4l-.62-1.38L17 13l1.38-.62L19 11l.62 1.38L21 13l-1.38.62L19 15z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Loader / Spinner
export const LoaderIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Menu / Hamburger
export const MenuIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Zap / Lightning
export const ZapIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M7 2v11h3v9l7-12h-4l4-8z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Gauge / Meter
export const GaugeIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Layers
export const LayersIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Download
export const DownloadIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Info
export const InfoIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Eye
export const EyeIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Copy
export const CopyIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Filter
export const FilterIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"
      fill="currentColor"
    />
  </IconWrapper>
);

// Refresh
export const RefreshIcon = ({ size = 24, className = '' }) => (
  <IconWrapper size={size} className={className}>
    <path
      d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
      fill="currentColor"
    />
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
};
