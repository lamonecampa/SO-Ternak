import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Plus,
  Beef,
  Zap,
  Footprints,
  Settings
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Livestock, LivestockType } from '../types';

interface LivestockModalProps {
  onClose: () => void;
  onConfirm: (animal: Partial<Livestock>) => void;
  animal?: Livestock; // Typed animal for edit mode
}

export function LivestockModal({ onClose, onConfirm, animal }: LivestockModalProps) {
  const isEdit = !!animal;
  const [formData, setFormData] = useState({
    name: animal?.name || '',
    type: animal?.type || 'cow' as LivestockType,
    lat: animal?.lat || -8.2917,
    lng: animal?.lng || 117.9708,
    alt: animal?.alt || 350,
    health: animal?.health || 'good',
    battery: animal?.battery || 100,
    speed: animal?.speed || 0,
    id: animal?.id
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    onConfirm(formData);
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
        className="bg-slate-900 border border-slate-800 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-800">
          <h2 className="text-xl font-bold flex items-center gap-3">
            {isEdit ? <Settings className="w-6 h-6 text-brand" /> : <Plus className="w-6 h-6 text-brand" />}
            {isEdit ? 'Konfigurasi Unit' : 'Tambah Ternak Baru'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Nama Hewan</label>
            <input 
              required
              type="text" 
              placeholder="contoh: Sapi Bali Epsilon"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-brand focus:outline-none transition-colors"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Spesies</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { type: 'cow' as LivestockType, icon: Beef, label: 'Sapi' },
                { type: 'horse' as LivestockType, icon: Zap, label: 'Kuda' },
                { type: 'goat' as LivestockType, icon: Footprints, label: 'Kambing' },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  disabled={isEdit} // Species usually fixed once registered
                  onClick={() => setFormData({ ...formData, type: item.type })}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                    formData.type === item.type 
                      ? "bg-brand/10 border-brand text-brand" 
                      : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700",
                    isEdit && formData.type !== item.type && "opacity-30 grayscale"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Lintang (Latitude)</label>
              <input 
                type="number" step="0.0001"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-brand focus:outline-none"
                value={formData.lat}
                onChange={e => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Bujur (Longitude)</label>
              <input 
                type="number" step="0.0001"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-brand focus:outline-none"
                value={formData.lng}
                onChange={e => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Status Kesehatan</label>
              <select 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-brand focus:outline-none appearance-none"
                value={formData.health}
                onChange={e => setFormData({ ...formData, health: e.target.value })}
              >
                <option value="excellent">Sangat Baik</option>
                <option value="good">Baik</option>
                <option value="fair">Cukup</option>
                <option value="poor">Buruk</option>
              </select>
            </div>
            <div className="space-y-2 relative">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Baterai</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" min="0" max="100"
                    className="flex-1 accent-brand h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    value={formData.battery}
                    onChange={e => setFormData({ ...formData, battery: parseInt(e.target.value) })}
                  />
                  <span className="text-xs font-mono text-white w-8">{formData.battery}%</span>
                </div>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-brand text-slate-950 font-bold py-4 rounded-2xl transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-3 active:scale-[0.98] mt-4"
          >
            {isEdit ? <Settings className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            <span>{isEdit ? 'Simpan Konfigurasi' : 'Konfirmasi Penambahan'}</span>
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
