'use client';

import { FK, FN } from '@/lib/api';

interface FertModalProps {
  sectorName: string;
  fecha: string;
  sols: any[];
  fertilizantes: any[];
  onClose: () => void;
}

export function FertModal({ sectorName, fecha, sols, fertilizantes, onClose }: FertModalProps) {
  // Aggregate fertilizer data across all solicitations for this day
  const fertTotals = FK.map((fk, i) => {
    const total = sols.reduce((s, sol) => s + (sol[fk] ?? 0), 0);
    const fertDef = fertilizantes.find((f: any) => f.name === FN[i]);
    return {
      key: fk,
      name: FN[i],
      total,
      N: fertDef ? (fertDef.N ?? 0) : 0,
      P2O5: fertDef ? (fertDef.P2O5 ?? 0) : 0,
      K2O: fertDef ? (fertDef.K2O ?? 0) : 0,
      CaO: fertDef ? (fertDef.CaO ?? 0) : 0,
      MgO: fertDef ? (fertDef.MgO ?? 0) : 0,
      Zn: fertDef ? (fertDef.Zn ?? 0) : 0,
      B2O3: fertDef ? (fertDef.B2O3 ?? 0) : 0,
      S: fertDef ? (fertDef.S ?? 0) : 0,
    };
  });

  const totalHrs = sols.reduce((s, sol) => s + (sol.horas ?? 0), 0);
  const totalM3 = sols.reduce((s, sol) => s + (sol.m3_programados ?? 0), 0);

  // Compute nutrient totals
  const nutrientTotals = fertTotals.reduce((acc, f) => {
    acc.N += f.total * f.N;
    acc.P2O5 += f.total * f.P2O5;
    acc.K2O += f.total * f.K2O;
    acc.CaO += f.total * f.CaO;
    acc.MgO += f.total * f.MgO;
    acc.Zn += f.total * f.Zn;
    acc.B2O3 += f.total * f.B2O3;
    acc.S += f.total * f.S;
    return acc;
  }, { N: 0, P2O5: 0, K2O: 0, CaO: 0, MgO: 0, Zn: 0, B2O3: 0, S: 0 });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-2xl">
          <h3 className="text-lg font-bold">🧪 Detalle de Fertilizantes</h3>
          <p className="text-blue-100 text-sm">{sectorName} — {fecha}</p>
        </div>
        <div className="p-6">
          {/* Summary */}
          <div className="flex gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg px-4 py-2 flex-1 text-center">
              <div className="text-xs text-blue-600 font-medium">Horas</div>
              <div className="text-lg font-bold text-blue-800">{totalHrs.toFixed(1)}</div>
            </div>
            <div className="bg-blue-50 rounded-lg px-4 py-2 flex-1 text-center">
              <div className="text-xs text-blue-600 font-medium">M³</div>
              <div className="text-lg font-bold text-blue-800">{totalM3.toFixed(0)}</div>
            </div>
          </div>

          {/* Fertilizer table */}
          <table className="w-full text-sm mb-4">
            <thead className="bg-blue-50 text-blue-700">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Fertilizante</th>
                <th className="px-3 py-2 text-right font-semibold">Kg</th>
                <th className="px-3 py-2 text-right font-semibold">N</th>
                <th className="px-3 py-2 text-right font-semibold">P₂O₅</th>
                <th className="px-3 py-2 text-right font-semibold">K₂O</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {fertTotals.filter(f => f.total > 0).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-gray-400">
                    Sin fertilizantes aplicados
                  </td>
                </tr>
              ) : (
                fertTotals.filter(f => f.total > 0).map((f) => (
                  <tr key={f.key} className="hover:bg-blue-50/50">
                    <td className="px-3 py-2 font-medium text-gray-800">{f.name}</td>
                    <td className="px-3 py-2 text-right text-orange-600 font-semibold">{f.total.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{(f.total * f.N).toFixed(1)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{(f.total * f.P2O5).toFixed(1)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{(f.total * f.K2O).toFixed(1)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Nutrient totals */}
          {fertTotals.some(f => f.total > 0) && (
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-purple-800 mb-2">Unidades Nutritivas</h4>
              <div className="grid grid-cols-4 gap-3 text-xs">
                <div className="text-center">
                  <div className="text-purple-600">U.N</div>
                  <div className="font-bold text-purple-800">{nutrientTotals.N.toFixed(1)}</div>
                </div>
                <div className="text-center">
                  <div className="text-purple-600">U.P₂O₅</div>
                  <div className="font-bold text-purple-800">{nutrientTotals.P2O5.toFixed(1)}</div>
                </div>
                <div className="text-center">
                  <div className="text-purple-600">U.K₂O</div>
                  <div className="font-bold text-purple-800">{nutrientTotals.K2O.toFixed(1)}</div>
                </div>
                <div className="text-center">
                  <div className="text-purple-600">U.CaO</div>
                  <div className="font-bold text-purple-800">{nutrientTotals.CaO.toFixed(1)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Close button */}
          <div className="mt-4 text-right">
            <button onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
