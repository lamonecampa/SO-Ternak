import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
  Activity, 
  Map as MapIcon, 
  AlertTriangle, 
  Settings, 
  ChevronRight, 
  Signal, 
  Battery, 
  Wind, 
  Thermometer, 
  CloudRain,
  Cloud,
  Sun,
  CloudLightning,
  CloudFog,
  MapPin,
  Mountain,
  LayoutDashboard,
  Bell,
  Plus,
  User,
  Layout,
  Beef,
  Zap,
  Footprints,
  Fence,
  Sprout,
  Megaphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { cn } from './lib/utils';
import { DetailsModal } from './components/DetailsModal';
import { Livestock, LivestockType, HealthStatus, Geofence } from './types';
import { LivestockModal } from './components/LivestockModal';

// Fix for default marker icon in Leaflet + React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIconRetina,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// --- Types ---
// (Types moved to src/types.ts)

interface ForecastDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  code: number;
  description: string;
}

interface WeatherData {
  temperature: number;
  description: string;
  windSpeed: number;
  windDirection: number;
  code: number;
  forecast: ForecastDay[];
}

// --- Constants & Mock Data ---

const WEATHER_DESCRIPTIONS: Record<number, { text: string; Icon: any }> = {
  0: { text: 'Langit Cerah', Icon: Sun },
  1: { text: 'Cerah Berawan', Icon: Sun },
  2: { text: 'Berawan Sebagian', Icon: Cloud },
  3: { text: 'Mendung', Icon: Cloud },
  45: { text: 'Berkabut', Icon: CloudFog },
  48: { text: 'Berkabut', Icon: CloudFog },
  51: { text: 'Gerimis', Icon: CloudRain },
  61: { text: 'Hujan', Icon: CloudRain },
  71: { text: 'Bersalju', Icon: CloudRain },
  80: { text: 'Hujan Ringan', Icon: CloudRain },
  95: { text: 'Badai Petir', Icon: CloudLightning },
};

const getWindDirection = (deg: number) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(deg / 45) % 8];
};

const MOCK_LIVESTOCK: Livestock[] = [
  { 
    id: 'S001', name: 'Sapi Bali Alpha', type: 'cow', 
    lat: -8.2917, lng: 117.9708, alt: 350, health: 'good', battery: 85, 
    lastUpdate: new Date().toISOString(), heartRate: [65, 68, 72, 69, 75, 78, 74],
    speed: 2.4,
    heartRateSensor: {
      currentRate: 74,
      lastReadingTime: new Date().toISOString()
    }
  },
  { 
    id: 'K002', name: 'Kambing Etawa Beta', type: 'goat', 
    lat: -8.2950, lng: 117.9750, alt: 362, health: 'excellent', battery: 92, 
    lastUpdate: new Date().toISOString(), heartRate: [82, 85, 88, 86, 90, 89, 87],
    speed: 1.2,
    heartRateSensor: {
      currentRate: 87,
      lastReadingTime: new Date().toISOString()
    }
  },
  { 
    id: 'H003', name: 'Kuda Sumbawa Gamma', type: 'horse', 
    lat: -8.2850, lng: 117.9650, alt: 345, health: 'fair', battery: 42, 
    lastUpdate: new Date().toISOString(), heartRate: [45, 48, 52, 50, 55, 58, 54],
    speed: 8.5,
    heartRateSensor: {
      currentRate: 54,
      lastReadingTime: new Date().toISOString()
    }
  },
  { 
    id: 'S004', name: 'Sapi Bali Delta', type: 'cow', 
    lat: -8.3000, lng: 117.9600, alt: 330, health: 'poor', battery: 65, 
    lastUpdate: new Date(Date.now() - 3600000).toISOString(), heartRate: [55, 58, 52, 48, 50, 45, 42],
    speed: 0.5,
    heartRateSensor: {
      currentRate: 42,
      lastReadingTime: new Date(Date.now() - 3600000).toISOString()
    }
  },
];

const MOCK_GEOFENCE: Geofence = {
  id: 'G001',
  center: { lat: -8.2917, lng: 117.9708 },
  radius: 2500
};

const MOCK_ALERTS = [
  { id: 'AL-001', type: 'danger', title: 'Geofence Breach', msg: 'Kambing #08 keluar batas utama sektor utara.', time: '10 mins ago', isRead: false },
  { id: 'AL-002', type: 'warning', title: 'Battery Low', msg: 'Kuda H003 daya baterai 42% (Magnetik Sync diperlukan).', time: '1 hour ago', isRead: false },
  { id: 'AL-003', type: 'info', title: 'System Heartbeat', msg: 'Kluster Tambora sinkronisasi sukses 100%.', time: '3 hours ago', isRead: false },
];

const AnimalIcon = ({ type, className, size = 24, strokeWidth = 2 }: { type: string; className?: string; size?: number; strokeWidth?: number }) => {
  const cowIconPath = <path d="M17 13V16C17 17.1046 16.1046 18 15 18H9C7.89543 18 7 17.1046 7 16V13M17 13H7M17 13L18 11M7 13L6 11M18 11C18 9.5 17.5 8.5 16 8.5C14.5 8.5 14 9.5 14 11M6 11C6 9.5 6.5 8.5 8 8.5C9.5 8.5 10 9.5 10 11M16 8.5V6.5C16 5.5 15.5 5 14.5 5C13.5 5 13 5.5 13 6.5M8 8.5V6.5C8 5.5 8.5 5 9.5 5C10.5 5 11 5.5 11 6.5M13 5C13 5 12.5 4 12 4C11.5 4 11 5 11 5" />;
  const horseIconPath = <path d="M7 11L5 8M10 6L9 4M14 6L15 4M17 11L19 8M8 12C8 10 9 8 12 8C15 8 16 10 16 12M16 12V15M16 15L17 17M16 15H8M8 15V12M8 15L7 17M12 8V6.5" />;
  const goatIconPath = <path d="M12 18H9M15 18H12M12 18V13M12 13L15 11C16 10 17 9 17 7.5C17 6 16 5 14.5 5C13 5 12 6 12 7.5M12 13L9 11C8 10 7 9 7 7.5C7 6 8 5 9.5 5C11 5 12 6 12 7.5" />;

  const paths = {
    cow: cowIconPath,
    horse: horseIconPath,
    goat: goatIconPath
  };

  return (
    <svg 
      viewBox="0 0 24 24" 
      width={size} 
      height={size} 
      stroke="currentColor" 
      strokeWidth={strokeWidth} 
      fill="none" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      {paths[type as keyof typeof paths] || cowIconPath}
    </svg>
  );
};

// --- Components ---

