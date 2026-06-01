import React from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Activity, 
  Battery, 
  MapPin, 
  Mountain, 
  Signal, 
  Thermometer,
  Clock,
  TrendingUp,
  Settings,
  Heart,
  Beef,
  Zap,
  Footprints,
  Trash2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { cn } from '../lib/utils';
import { Livestock, LivestockType, HealthStatus } from '../types';

interface DetailsModalProps {
  animal: Livestock | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (animal: Livestock) => void;
}

const HEALTH_COLORS = {
  excellent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  good: 'text-emerald-500/80 bg-emerald-500/5 border-emerald-500/10',
  fair: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  poor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

const HEALTH_LABELS = {
  excellent: 'Sangat Baik',
  good: 'Baik',
  fair: 'Cukup',
  poor: 'Buruk',
};

export function DetailsModal({ animal, onClose, onDelete, onEdit }: DetailsModalProps) {
  if (!animal) return null;

  const chartData = animal.heartRate.map((hr, i) => ({
    time: i,
    hr: hr
  }));

  const handleDelete = () => {
    if (confirm(`Apakah Anda yakin ingin menghapus ${animal.name}?`)) {
      onDelete?.(animal.id);
    }
  };

  const handleEdit = () => {
    if (animal) onEdit?.(animal);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-slate-900 border border-slate-800 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-8 pb-0 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center border",
              animal.type === 'cow' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 
              animal.type === 'horse' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 
              'bg-brand/10 border-brand/20 text-brand'
            )}>
              {animal.type === 'cow' && <Beef className="w-8 h-8" />}
              {animal.type === 'horse' && <Zap className="w-8 h-8" />}
              {animal.type === 'goat' && <Footprints className="w-8 h-8" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white leading-tight">{animal.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs uppercase tracking-widest text-slate-500 font-mono">ID: {animal.id}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1",
                  animal.type === 'cow' ? 'bg-blue-500/5 border-blue-500/10 text-blue-400' : 
                  animal.type === 'horse' ? 'bg-amber-500/5 border-amber-500/10 text-amber-400' : 
                  'bg-brand/5 border-brand/10 text-brand'
                )}>
                  {animal.type === 'cow' && <Beef className="w-3 h-3" />}
                  {animal.type === 'horse' && <Zap className="w-3 h-3" />}
                  {animal.type === 'goat' && <Footprints className="w-3 h-3" />}
                  {animal.type === 'cow' ? 'Sapi' : animal.type === 'horse' ? 'Kuda' : 'Kambing'}
                </span>
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1.5", HEALTH_COLORS[animal.health])}>
                  {animal.health === 'good' ? (
                    <Heart className="w-3 h-3" />
                  ) : (
                    <Heart className="w-3 h-3 fill-current" />
                  )}
                  Status {HEALTH_LABELS[animal.health]}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Quick Stats */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Battery className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold">Baterai</span>
                </div>
                <div className="flex items-end gap-1">
                  <span className={cn(
                    "text-2xl font-bold",
                    animal.battery < 30 ? "text-danger" : animal.battery < 70 ? "text-warning" : "text-white"
                  )}>{Math.round(animal.battery)}</span>
                  <span className="text-xs text-slate-500 mb-1">%</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-all duration-500 shadow-sm",
                        animal.battery >= (i + 1) * 20 
                          ? (animal.battery < 30 ? "bg-danger" : animal.battery < 70 ? "bg-warning" : "bg-brand")
                          : "bg-slate-800/50"
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold">Kecepatan</span>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-bold text-white">{animal.speed}</span>
                  <span className="text-xs text-slate-500 mb-1">km/j</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/20 border border-slate-800">
                <div className="flex items-center gap-3 text-slate-400">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs font-medium">Lokasi</span>
                </div>
                <span className="text-xs font-mono text-white tracking-tight">
                  {animal.lat.toFixed(4)}°, {animal.lng.toFixed(4)}°
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/20 border border-slate-800">
                <div className="flex items-center gap-3 text-slate-400">
                  <Mountain className="w-4 h-4" />
                  <span className="text-xs font-medium">Ketinggian</span>
                </div>
                <span className="text-xs font-mono text-white tracking-tight">{animal.alt}m di atas laut</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/20 border border-slate-800">
                <div className="flex items-center gap-3 text-slate-400">
                  <Thermometer className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span className="text-xs font-medium">Suhu Tubuh</span>
                </div>
                <span className={cn(
                  "text-xs font-bold font-mono tracking-tight",
                  (animal.temperatureSensor?.currentTemp || 38.6) > 39.5 ? "text-rose-400" : "text-emerald-400"
                )}>
                  {animal.temperatureSensor?.currentTemp || 38.6}°C {(animal.temperatureSensor?.currentTemp || 38.6) > 39.5 ? "⚠️" : "✓"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/20 border border-slate-800">
                <div className="flex items-center gap-3 text-slate-400">
                  <Signal className="w-4 h-4 text-brand" />
                  <span className="text-xs font-medium">Sinyal LoRa</span>
                </div>
                <span className="text-xs font-mono text-slate-300">
                  {animal.loraQuality?.rssi || -90} dBm (SF{animal.loraQuality?.spreadingFactor || 9})
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/20 border border-slate-800">
                <div className="flex items-center gap-3 text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">Sinkron Terakhir</span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {new Date(animal.lastUpdate).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* HR Chart */}
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tren Detak Jantung</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-white">{animal.heartRate[animal.heartRate.length-1]} BPM</span>
              </div>
            </div>
            <div className="flex-1 min-h-[160px] bg-slate-950/40 rounded-2xl border border-slate-800 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="hr" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorHr)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 pt-0 flex gap-3">
          <button 
            onClick={handleDelete}
            className="w-14 h-14 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-2xl transition-all flex items-center justify-center active:scale-[0.98]"
            title="Delete Livestock"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-2xl transition-all border border-slate-700 flex items-center justify-center gap-3 active:scale-[0.98]">
            <Signal className="w-4 h-4" />
            <span>Sinyal Darurat</span>
          </button>
          <button 
            onClick={handleEdit}
            className="flex-1 bg-brand text-slate-950 font-bold py-3 rounded-2xl transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <Settings className="w-4 h-4" />
            <span>Konfigurasi Unit</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
