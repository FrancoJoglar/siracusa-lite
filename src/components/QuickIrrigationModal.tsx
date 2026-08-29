'use client';

import { useState, useEffect } from 'react';
import { api, FK, FN } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface QuickIrrigationModalProps {
  sectorId: number;
  sectorName: string;
  fecha: string;
  day: number;
  existingHrs: number;
  existingM3: number;
  hasFert: boolean;
  onClose: () => void;
  onSaved: () => void;
  onToast: (msg: string) => void;
}

export function QuickIrrigationModal({
  sectorId,
  sectorName,
  fecha,
  day,
  existingHrs,
  existingM3,
  hasFert,
  onClose,
  onSaved,
  onToast,
}: QuickIrrigationModalProps) {
  const [horas, setHoras] = useState(existingHrs > 0 ? existingHrs.toFixed(1) : '');
  const [saving, setSaving] = useState(false);
  const [sectorInfo, setSectorInfo] = useState<any>(null);

  // Load sector info for m³ calculation
  useEffect(() => {
    const loadSector = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const data = await api<any[]>(`/api/sectores?id=${sectorId}`, { token });
        if (data && data.length > 0) {
          setSectorInfo(data[0]);
        }
      } catch (e) {
        console.error('Error loading sector:', e);
      }
    };
    loadSector();
  }, [sectorId]);

  const calcM3 = () => {
    const h = parseFloat(horas) || 0;
    if (!sectorInfo || !h) return 0;
    return sectorInfo.has_hectareas * h * sectorInfo.m3_ha_hr;
  };

  const handleSave = async () => {
    const h = parseFloat(horas) || 0;
    if (h <= 0) {
      onToast('⚠️ Ingresá las horas de riego');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const user = session?.user;

      const data: Record<string, any> = {
        id_sector: sectorId,
        fecha_riego: fecha,
        horas: h,
        solicitante: user?.email ?? user?.user_metadata?.name ?? 'Anónimo',
        observaciones: '',
      };
      // No fertilizers in quick mode
      FK.forEach((k) => { data[k] = 0; });

      const res = await api<any>('/api/solicitudes', { method: 'POST', body: data as any, token });
      if (res.id) {
        onToast(`✅ Riego registrado — ${res.m3_programados.toFixed(1)} m³`);
        onSaved();
        onClose();
      } else {
        onToast('❌ Error al guardar');
      }
    } catch {
      onToast('❌ Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const m3 = calcM3();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-2xl">
          <h3 className="text-lg font-bold">💧 Riego Rápido</h3>
          <p className="text-blue-100 text-sm">{sectorName} — Día {day}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Hours input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Horas de riego</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-2xl font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.0"
              autoFocus
            />
          </div>

          {/* M³ preview */}
          {m3 > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <span className="text-green-700 text-sm">
                💧 <strong className="text-lg">{m3.toFixed(1)} m³</strong>
              </span>
              {sectorInfo && (
                <p className="text-green-600 text-xs mt-1">
                  {sectorInfo.has_hectareas} has × {horas} hrs × {sectorInfo.m3_ha_hr} m³/ha/hr
                </p>
              )}
            </div>
          )}

          {/* Existing data indicator */}
          {existingHrs > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              ⚠️ Ya existe un riego de {existingHrs.toFixed(1)} hrs / {existingM3.toFixed(0)} m³ en esta fecha
            </div>
          )}

          {/* Fertilizer indicator */}
          {hasFert && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
              🧪 Esta solicitud tiene fertilizantes aplicados
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !horas || parseFloat(horas) <= 0}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : '💧 Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
