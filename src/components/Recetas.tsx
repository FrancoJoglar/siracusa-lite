'use client';

import { useState, useEffect } from 'react';
import { api, FK, FN } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const SEASON_MONTHS = [9, 10, 11, 12, 1, 2, 3, 4];
const MONTH_LABELS: Record<number, string> = {
  9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
};

interface RecetasProps {
  onToast: (msg: string) => void;
}

export function Recetas({ onToast }: RecetasProps) {
  const [recetasList, setRecetasList] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('olivos');
  const [temporada, setTemporada] = useState('2026-2027');
  const [descripcion, setDescripcion] = useState('');
  const [currentMonth, setCurrentMonth] = useState(9);
  const [monthData, setMonthData] = useState<Record<number, Record<string, number>>>({});
  const [currentMonthInputs, setCurrentMonthInputs] = useState<number[]>(Array(8).fill(0));

  const monthIdx = (m: number) => SEASON_MONTHS.indexOf(m);

  const loadCatalog = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const data = await api<any[]>('/api/recetas?view=catalog', { token });
      setRecetasList(data);
    } catch (e) {
      console.error('Error loading recetas:', e);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const deleteReceta = async (id: number, nombreReceta: string) => {
    if (!confirm(`¿Eliminar la receta "${nombreReceta}"?`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await api(`/api/recetas?view=catalog&id=${id}`, { method: 'DELETE', token });
      onToast('✅ Receta eliminada');
      await loadCatalog();
    } catch (e) {
      console.error('Error deleting:', e);
    }
  };

  const openNew = () => {
    setEditId(null);
    setNombre('');
    setTipo('olivos');
    setTemporada('2026-2027');
    setDescripcion('');
    const newMonthData: Record<number, Record<string, number>> = {};
    SEASON_MONTHS.forEach(m => {
      newMonthData[m] = {};
      FK.forEach((_, i) => newMonthData[m]['fert' + i] = 0);
    });
    setMonthData(newMonthData);
    setCurrentMonth(9);
    setCurrentMonthInputs(Array(8).fill(0));
    setShowModal(true);
  };

  const openEdit = async (id: number) => {
    const rec = recetasList.find(r => r.id === id);
    if (!rec) return;
    setEditId(id);
    setNombre(rec.nombre ?? '');
    setTipo(rec.tipo_cultivo ?? 'olivos');
    setTemporada(rec.temporada ?? '2026-2027');
    setDescripcion(rec.descripcion ?? '');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const detalles = await api<any[]>(`/api/recetas?view=detalle&id_receta=${id}`, { token });
      const newMonthData: Record<number, Record<string, number>> = {};
      SEASON_MONTHS.forEach(m => {
        newMonthData[m] = {};
        FK.forEach((_, i) => newMonthData[m]['fert' + i] = 0);
      });
      for (const d of detalles ?? []) {
        const mi = monthIdx(d.mes);
        if (mi === -1) continue;
        const fertIdx = FK.indexOf(d.fert_key);
        if (fertIdx === -1) continue;
        newMonthData[d.mes]['fert' + fertIdx] = d.kilos_plan ?? 0;
      }
      setMonthData(newMonthData);
      setCurrentMonth(9);
      // Sync inputs
      const data = newMonthData[9] ?? {};
      setCurrentMonthInputs(FK.map((_, i) => data['fert' + i] ?? 0));
      setShowModal(true);
    } catch (e) {
      console.error('Error loading details:', e);
    }
  };

  const syncInputsFromMonthData = (month: number, data: Record<number, Record<string, number>>) => {
    const mData = data[month] ?? {};
    setCurrentMonthInputs(FK.map((_, i) => mData['fert' + i] ?? 0));
  };

  const saveInputsToMonthData = () => {
    setMonthData(prev => {
      const newData = { ...prev };
      if (!newData[currentMonth]) newData[currentMonth] = {};
      FK.forEach((_, i) => { newData[currentMonth]['fert' + i] = currentMonthInputs[i] ?? 0; });
      return newData;
    });
  };

  const monthPrev = () => {
    saveInputsToMonthData();
    const idx = monthIdx(currentMonth);
    const newMonth = SEASON_MONTHS[(idx - 1 + SEASON_MONTHS.length) % SEASON_MONTHS.length];
    setCurrentMonth(newMonth);
    syncInputsFromMonthData(newMonth, monthData);
  };

  const monthNext = () => {
    saveInputsToMonthData();
    const idx = monthIdx(currentMonth);
    const newMonth = SEASON_MONTHS[(idx + 1) % SEASON_MONTHS.length];
    setCurrentMonth(newMonth);
    syncInputsFromMonthData(newMonth, monthData);
  };

  const monthTotal = () => currentMonthInputs.reduce((s, v) => s + v, 0);

  const saveReceta = async () => {
    saveInputsToMonthData();
    if (!nombre.trim()) {
      onToast('⚠️ Ingresá un nombre para la receta');
      return;
    }

    const detalles: any[] = [];
    SEASON_MONTHS.forEach(m => {
      const data = monthData[m] ?? {};
      FK.forEach((fk, fi) => {
        const kilos = data['fert' + fi] ?? 0;
        if (kilos > 0) {
          detalles.push({ mes: m, fert_key: fk, fert_name: FN[fi], kilos_plan: kilos });
        }
      });
    });

    const body = { nombre: nombre.trim(), tipo_cultivo: tipo, temporada: temporada.trim(), descripcion: descripcion.trim(), detalles };
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (editId) {
        await api(`/api/recetas?view=catalog&id=${editId}`, { method: 'PUT', body: body as any, token });
        onToast('✅ Receta actualizada');
      } else {
        await api('/api/recetas?view=catalog', { method: 'POST', body: body as any, token });
        onToast('✅ Receta creada');
      }
      setShowModal(false);
      await loadCatalog();
    } catch (e) {
      console.error('Error saving:', e);
      onToast('❌ Error al guardar');
    }
  };

  const handleCurrentMonthInputChange = (index: number, value: string) => {
    const newInputs = [...currentMonthInputs];
    newInputs[index] = parseFloat(value) || 0;
    setCurrentMonthInputs(newInputs);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-800">🧪 Recetas de Fertilización</h1>
        <button
          onClick={openNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nueva Receta
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-blue-50 text-blue-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold">Tipo Cultivo</th>
              <th className="px-4 py-3 text-left font-semibold">Temporada</th>
              <th className="px-4 py-3 text-left font-semibold">Descripción</th>
              <th className="px-4 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100">
            {recetasList.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  No hay recetas creadas. Hacé click en "Nueva Receta".
                </td>
              </tr>
            ) : (
              recetasList.map((r) => (
                <tr key={r.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{r.nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.tipo_cultivo ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.temporada ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{r.descripcion ?? ''}</td>
                  <td className="px-4 py-3 text-sm text-right space-x-2">
                    <button
                      onClick={() => openEdit(r.id)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteReceta(r.id, r.nombre)}
                      className="text-red-500 hover:text-red-700 font-medium"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/New Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl mx-4 w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-blue-600 text-white px-6 py-4 rounded-t-2xl">
              <h3 className="text-lg font-bold">{editId ? 'Editar Receta' : 'Nueva Receta'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Olivos 10 ton/ha"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Cultivo</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="olivos">Olivos</option>
                    <option value="cerezos">Cerezos</option>
                    <option value="avellanos">Avellanos</option>
                    <option value="kiwi">Kiwi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Temporada</label>
                  <input
                    type="text"
                    value={temporada}
                    onChange={(e) => setTemporada(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Opcional"
                />
              </div>

              {/* Plan mensual */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-blue-800">📅 Plan Mensual</h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={monthPrev}
                      className="text-gray-500 hover:text-gray-700 text-sm px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                    >
                      ← Anterior
                    </button>
                    <span className="font-medium text-sm text-blue-800 w-24 text-center">
                      {MONTH_LABELS[currentMonth]}
                    </span>
                    <button
                      type="button"
                      onClick={monthNext}
                      className="text-gray-500 hover:text-gray-700 text-sm px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {FN.map((name, i) => (
                    <div key={name}>
                      <label className="block text-xs text-gray-500 mb-1">{name}</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max={999}
                        value={currentMonthInputs[i] || ''}
                        onChange={(e) => handleCurrentMonthInputChange(i, e.target.value)}
                        className="w-full border border-blue-200 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-2 text-right">
                  {monthTotal() > 0 ? `${monthTotal().toFixed(1)} kg este mes` : ''}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveReceta}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  💾 Guardar Receta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