function HealthBadge({ status }: { status: HealthStatus }) {
  const colors = {
    excellent: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    good: 'bg-emerald-500/10 text-emerald-500/80 border-emerald-500/20',
    fair: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    poor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };
  const labels = {
    excellent: 'Sangat Baik',
    good: 'Baik',
    fair: 'Cukup',
    poor: 'Buruk',
  };
  return (
    <span className={cn("status-tag border", colors[status])}>
      {labels[status]}
    </span>
  );
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// --- Helper for Custom Marker Icons ---
const getAnimalMarkerIcon = (type: string) => {
  const colors = {
    cow: '#3b82f6', // Bright Blue 500
    horse: '#f59e0b', // Amber 500
    goat: '#a3e635' // Lime 400
  };

  const iconColor = colors[type as keyof typeof colors] || '#94a3b8';
  
  // Custom SVG paths that better represent the animals
  const cowIconPath = `<path d="M17 13V16C17 17.1046 16.1046 18 15 18H9C7.89543 18 7 17.1046 7 16V13M17 13H7M17 13L18 11M7 13L6 11M18 11C18 9.5 17.5 8.5 16 8.5C14.5 8.5 14 9.5 14 11M6 11C6 9.5 6.5 8.5 8 8.5C9.5 8.5 10 9.5 10 11M16 8.5V6.5C16 5.5 15.5 5 14.5 5C13.5 5 13 5.5 13 6.5M8 8.5V6.5C8 5.5 8.5 5 9.5 5C10.5 5 11 5.5 11 6.5M13 5C13 5 12.5 4 12 4C11.5 4 11 5 11 5" />`;
  const horseIconPath = `<path d="M7 11L5 8M10 6L9 4M14 6L15 4M17 11L19 8M8 12C8 10 9 8 12 8C15 8 16 10 16 12M16 12V15M16 15L17 17M16 15H8M8 15V12M8 15L7 17M12 8V6.5" />`;
  const goatIconPath = `<path d="M12 18H9M15 18H12M12 18V13M12 13L15 11C16 10 17 9 17 7.5C17 6 16 5 14.5 5C13 5 12 6 12 7.5M12 13L9 11C8 10 7 9 7 7.5C7 6 8 5 9.5 5C11 5 12 6 12 7.5" />`;

  const svgPaths = {
    cow: cowIconPath,
    horse: horseIconPath,
    goat: goatIconPath
  };

  const currentPath = svgPaths[type as keyof typeof svgPaths] || cowIconPath;

  return L.divIcon({
    className: 'custom-animal-marker',
    html: `
      <div style="
        background-color: ${iconColor};
        width: 34px;
        height: 34px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 15px ${iconColor}66;
        border: 2.5px solid white;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        position: relative;
      " onmouseover="this.style.transform='scale(1.2) translateY(-4px)'; this.style.zIndex='1000';" onmouseout="this.style.transform='scale(1) translateY(0)'; this.style.zIndex='auto';">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          ${currentPath}
        </svg>
        <div style="
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid white;
        "></div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34]
  });
};

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Livestock | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [activeTab, setActiveTab] = useState<'home' | 'map' | 'alerts' | 'manage' | 'weather' | 'lora'>('home');
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [isFeederOpen, setIsFeederOpen] = useState(false);
  const [isSirenActive, setIsSirenActive] = useState(false);

  const isDragging = useRef(false);
  
  const [loraSelectedId, setLoraSelectedId] = useState<string | null>(null);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [pingLog, setPingLog] = useState<string[]>([]);
  const [isLoraSidebarOpen, setIsLoraSidebarOpen] = useState(true);

  const runLoraPing = (animal: Livestock) => {
    if (pingingId) return;
    setPingingId(animal.id);
    setPingLog([]);
    
    const logs = [
      `[${new Date().toLocaleTimeString()}] [REQ] Menginisiasi handshake nirkabel ke node [${animal.id}]...`,
      `[${new Date().toLocaleTimeString()}] [TX] Uplink dikirim | SF: SF${animal.loraQuality?.spreadingFactor || 9} | Freq: ${animal.loraQuality?.frequency || 921.3} MHz | Daya TX: 14 dBm`,
      `[${new Date().toLocaleTimeString()}] [GATEWAY] Terdeteksi oleh "${animal.loraQuality?.gatewayName || 'GP Tambora Alpha'}" -> Kuat Sinyal: ${animal.loraQuality?.rssi || -90} dBm, SNR: ${animal.loraQuality?.snr || 5.2} dB`,
      `[${new Date().toLocaleTimeString()}] [DEC] Dekripsi paket AES-128 sukses. Integrity check (CRC): OK`,
      `[${new Date().toLocaleTimeString()}] [SENSOR] Suhu Tubuh: ${animal.temperatureSensor?.currentTemp || '38.6'}°C | Detak Jantung: ${animal.heartRateSensor?.currentRate || '74'} BPM | Baterai: ${animal.battery}%`,
      `[${new Date().toLocaleTimeString()}] [SUCCESS] Diagnosis selesai. Ping sukses, paket telemetri disinkronkan ke server web pusat. RTT: ${Math.floor(Math.random() * 45) + 25}ms.`
    ];

    let currentStep = 0;
    const addLogLine = () => {
      if (currentStep < logs.length) {
        setPingLog(prev => [...prev, logs[currentStep]]);
        currentStep++;
        setTimeout(addLogLine, 450);
      } else {
        setPingingId(null);
      }
    };
    addLogLine();
  };

  const handleMarkerDragStart = () => {
    isDragging.current = true;
  };

  const handleMarkerDragEnd = async (id: string, event: any) => {
    isDragging.current = false;
    const marker = event.target;
    const position = marker.getLatLng();
    const newPos = { lat: position.lat, lng: position.lng };
    
    // Update local state immediately for responsiveness
    setLivestock(prev => prev.map(animal => 
      animal.id === id ? { ...animal, ...newPos } : animal
    ));
    
    try {
      await axios.put(`/api/livestock/${id}`, newPos);
    } catch (err) {
      console.error('Failed to update marker position:', err);
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', Icon: LayoutDashboard },
    { id: 'map', label: 'Peta', Icon: MapIcon },
    { id: 'lora', label: 'Koneksi LoRa', Icon: Signal },
    { id: 'alerts', label: 'Peringatan', Icon: Bell },
    { id: 'manage', label: 'Urus Ternak', Icon: Activity },
    { id: 'weather', label: 'Cuaca', Icon: Cloud },
  ];

  const loadWeather = async () => {
    try {
      const response = await axios.get('/api/weather');
      const data = response.data;
      const current = data.current;
      const daily = data.daily;
      const code = current.weather_code;

      const forecast = daily.time.slice(1, 3).map((timeSnapshot: string, i: number) => {
        const fcCode = daily.weather_code[i + 1];
        return {
          date: timeSnapshot,
          maxTemp: daily.temperature_2m_max[i + 1],
          minTemp: daily.temperature_2m_min[i + 1],
          code: fcCode,
          description: WEATHER_DESCRIPTIONS[fcCode]?.text || 'Berawan'
        };
      });

      setWeather({
        temperature: current.temperature_2m,
        description: WEATHER_DESCRIPTIONS[code]?.text || 'Berawan',
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        code: code,
        forecast: forecast
      });
    } catch (err) {
      console.error('Weather load error:', err);
    }
  };

  const loadLiveDataTable = async () => {
    if (isDragging.current) return;
    try {
      const response = await axios.get('/api/livestock/live');
      const data = response.data;
      setLivestock(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load livestock data:', err);
      setError('Koneksi terputus. Menggunakan data cache.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLivestock = async (animal: any) => {
    try {
      const response = await axios.post('/api/livestock', animal);
      if (response.status === 201) {
        setShowAddModal(false);
        // Refresh immediately after adding
        await loadLiveDataTable();
        // Automatically select the new animal and switch to map view
        if (response.data?.id) {
          setSelectedId(response.data.id);
          setActiveTab('map');
        }
      }
    } catch (err) {
      console.error('Failed to add livestock:', err);
    }
  };

  const handleUpdateLivestock = async (animal: any) => {
    if (!editingAnimal) return;
    try {
      const response = await axios.put(`/api/livestock/${editingAnimal.id}`, animal);
      if (response.status === 200) {
        setEditingAnimal(null);
        setSelectedId(null);
        await loadLiveDataTable();
      }
    } catch (err) {
      console.error('Failed to update livestock:', err);
    }
  };

  const handleDeleteLivestock = async (id: string) => {
    try {
      const response = await axios.delete(`/api/livestock/${id}`);
      if (response.status === 200) {
        setSelectedId(null);
        loadLiveDataTable();
      }
    } catch (err) {
      console.error('Failed to delete livestock:', err);
    }
  };

  useEffect(() => {
    // Initial load
    loadLiveDataTable();
    loadWeather();

    // Set up polling interval (5 seconds)
    const interval = setInterval(loadLiveDataTable, 5000);
    // Fetch weather every 10 minutes
    const weatherInterval = setInterval(loadWeather, 600000);

    return () => {
      clearInterval(interval);
      clearInterval(weatherInterval);
    };
  }, []);

  useEffect(() => {
    if (selectedId) {
      setLoraSelectedId(selectedId);
    }
  }, [selectedId]);
  
  const selectedAnimal = useMemo(() => 
    livestock.find(l => l.id === selectedId) || null
  , [selectedId, livestock]);

  const inventory = useMemo(() => ({
    cow: livestock.filter(l => l.type === 'cow').length,
    goat: livestock.filter(l => l.type === 'goat').length,
    horse: livestock.filter(l => l.type === 'horse').length,
  }), [livestock]);

  const sidebarAnimal = useMemo(() => {
    const targetId = loraSelectedId || selectedId || (livestock.length > 0 ? livestock[0].id : null);
    return livestock.find(a => a.id === targetId) || livestock[0] || null;
  }, [loraSelectedId, selectedId, livestock]);

  const mapCenter: [number, number] = selectedAnimal 
    ? [selectedAnimal.lat, selectedAnimal.lng]
    : [MOCK_GEOFENCE.center.lat, MOCK_GEOFENCE.center.lng];

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Top Navigation Header */}
      <header className="flex items-center justify-between px-6 py-2.5 bg-slate-900/80 backdrop-blur-2xl border-b border-slate-800/50 sticky top-0 z-[1001] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center shadow-lg shadow-brand/20">
            <Signal className="w-5 h-5 text-slate-950" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold tracking-tight text-white leading-tight">SO-Ternak</h1>
            <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Monitoring</p>
          </div>
        </div>

        {/* Compact Horizontal Nav */}
        <nav className="flex items-center gap-1 bg-slate-800/30 p-1 rounded-xl border border-white/5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 relative",
                activeTab === item.id 
                  ? "bg-brand text-slate-950 font-bold shadow-sm" 
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <div className="relative">
                <item.Icon className={cn("w-4 h-4", activeTab === item.id ? "text-slate-950" : "")} />
                {item.id === 'alerts' && alerts.filter(a => !a.isRead).length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 text-[8px] font-bold text-white rounded-full flex items-center justify-center border border-slate-900 shadow-lg">
                    {alerts.filter(a => !a.isRead).length}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium hidden md:block">{item.label}</span>
              {activeTab === item.id && (
                <motion.div 
                  layoutId="header-active"
                  className="absolute inset-0 bg-brand rounded-lg -z-10"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
           <button
             onClick={() => setIsLoraSidebarOpen(!isLoraSidebarOpen)}
             title="Toggle Panel LoRa"
             className={cn(
               "p-1.5 px-3 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase",
               isLoraSidebarOpen 
                 ? "bg-brand/10 border-brand/20 text-brand" 
                 : "bg-slate-800/40 border-white/5 text-slate-400 hover:text-slate-200"
             )}
           >
             <Signal className={cn("w-3.5 h-3.5", isLoraSidebarOpen ? "animate-pulse" : "")} />
             <span className="hidden sm:inline">Panel LoRa</span>
           </button>

           <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/40 border border-slate-700/50">
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", error ? "bg-rose-500" : "bg-brand")}></div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">
                {loading ? "Sinkron..." : error ? "Off" : "Online"}
              </span>
           </div>
           
           <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
              <div className="text-right leading-none hidden xs:block">
                 <p className="text-[10px] font-bold text-slate-200">Admin</p>
              </div>
              <div className="w-7 h-7 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center">
                 <User className="w-3.5 h-3.5 text-brand" />
              </div>
           </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 flex flex-col min-w-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 overflow-hidden relative",
        isLoraSidebarOpen ? "lg:flex-row" : "lg:flex-col"
      )}>
        <div className={cn(
          "flex-1 overflow-x-hidden transition-all duration-500",
          activeTab === 'map' ? "overflow-hidden p-0" : "overflow-y-auto p-4 md:p-6"
        )}>
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-12 md:grid-rows-6 gap-4 md:gap-6 h-full min-h-[800px] md:min-h-0"
              >
                {/* Map View - Bento Block */}
                <section className="md:col-span-9 md:row-span-4 bento-card relative min-h-[450px] md:min-h-0 order-1 z-0 overflow-hidden shadow-2xl shadow-brand/5">
                  <MapContainer 
                    center={mapCenter} 
                    zoom={14} 
                    scrollWheelZoom={true} 
                    className="w-full h-full"
                    style={{ background: '#020617' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      className="map-grayscale"
                    />
                    <MapUpdater center={mapCenter} />
                    
                    <Circle 
                      center={[MOCK_GEOFENCE.center.lat, MOCK_GEOFENCE.center.lng]} 
                      radius={MOCK_GEOFENCE.radius}
                      pathOptions={{
                        color: '#10b981',
                        fillColor: '#10b981',
                        fillOpacity: 0.1,
                        weight: 2,
                        dashArray: '5, 10'
                      }}
                    />
                    
                    {livestock.map((animal, idx) => (
                      <Marker 
                        key={`${animal.id}-${idx}`} 
                        position={[animal.lat, animal.lng]}
                        icon={getAnimalMarkerIcon(animal.type)}
                        draggable={true}
                        eventHandlers={{
                          click: () => setSelectedId(animal.id),
                          dragstart: handleMarkerDragStart,
                          dragend: (e) => handleMarkerDragEnd(animal.id, e)
                        }}
                      >
                        <Popup>
                          <div className="p-1 min-w-[120px]">
                            <div className="font-bold text-slate-900">{animal.name}</div>
                            <div className="text-[10px] text-slate-500 uppercase">{animal.type === 'cow' ? 'Sapi' : animal.type === 'horse' ? 'Kuda' : 'Kambing'} • Status: {
                              animal.health === 'excellent' ? 'Sangat Baik' : animal.health === 'good' ? 'Baik' : animal.health === 'fair' ? 'Cukup' : 'Buruk'
                            }</div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                  
                  <div className="absolute top-4 left-4 z-[1000]">
                    <div className="glass-morphism px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-white italic">Live Cluster Data</span>
                    </div>
                  </div>
                </section>

                {/* Weather - Bento Block */}
                <section className="md:col-span-3 md:row-span-1 bento-card p-4 flex items-center justify-between order-2 bg-slate-900/40">
                  {weather ? (
                    <>
                      <div>
                        <h3 className="text-[8px] uppercase font-bold text-slate-500 tracking-[0.2em] mb-1">Cuaca</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold">{Math.round(weather.temperature)}°C</span>
                          <span className="text-brand text-[10px] font-bold uppercase">{weather.description}</span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        {React.createElement(WEATHER_DESCRIPTIONS[weather.code]?.Icon || CloudRain, {
                          className: "w-6 h-6 text-slate-400"
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center w-full animate-pulse text-slate-500 text-[10px] uppercase font-bold">
                      Sync...
                    </div>
                  )}
                </section>

                {/* Inventory - Bento Block */}
                <section className="md:col-span-3 md:row-span-2 bento-card p-4 order-3 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[8px] uppercase font-bold text-slate-500 tracking-[0.2em]">Ternak</h3>
                    <button onClick={() => setShowAddModal(true)} className="w-6 h-6 flex items-center justify-center bg-brand/10 text-brand rounded-lg border border-brand/20">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {[
                      { l: 'Sapi', c: inventory.cow, t: 'cow', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                      { l: 'Kuda', c: inventory.horse, t: 'horse', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                      { l: 'Kambing', c: inventory.goat, t: 'goat', color: 'text-brand', bg: 'bg-brand/10' },
                    ].map(item => (
                      <div key={item.l} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/20 border border-white/5 transition-hover hover:border-white/10 group">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border border-white/5 transition-transform group-hover:scale-110", item.bg)}>
                            <AnimalIcon type={item.t} className={item.color} size={18} strokeWidth={2.5} />
                          </div>
                          <span className="text-[11px] font-medium text-slate-300">{item.l}</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-white">{item.c}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Alerts - Bento Block */}
                <section className="md:col-span-3 md:row-span-3 bento-card p-4 flex flex-col order-4 overflow-hidden">
                  <h3 className="text-[8px] uppercase font-bold text-slate-500 tracking-[0.2em] mb-3">Logs</h3>
                  <div className="space-y-2 overflow-y-auto pr-1">
                    <div className="p-2.5 bg-danger/5 border border-danger/10 rounded-xl">
                      <p className="text-danger text-[8px] font-bold uppercase mb-0.5">Geofence • 08:42</p>
                      <p className="text-[10px] text-slate-300">#08 Keluar Sektor Utara</p>
                    </div>
                    <div className="p-2.5 bg-warning/5 border border-warning/10 rounded-xl">
                      <p className="text-warning text-[8px] font-bold uppercase mb-0.5">Baterai • 07:15</p>
                      <p className="text-[10px] text-slate-300">H003 (42%) Kritis</p>
                    </div>
                  </div>
                </section>

                {/* Telemetry - Bento Block */}
                <section className="md:col-span-9 md:row-span-2 bento-card p-4 order-5">
                  {selectedAnimal ? (
                    <div className="grid grid-cols-1 md:grid-cols-12 h-full gap-4 md:gap-6">
                      <div className="md:col-span-5 flex flex-col justify-between">
                         <div>
                            <div className="flex items-center justify-between mb-1">
                               <h3 className="text-base font-bold text-white leading-none">{selectedAnimal.name}</h3>
                               <HealthBadge status={selectedAnimal.health} />
                            </div>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">ID: {selectedAnimal.id} • Aktif</p>
                         </div>
                         <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-800/30 p-2 rounded-lg border border-white/5">
                               <p className="text-[8px] text-slate-500 uppercase font-bold mb-0.5">Tinggi</p>
                               <p className="text-sm font-bold text-white">{selectedAnimal.alt}m</p>
                            </div>
                            <div className="bg-slate-800/30 p-2 rounded-lg border border-white/5">
                               <p className="text-[8px] text-slate-500 uppercase font-bold mb-0.5">Spd</p>
                               <p className="text-sm font-bold text-white">{selectedAnimal.speed}k/j</p>
                            </div>
                            <div className="bg-slate-800/30 p-2 rounded-lg border border-white/5">
                               <p className="text-[8px] text-slate-500 uppercase font-bold mb-0.5">Bat</p>
                               <p className={cn("text-sm font-bold", selectedAnimal.battery < 30 ? "text-danger" : "text-brand")}>{selectedAnimal.battery}%</p>
                            </div>
                         </div>
                         <div className="mt-4 flex items-center gap-3">
                            <button 
                              onClick={() => setIsGateOpen(!isGateOpen)} 
                              className={cn(
                                "flex-1 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2",
                                isGateOpen ? "bg-brand/10 border-brand/20 text-brand" : "bg-slate-800/40 border-white/5 text-slate-500"
                              )}
                            >
                              <Fence className="w-3 h-3" /> {isGateOpen ? 'Gerbang Buka' : 'Gerbang Tutup'}
                            </button>
                            <button 
                              onClick={() => setIsFeederOpen(!isFeederOpen)} 
                              className={cn(
                                "flex-1 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2",
                                isFeederOpen ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-slate-800/40 border-white/5 text-slate-500"
                              )}
                            >
                              <Sprout className="w-3 h-3" /> {isFeederOpen ? 'Pakan Buka' : 'Pakan Tutup'}
                            </button>
                            <button 
                              onClick={() => setIsSirenActive(!isSirenActive)} 
                              className={cn(
                                "flex-1 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2",
                                isSirenActive ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-slate-800/40 border-white/5 text-slate-500"
                              )}
                            >
                              <Megaphone className="w-3 h-3" /> {isSirenActive ? 'Sirine ON' : 'Sirine OFF'}
                            </button>
                         </div>
                      </div>
                      <div className="md:col-span-7 bg-slate-900/40 rounded-xl border border-white/5 p-3 flex flex-col">
                         <p className="text-[8px] uppercase font-bold text-slate-500 tracking-[0.2em] mb-2">Detak Jantung (BPM)</p>
                         <div className="flex-1 min-h-[60px]">
                           <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={selectedAnimal.heartRate.map((hr, i) => ({ t: i, v: hr }))}>
                                 <defs>
                                    <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#d9f99d" stopOpacity={0.2}/>
                                       <stop offset="95%" stopColor="#d9f99d" stopOpacity={0}/>
                                    </linearGradient>
                                 </defs>
                                 <Area type="monotone" dataKey="v" stroke="#bef264" fill="url(#colorHr)" strokeWidth={1.5} isAnimationActive={false} />
                              </AreaChart>
                           </ResponsiveContainer>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-between px-4">
                      <div className="flex items-center gap-8">
                        {[
                          { type: 'cow', label: 'Sapi', count: inventory.cow, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                          { type: 'horse', label: 'Kuda', count: inventory.horse, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                          { type: 'goat', label: 'Kambing', count: inventory.goat, color: 'text-brand', bg: 'bg-brand/10' },
                        ].map((item) => (
                          <div key={item.type} className="flex items-center gap-3 group">
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border border-white/5 shadow-xl transition-all group-hover:scale-110", item.bg)}>
                              <AnimalIcon type={item.type} className={item.color} size={28} />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.label}</p>
                              <p className="text-2xl font-bold text-white">{item.count} <span className="text-xs font-normal text-slate-500 ml-1">Ekor</span></p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-6 border-l border-white/10 pl-8">
                        <div className="flex flex-col gap-2">
                          <p className="text-[8px] uppercase font-bold text-slate-500 tracking-[0.2em]">Gate Control</p>
                          <button 
                            onClick={() => setIsGateOpen(!isGateOpen)} 
                            className={cn(
                              "px-5 py-3 rounded-2xl border transition-all flex items-center gap-3 group shadow-lg",
                              isGateOpen ? "bg-brand/20 border-brand/50 text-brand shadow-brand/10" : "bg-slate-800/40 border-white/5 text-slate-400 hover:border-white/10"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                              isGateOpen ? "bg-brand text-slate-950" : "bg-slate-900 text-slate-500"
                            )}>
                              <Fence className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-[8px] font-bold uppercase opacity-60">Gerbang</p>
                              <p className="text-[11px] font-bold uppercase tracking-widest">{isGateOpen ? 'Buka' : 'Tutup'}</p>
                            </div>
                          </button>
                        </div>

                        <div className="flex flex-col gap-2">
                          <p className="text-[8px] uppercase font-bold text-slate-500 tracking-[0.2em]">Feed Area</p>
                          <button 
                            onClick={() => setIsFeederOpen(!isFeederOpen)} 
                            className={cn(
                              "px-5 py-3 rounded-2xl border transition-all flex items-center gap-3 group shadow-lg",
                              isFeederOpen ? "bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-blue-500/10" : "bg-slate-800/40 border-white/5 text-slate-400 hover:border-white/10"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                              isFeederOpen ? "bg-blue-500 text-white" : "bg-slate-900 text-slate-500"
                            )}>
                              <Sprout className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-[8px] font-bold uppercase opacity-60">Pakan</p>
                              <p className="text-[11px] font-bold uppercase tracking-widest">{isFeederOpen ? 'Buka' : 'Tutup'}</p>
                            </div>
                          </button>
                        </div>

                        <div className="flex flex-col gap-2">
                          <p className="text-[8px] uppercase font-bold text-slate-500 tracking-[0.2em]">Siren Control</p>
                          <button 
                            onClick={() => setIsSirenActive(!isSirenActive)} 
                            className={cn(
                              "px-5 py-3 rounded-2xl border transition-all flex items-center gap-3 group shadow-lg",
                              isSirenActive ? "bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-rose-500/10" : "bg-slate-800/40 border-white/5 text-slate-400 hover:border-white/10"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                              isSirenActive ? "bg-rose-500 text-white animate-pulse" : "bg-slate-900 text-slate-500"
                            )}>
                              <Megaphone className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-[8px] font-bold uppercase opacity-60">Sirine</p>
                              <p className="text-[11px] font-bold uppercase tracking-widest">{isSirenActive ? 'ON' : 'OFF'}</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </motion.div>
            )}

            {activeTab === 'map' && (
              <motion.div 
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full w-full relative"
              >
                <MapContainer center={mapCenter} zoom={15} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="map-grayscale" />
                  <MapUpdater center={mapCenter} />
                  {livestock.map((animal, idx) => (
                    <Marker 
                      key={`${animal.id}-${idx}-map`} 
                      position={[animal.lat, animal.lng]}
                      icon={getAnimalMarkerIcon(animal.type)}
                      draggable={true}
                      eventHandlers={{
                        click: () => { setSelectedId(animal.id); },
                        dragstart: handleMarkerDragStart,
                        dragend: (e) => handleMarkerDragEnd(animal.id, e)
                      }}
                    >
                      <Popup>
                        <div className="p-2">
                           <div className="font-bold">{animal.name}</div>
                           <button 
                             onClick={() => { setSelectedId(animal.id); }}
                             className="mt-2 w-full bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded"
                           >Detail Unit</button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  <Circle center={[-8.2917, 117.9708]} radius={2500} pathOptions={{ color: '#10b981', fillOpacity: 0.05 }} />
                </MapContainer>
                
                {/* Floating Map UI */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] w-max">
                   <div className="glass-morphism px-6 py-3 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-6">
                      <div className="flex flex-col">
                         <span className="text-[8px] uppercase font-bold text-slate-400">Total Unit</span>
                         <span className="text-xl font-bold text-white">{livestock.length} <span className="text-brand text-xs font-mono ml-1 flex-inline items-center gap-1">● Aktif</span></span>
                      </div>
                      <div className="w-[1px] h-8 bg-white/10" />
                      <div className="flex gap-4">
                         {Object.entries(inventory).map(([key, val]) => (
                           <div key={key} className="flex flex-col items-center">
                              <span className="text-[8px] uppercase font-bold text-slate-500">{key === 'cow' ? 'Sapi' : key === 'horse' ? 'Kuda' : 'Kmb'}</span>
                              <span className="text-sm font-bold text-white">{val}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'alerts' && (
               <motion.div 
                key="alerts"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="max-w-3xl mx-auto space-y-4"
               >
                  <div className="flex items-center justify-between mb-8">
                     <h2 className="text-3xl font-bold text-white">Log Peringatan</h2>
                     <button 
                       className="text-xs font-bold text-brand uppercase"
                       onClick={() => setAlerts(prev => prev.map(a => ({ ...a, isRead: true })))}
                     >
                       Tandai semua dibaca
                     </button>
                  </div>
                  {alerts.map((alert, i) => (
                    <div 
                      key={alert.id} 
                      className={cn(
                        "p-6 rounded-2xl border flex items-start gap-4 transition-all hover:scale-[1.01] cursor-pointer",
                        alert.type === 'danger' ? "bg-rose-500/10 border-rose-500/20" : 
                        alert.type === 'warning' ? "bg-amber-500/10 border-amber-500/20" : 
                        "bg-blue-500/10 border-blue-500/20",
                        alert.isRead ? "opacity-60 grayscale-[0.5] border-white/5 bg-slate-900/40" : "animate-in fade-in slide-in-from-left-4"
                      )}
                      onClick={() => setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, isRead: true } : a))}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
                        alert.type === 'danger' ? "bg-rose-500 shadow-rose-500/20" : 
                        alert.type === 'warning' ? "bg-amber-500 shadow-amber-500/20" : 
                        "bg-slate-700"
                      )}>
                        {alert.type === 'danger' ? <AlertTriangle className="w-5 h-5 text-white" /> : 
                         alert.type === 'warning' ? <Battery className="w-5 h-5 text-amber-950" /> : 
                         <Signal className="w-5 h-5 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                           <h4 className="font-bold text-white uppercase text-xs tracking-wider">{alert.title}</h4>
                           <span className="text-[10px] text-slate-500 font-bold">{alert.time}</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{alert.msg}</p>
                      </div>
                    </div>
                  ))}
               </motion.div>
            )}

            {activeTab === 'manage' && (
              <motion.div 
                key="manage"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-6xl mx-auto"
              >
                <div className="flex items-center justify-between mb-8">
                   <h2 className="text-3xl font-bold text-white">Inventaris Unit</h2>
                   <button 
                     onClick={() => setShowAddModal(true)}
                     className="bg-brand text-slate-950 font-bold px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-brand/20 active:scale-95 transition-transform"
                   >
                     <Plus className="w-5 h-5" /> Tambah Unit Ternak
                   </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {livestock.map((animal, idx) => (
                    <motion.div 
                      key={`${animal.id}-${idx}-manage`} 
                      drag
                      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                      dragElastic={0.05}
                      dragTransition={{ bounceStiffness: 400, bounceDamping: 30 }}
                      whileDrag={{ 
                        scale: 1.03, 
                        zIndex: 50, 
                        cursor: 'grabbing',
                        backgroundColor: "rgba(15, 23, 42, 0.9)", 
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px 2px rgba(16, 185, 129, 0.15)",
                        borderColor: "rgba(16, 185, 129, 0.3)"
                      }}
                      className="bento-card p-6 group cursor-pointer hover:border-slate-600 transition-all active:scale-[0.98]"
                      onClick={() => setSelectedId(animal.id)}
                    >
                       <div className="flex items-center justify-between mb-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                            animal.type === 'cow' ? "bg-blue-500/20 text-blue-400" :
                            animal.type === 'horse' ? "bg-amber-500/20 text-amber-400" :
                            "bg-brand/20 text-brand"
                          )}>
                             <AnimalIcon type={animal.type} size={28} />
                          </div>
                          <HealthBadge status={animal.health} />
                       </div>
                       <h3 className="text-lg font-bold text-white mb-0.5">{animal.name}</h3>
                       <p className="text-[10px] text-slate-500 font-mono mb-4 uppercase tracking-widest">{animal.type} • {animal.id}</p>
                       <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                          <div className="flex items-center gap-2">
                             <Battery className={cn("w-4 h-4", animal.battery < 30 ? "text-danger" : "text-brand")} />
                             <span className="text-xs font-bold">{animal.battery}%</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:translate-x-1 transition-transform" />
                       </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'weather' && (
              <motion.div 
                key="weather"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-5xl mx-auto pb-12"
              >
                <div className="text-center mb-8">
                   <h2 className="text-4xl font-bold text-white mb-2">Kluster Tambora</h2>
                   <p className="text-slate-400">Prakiraan cuaca mikro untuk sektor padang liar</p>
                </div>
                
                {weather ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bento-card p-10 flex flex-col items-center text-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/50 to-transparent">
                          <motion.div 
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="w-32 h-32 bg-brand/10 rounded-full flex items-center justify-center mb-8 border border-brand/20 shadow-2xl shadow-brand/10"
                          >
                            {React.createElement(WEATHER_DESCRIPTIONS[weather.code]?.Icon || Cloud, {
                                className: "w-16 h-16 text-brand"
                            })}
                          </motion.div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-brand uppercase tracking-[0.4em] mb-2">Kondisi Sekarang</span>
                            <h3 className="text-7xl font-bold text-white mb-2 tracking-tighter">{Math.round(weather.temperature)}°C</h3>
                            <p className="text-2xl text-slate-400 italic mb-4 font-light">{weather.description}</p>
                          </div>
                          <div className="px-4 py-1.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-700">
                            Diperbarui: {new Date().toLocaleTimeString()}
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                          <div className="bento-card p-8 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                  <Wind className="w-8 h-8 text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Kecepatan Angin</p>
                                  <p className="text-3xl font-bold text-white">{weather.windSpeed} <span className="text-sm font-normal text-slate-500">km/j</span></p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Arah</p>
                                <div className="text-2xl font-bold text-brand">{getWindDirection(weather.windDirection)}</div>
                            </div>
                          </div>
                          
                          <div className="bento-card p-8 bg-slate-900/40 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Cloud className="w-24 h-24" />
                            </div>
                            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                                <Signal className="w-4 h-4 text-brand" />
                                Rekomendasi Ternak
                            </h4>
                            <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                Kondisi {weather.description.toLowerCase()} dengan angin stabil. Sangat ideal untuk pelepasan unit ternak di area terbuka Sektor A dan B. Pastikan baterai unit di atas 50%.
                            </p>
                            <div className="flex gap-4">
                                <div className="flex-1 bg-brand/10 border border-brand/20 p-4 rounded-2xl text-center">
                                  <p className="text-[10px] font-bold text-brand uppercase mb-1">Visibilitas</p>
                                  <p className="text-xl font-bold text-white text-brand">Sangat Baik</p>
                                </div>
                                <div className="flex-1 bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl text-center">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">UV Index</p>
                                  <p className="text-xl font-bold text-white">Rendah</p>
                                </div>
                            </div>
                          </div>
                      </div>
                    </div>

                    {/* Forecast Section */}
                    <div>
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <Activity className="w-5 h-5 text-brand" />
                        Prakiraan 2 Hari Kedepan
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {weather.forecast.map((day, idx) => (
                          <div key={day.date} className="bento-card p-6 bg-slate-900/30 border-white/5 flex items-center justify-between group hover:border-brand/30 transition-all duration-500">
                            <div className="flex items-center gap-6">
                              <div className="w-14 h-14 rounded-2xl bg-slate-800/50 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                {React.createElement(WEATHER_DESCRIPTIONS[day.code]?.Icon || Cloud, {
                                  className: "w-7 h-7 text-slate-400 group-hover:text-brand transition-colors"
                                })}
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                  {idx === 0 ? 'Besok' : 'Lusa'} • {new Date(day.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                                </p>
                                <p className="text-sm font-bold text-white">{day.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center justify-end gap-2 mb-1">
                                <span className="text-2xl font-bold text-white">{Math.round(day.maxTemp)}°</span>
                                <span className="text-sm font-medium text-slate-500">/ {Math.round(day.minTemp)}°</span>
                              </div>
                              <div className="flex gap-1 justify-end">
                                {[1, 2, 3].map(i => (
                                  <div key={i} className={cn("w-1 h-3 rounded-full", i <= (4 - idx) ? "bg-brand/40" : "bg-slate-800")} />
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 opacity-30">
                     <Cloud className="w-16 h-16 animate-pulse mb-4 text-brand" />
                     <p className="text-xs uppercase font-bold tracking-[0.3em]">Singkronisasi Satelit Cuaca...</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'lora' && (
              <motion.div
                key="lora"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-6xl mx-auto space-y-6 pb-12"
              >
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Komunikasi LoRaWAN & Telemetri Sensor</h2>
                    <p className="text-sm text-slate-400">Diagnosis propagasi sinyal uplink/downlink frekuensi ultra-rendah dan bio-sensor ternak</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        loadLiveDataTable();
                      }}
                      className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2"
                    >
                      <Activity className="w-4 h-4 text-brand animate-pulse" /> Sinkronkan Jaringan
                    </button>
                  </div>
                </div>

                {/* Network Quality Card Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Keandalan Uplink", val: "99.2%", sub: "Packet Delivery Rate", color: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "Spreading Factor", val: "SF7 - SF12", sub: "Optimasi Dinamis ATR", color: "text-brand", bg: "bg-brand/10" },
                    { label: "Frekuensi Kerja", val: "921.3 MHz", sub: "AS923 LoRaWAN", color: "text-blue-400", bg: "bg-blue-500/10" },
                    { label: "Daya Transmisi", val: "14 dBm", sub: "Standard Node Max", color: "text-amber-400", bg: "bg-amber-500/10" },
                  ].map((card, i) => (
                    <div key={i} className="bento-card p-4 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1">{card.label}</p>
                        <h4 className="text-xl font-bold text-white leading-none mb-1">{card.val}</h4>
                        <p className="text-[10px] text-slate-400 mb-0 font-medium">{card.sub}</p>
                      </div>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border border-white/5", card.bg)}>
                        <Signal className={cn("w-5 h-5", card.color)} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Main Interactive Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column - Diagnostics & Selected Animal Bio */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Node Diagnostic Card */}
                    <div className="bento-card p-5 flex flex-col">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-brand/10 border border-brand/20 text-brand rounded-xl flex items-center justify-center">
                            <Activity className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-sm">Konsol Handshake & Uji Ping</h3>
                            <p className="text-[10px] text-slate-400">Simulasikan aliran paket LoRa ke server monitoring</p>
                          </div>
                        </div>
                        {livestock.length > 0 && (() => {
                          const currentAnimal = livestock.find(a => a.id === (loraSelectedId || livestock[0]?.id)) || livestock[0];
                          return (
                            <button
                              disabled={pingingId !== null}
                              onClick={() => runLoraPing(currentAnimal)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 shadow-md",
                                pingingId !== null
                                  ? "bg-slate-800 border border-slate-700/50 text-slate-500 cursor-not-allowed"
                                  : "bg-brand text-slate-950 hover:bg-brand/90 font-extrabold"
                              )}
                            >
                              {pingingId !== null ? "Menguji..." : "Kirim Ping"}
                            </button>
                          );
                        })()}
                      </div>

                      {/* Diagnostic Status Box */}
                      {(() => {
                        const currentAnimal = livestock.find(a => a.id === (loraSelectedId || livestock[0]?.id)) || livestock[0];
                        if (!currentAnimal) return <p className="text-slate-500 text-xs">Belum ada hewan terdaftar.</p>;
                        
                        const temp = currentAnimal.temperatureSensor?.currentTemp || 38.6;
                        const hr = currentAnimal.heartRateSensor?.currentRate || 74;
                        
                        // Judge temperature condition
                        let tempStatus = "Normal";
                        let tempColor = "text-emerald-400";
                        if (temp > 39.5) {
                          tempStatus = "⚠️ Demam/Stres Panas";
                          tempColor = "text-rose-400";
                        } else if (temp < 38.0) {
                          tempStatus = "❄️ Suhu Rendah";
                          tempColor = "text-sky-400";
                        }

                        // Judge signal condition
                        const rssi = currentAnimal.loraQuality?.rssi || -90;
                        let signalStatus = "Sangat Baik";
                        let signalColor = "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
                        if (rssi < -105) {
                          signalStatus = "Rawan Terputus";
                          signalColor = "text-rose-400 border-rose-500/20 bg-rose-500/5";
                        } else if (rssi < -85) {
                          signalStatus = "Stabil";
                          signalColor = "text-amber-400 border-brand/20 bg-brand/5";
                        }

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Bio Temperature & Heartbeat Sensor Diagnostics */}
                            <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Status Sensor Biometrik</span>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Thermometer className="w-4 h-4 text-rose-400" />
                                    <span className="text-xs text-slate-300">Suhu Tubuh</span>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-bold text-white">{temp}°C</p>
                                    <p className={cn("text-[9px] font-bold", tempColor)}>{tempStatus}</p>
                                  </div>
                                </div>
                                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                  <div 
                                    className={cn("h-full", temp > 39.5 ? "bg-rose-500" : temp < 38.0 ? "bg-sky-500" : "bg-brand")} 
                                    style={{ width: `${Math.min(100, Math.max(0, ((temp - 36) / 6) * 100))}%` }} 
                                  />
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                                    <span className="text-xs text-slate-300">Detak Jantung</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-bold text-white">{hr} <span className="text-[10px] text-slate-500 font-normal">BPM</span></span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* RSSI & Connection Info */}
                            <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Parameter Radio nirkabel</span>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-800/20 p-2 rounded-lg border border-white/5">
                                  <span className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">RSSI</span>
                                  <span className="text-xs font-mono font-bold text-white">{rssi} dBm</span>
                                </div>
                                <div className="bg-slate-800/20 p-2 rounded-lg border border-white/5">
                                  <span className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">SNR</span>
                                  <span className="text-xs font-mono font-bold text-white">{(currentAnimal.loraQuality?.snr || 6.2)} dB</span>
                                </div>
                                <div className="bg-slate-800/20 p-2 rounded-lg border border-white/5">
                                  <span className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">Spreading Factor</span>
                                  <span className="text-xs font-mono font-bold text-white">SF{(currentAnimal.loraQuality?.spreadingFactor || 9)}</span>
                                </div>
                                <div className="bg-slate-800/20 p-2 rounded-lg border border-white/5">
                                  <span className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">Bandwidth</span>
                                  <span className="text-xs font-mono font-bold text-white">125 kHz</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Log Console Output Block */}
                      <div className="bg-slate-950 rounded-xl border border-white/10 p-4 h-[200px] overflow-y-auto font-mono text-[10px] md:text-xs text-slate-300 flex flex-col gap-1.5 focus:outline-none">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2 text-slate-500 uppercase text-[9px] font-bold shrink-0">
                          <span>Live Terminal Output</span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Console Ready
                          </span>
                        </div>
                        {pingLog.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 italic">
                            <span>Tekan "Kirim Ping" di atas untuk mendiagnosis sinyal nirkabel {
                              livestock.find(a => a.id === (loraSelectedId || livestock[0]?.id))?.name || 'hewan'
                            }.</span>
                          </div>
                        ) : (
                          pingLog.map((log, index) => (
                            <div key={index} className="leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-200">
                              {log?.includes('[SUCCESS]') ? (
                                <span className="text-brand font-bold">{log}</span>
                              ) : log?.includes('[REQ]') ? (
                                <span className="text-white font-medium">{log}</span>
                              ) : log?.includes('[TX]') ? (
                                <span className="text-blue-400">{log}</span>
                              ) : log?.includes('[GATEWAY]') ? (
                                <span className="text-amber-400">{log}</span>
                              ) : log?.includes('[SENSOR]') ? (
                                <span className="text-indigo-300">{log}</span>
                              ) : (
                                <span>{log}</span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Gateway Station Map / Telemetry Links */}
                    <div className="bento-card p-5">
                      <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-3">Live Gateway Server Points</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { name: "GP Tambora Alpha (Gateway Utama)", load: "Aktif / Normal", rssi: "-82 dBm", location: "Kaki Gunung Sektor Utara", color: "bg-emerald-500/20 text-emerald-400" },
                          { name: "GP Savana Barat (Gateway Cabang)", load: "Aktif / Ringan", rssi: "-96 dBm", location: "Padang Savana Barat", color: "bg-emerald-500/20 text-emerald-400" },
                        ].map((gw, idx) => (
                          <div key={idx} className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="text-xs font-bold text-white">{gw.name}</h4>
                              <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold uppercase", gw.color)}>
                                {gw.load}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 space-y-0.5 font-medium">
                              <p>Wilayah: <span className="text-slate-200">{gw.location}</span></p>
                              <p>Signal Point: <span className="text-slate-200 font-mono">{gw.rssi}</span></p>
                              <p>Saluran Uplink: <span className="text-slate-200 font-mono">AS923 (921.3 - 921.7 MHz)</span></p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Selector List / Status of All Nodes */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bento-card p-5 flex flex-col h-full">
                      <div className="mb-4">
                        <h3 className="font-bold text-white text-sm">Status Telemetri & Sinyal Ternak</h3>
                        <p className="text-[10px] text-slate-400">Pilih salah satu hewan di bawah untuk peninjauan mendalam</p>
                      </div>

                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {livestock.map((animal) => {
                          const isSelected = animal.id === (loraSelectedId || livestock[0]?.id);
                          const rssi = animal.loraQuality?.rssi || -90;
                          const temp = animal.temperatureSensor?.currentTemp || 38.6;
                          const bpm = animal.heartRateSensor?.currentRate || 74;

                          // Evaluate health/comms colors
                          let signalBadgeColor = "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
                          let signalLabel = "Sangat Baik";
                          
                          if (rssi < -105) {
                            signalBadgeColor = "bg-rose-500/15 text-rose-400 border border-rose-500/20";
                            signalLabel = "Kritis";
                          } else if (rssi < -85) {
                            signalBadgeColor = "bg-amber-500/15 text-amber-400 border border-amber-500/20";
                            signalLabel = "Cukup";
                          }

                          let tempBadgeColor = "text-emerald-400 bg-emerald-500/5";
                          if (temp > 39.5) {
                            tempBadgeColor = "text-rose-400 bg-rose-500/5 border border-rose-500/20";
                          } else if (temp < 38.0) {
                            tempBadgeColor = "text-sky-400 bg-sky-500/5 border border-sky-500/20";
                          }

                          return (
                            <div
                              key={animal.id}
                              onClick={() => {
                                setLoraSelectedId(animal.id);
                                setPingLog([]);
                              }}
                              className={cn(
                                "p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative",
                                isSelected 
                                  ? "bg-slate-900 border-brand/50 shadow-md shadow-brand/5 scale-[1.01]" 
                                  : "bg-slate-900/30 border-white/5 hover:border-slate-800 hover:bg-slate-900/60"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center",
                                    animal.type === 'cow' ? "bg-blue-500/15 text-blue-400" :
                                    animal.type === 'horse' ? "bg-amber-500/15 text-amber-400" :
                                    "bg-brand/15 text-brand"
                                  )}>
                                    <AnimalIcon type={animal.type} size={18} />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-white">{animal.name}</h4>
                                    <span className="text-[8px] text-slate-500 font-mono uppercase">{animal.id}</span>
                                  </div>
                                </div>
                                <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold border", signalBadgeColor)}>
                                  {signalLabel} ({rssi} dBm)
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                                <div className="flex items-center gap-1.5">
                                  <Thermometer className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <div className="leading-none">
                                    <span className="text-[8px] text-slate-500 uppercase font-bold block">Suhu Tubuh</span>
                                    <span className={cn("text-[11px] font-bold", temp > 39.5 ? "text-rose-400" : temp < 38.0 ? "text-sky-400" : "text-emerald-400")}>
                                      {temp}°C {temp > 39.5 && "⚠️"}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <Activity className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <div className="leading-none">
                                    <span className="text-[8px] text-slate-500 uppercase font-bold block">Jantung BPM</span>
                                    <span className="text-[11px] font-bold text-slate-200">{bpm} bpm</span>
                                  </div>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="absolute right-3 top-3 w-1.5 h-1.5 rounded-full bg-brand" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* PERSISTENT LORAWAN & BIOMETRIC SENSOR DICTIONARY/MONITORING SIDEBAR */}
        {isLoraSidebarOpen && (
          <aside className="w-full lg:w-[380px] bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800/80 p-5 flex flex-col h-full overflow-hidden shrink-0 z-10 animate-in slide-in-from-right duration-300">
            {/* Sidebar Title */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 text-brand flex items-center justify-center">
                  <Signal className="w-4 h-4 text-brand animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Hub LoRa & Sensor</h3>
                  <p className="text-[10px] text-slate-400">Diagnosis nirkabel real-time</p>
                </div>
              </div>
              <button
                onClick={() => setIsLoraSidebarOpen(false)}
                className="p-1 px-2 rounded-lg border border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white transition-all text-[9px] font-bold uppercase"
              >
                Tutup
              </button>
            </div>

            {/* Scrollable container */}
            <div className="flex-1 overflow-y-auto pt-4 space-y-5 pr-1 select-none">
              {/* Target Livestock Selector */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Pilih Fokus Ternak</label>
                <select
                  value={sidebarAnimal?.id || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    setLoraSelectedId(id);
                    setSelectedId(id);
                    setPingLog([]);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 outline-none focus:border-brand/40 transition-all font-medium"
                >
                  {livestock.map(animal => (
                    <option key={animal.id} value={animal.id} className="bg-slate-950">
                      {animal.name} ({animal.id})
                    </option>
                  ))}
                </select>
              </div>

              {sidebarAnimal ? (
                <>
                  {/* Selected Animal Widget Header */}
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center border border-white/5 shadow-inner",
                        sidebarAnimal.type === 'cow' ? "bg-blue-500/10 text-blue-400 border-blue-500/15" :
                        sidebarAnimal.type === 'horse' ? "bg-amber-500/10 text-amber-400 border-amber-500/15" :
                        "bg-brand/10 text-brand border-brand/15"
                      )}>
                        <AnimalIcon type={sidebarAnimal.type} size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{sidebarAnimal.name}</h4>
                        <p className="text-[9px] font-mono text-slate-500 uppercase">ID: {sidebarAnimal.id}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <Battery className={cn("w-4 h-4", sidebarAnimal.battery < 30 ? "text-rose-500" : "text-brand")} />
                      <span className="text-[11px] font-bold text-white font-mono">{sidebarAnimal.battery}%</span>
                    </div>
                  </div>

                  {/* Biometric Vital Sensors: Temp & Heart Rate */}
                  <div className="space-y-3">
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Bio-Sensor Telemetri</span>
                    
                    <div className="p-4 bg-slate-950 rounded-xl border border-white/5 space-y-3">
                      {/* Suhu Gauge */}
                      <div>
                        {(() => {
                          const temp = sidebarAnimal.temperatureSensor?.currentTemp || 38.6;
                          let tempStatus = "Normal";
                          let tempColor = "text-emerald-400";
                          let tempBarClass = "bg-brand";
                          if (temp > 39.5) {
                            tempStatus = "⚠️ Demam/Stres Panas";
                            tempColor = "text-rose-400";
                            tempBarClass = "bg-rose-500";
                          } else if (temp < 38.0) {
                            tempStatus = "❄️ Suhu Rendah";
                            tempColor = "text-sky-400";
                            tempBarClass = "bg-sky-500";
                          }
                          return (
                            <>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <Thermometer className="w-4 h-4 text-rose-400" />
                                  <span className="text-xs text-slate-300 font-medium">Suhu Tubuh</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold text-white">{temp}°C</p>
                                  <p className={cn("text-[8px] font-bold uppercase tracking-tighter", tempColor)}>{tempStatus}</p>
                                </div>
                              </div>
                              <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                                <div 
                                  className={cn("h-full transition-all duration-500", tempBarClass)} 
                                  style={{ width: `${Math.min(100, Math.max(0, ((temp - 36) / 6) * 100))}%` }} 
                                />
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Heartbeat BPM block */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                          <span className="text-xs text-slate-300 font-medium">Detak Jantung</span>
                        </div>
                        <div className="text-right flex items-baseline gap-1">
                          <span className="text-sm font-bold text-white font-mono">{sidebarAnimal.heartRateSensor?.currentRate || 74}</span>
                          <span className="text-[9px] text-slate-500">BPM</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LoRa Communication RF Metrics */}
                  <div className="space-y-3">
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Konektivitas Transmisi LoRa</span>
                    
                    <div className="p-4 bg-slate-950 rounded-xl border border-white/5 space-y-3">
                      {/* Signal RF parameters */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                          <span className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">RSSI Strength</span>
                          <span className="text-xs font-mono font-bold text-white">{sidebarAnimal.loraQuality?.rssi || -90} dBm</span>
                        </div>
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                          <span className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">SNR Level</span>
                          <span className="text-xs font-mono font-bold text-white">{sidebarAnimal.loraQuality?.snr || 5.2} dB</span>
                        </div>
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                          <span className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">Spreading Factor</span>
                          <span className="text-xs font-mono font-bold text-white">SF{sidebarAnimal.loraQuality?.spreadingFactor || 9}</span>
                        </div>
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                          <span className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">Paket Gagal</span>
                          <span className="text-xs font-mono font-bold text-slate-300">{sidebarAnimal.loraQuality?.packetLossRate || 1.2}%</span>
                        </div>
                      </div>

                      {/* Connected Gateway details */}
                      <div className="pt-2 border-t border-white/5 text-[10px] space-y-1">
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Stasiun Gateway</span>
                          <span className="text-white font-semibold">{sidebarAnimal.loraQuality?.gatewayName || "GP Tambora Alpha"}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Saluran Frekuensi</span>
                          <span className="text-slate-300 font-mono">{sidebarAnimal.loraQuality?.frequency || 921.3} MHz</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Wireless Handshake Console Terminal */}
                  <div className="space-y-3 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Uji Ping & Handshake</span>
                      <button
                        disabled={pingingId !== null}
                        onClick={() => runLoraPing(sidebarAnimal)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase transition-all shadow-md",
                          pingingId !== null
                            ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                            : "bg-brand text-slate-950 hover:bg-brand/90"
                        )}
                      >
                        {pingingId !== null ? "Menguji..." : "Kirim Ping"}
                      </button>
                    </div>

                    <div className="bg-slate-950 rounded-xl border border-white/10 p-4 h-[210px] overflow-y-auto font-mono text-[10px] text-slate-300 flex flex-col gap-1.5 focus:outline-none">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2 text-slate-500 uppercase text-[9px] font-bold shrink-0">
                        <span>Terminal Output</span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Ready
                        </span>
                      </div>
                      {pingLog.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 italic">
                          <span>Tekan "Kirim Ping" di atas untuk mendiagnosis sinyal nirkabel {sidebarAnimal.name}.</span>
                        </div>
                      ) : (
                        pingLog.map((log, index) => (
                          <div key={index} className="leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-150">
                            {log?.includes('[SUCCESS]') ? (
                              <span className="text-brand font-bold">{log}</span>
                            ) : log?.includes('[REQ]') ? (
                              <span className="text-white font-medium">{log}</span>
                            ) : log?.includes('[TX]') ? (
                              <span className="text-blue-400">{log}</span>
                            ) : log?.includes('[GATEWAY]') ? (
                              <span className="text-amber-400">{log}</span>
                            ) : log?.includes('[SENSOR]') ? (
                              <span className="text-indigo-300">{log}</span>
                            ) : (
                              <span>{log}</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 italic text-[11px]">
                  Tidak ada ternak terdaftar.
                </div>
              )}
            </div>
          </aside>
        )}
      </main>

      <AnimatePresence>
        {selectedAnimal && (
          <DetailsModal 
            animal={selectedAnimal} 
            onClose={() => setSelectedId(null)} 
            onDelete={handleDeleteLivestock}
            onEdit={(animal) => setEditingAnimal(animal)}
          />
        )}
        {(showAddModal || editingAnimal) && (
          <LivestockModal 
            animal={editingAnimal}
            onClose={() => {
              setShowAddModal(false);
              setEditingAnimal(null);
            }}
            onConfirm={editingAnimal ? handleUpdateLivestock : handleAddLivestock}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
