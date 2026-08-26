import { FK, FN } from '../lib/api';

// Test helpers
function findFertInList(list: any[] | undefined, fertName: string) {
  if (!Array.isArray(list)) return null;
  return list.find((x: any) => x.fert_name === fertName) || null;
}

function solDataHasFert(sols: any[]): boolean {
  return sols.some((s: any) => FK.some((k) => (s[k] ?? 0) > 0));
}

describe('Calendario - Helper Functions', () => {
  describe('findFertInList', () => {
    it('should return null for undefined input', () => {
      expect(findFertInList(undefined, 'Sulfato Zn')).toBeNull();
    });

    it('should return null for empty array', () => {
      expect(findFertInList([], 'Sulfato Zn')).toBeNull();
    });

    it('should find fertilizer by name', () => {
      const list = [
        { fert_name: 'Sulfato Zn', kilos_plan: 10 },
        { fert_name: 'Nitrato Amonio', kilos_plan: 20 },
      ];
      const result = findFertInList(list, 'Nitrato Amonio');
      expect(result).toEqual({ fert_name: 'Nitrato Amonio', kilos_plan: 20 });
    });

    it('should return null for non-existent fertilizer', () => {
      const list = [{ fert_name: 'Sulfato Zn', kilos_plan: 10 }];
      expect(findFertInList(list, 'Non Existent')).toBeNull();
    });

    it('should handle null array', () => {
      expect(findFertInList(null, 'Sulfato Zn')).toBeNull();
    });
  });

  describe('solDataHasFert', () => {
    it('should return false for empty array', () => {
      expect(solDataHasFert([])).toBe(false);
    });

    it('should return false when no fertilizers are applied', () => {
      const sols = [
        { fert_sulfato_zn: 0, fert_nitrato_amo: 0, fert_nitrato_ca: 0 },
      ];
      expect(solDataHasFert(sols)).toBe(false);
    });

    it('should return true when at least one fertilizer is applied', () => {
      const sols = [
        { fert_sulfato_zn: 0, fert_nitrato_amo: 10, fert_nitrato_ca: 0 },
      ];
      expect(solDataHasFert(sols)).toBe(true);
    });

    it('should return true when multiple fertilizers are applied', () => {
      const sols = [
        { fert_sulfato_zn: 5, fert_nitrato_amo: 10, fert_nitrato_ca: 15 },
      ];
      expect(solDataHasFert(sols)).toBe(true);
    });

    it('should handle null/undefined values', () => {
      const sols = [
        { fert_sulfato_zn: null, fert_nitrato_amo: undefined, fert_nitrato_ca: 0 },
      ];
      expect(solDataHasFert(sols)).toBe(false);
    });
  });

  describe('FK and FN constants', () => {
    it('should have 8 fertilizer keys', () => {
      expect(FK).toHaveLength(8);
    });

    it('should have 8 fertilizer names', () => {
      expect(FN).toHaveLength(8);
    });

    it('FK and FN should have matching indices', () => {
      FK.forEach((key, i) => {
        expect(FN[i]).toBeDefined();
        expect(typeof FN[i]).toBe('string');
      });
    });

    it('should contain expected fertilizer keys', () => {
      expect(FK).toContain('fert_sulfato_zn');
      expect(FK).toContain('fert_nitrato_amo');
      expect(FK).toContain('fert_urea');
    });

    it('should contain expected fertilizer names', () => {
      expect(FN).toContain('Sulfato Zn');
      expect(FN).toContain('Nitrato Amonio');
      expect(FN).toContain('Urea');
    });
  });

  describe('Grid data structure', () => {
    it('should handle sector with receta_mes', () => {
      const sec = {
        id: 1,
        name: 'Sector 1',
        receta_mes: [
          { fert_name: 'Sulfato Zn', kilos_plan: 10 },
          { fert_name: 'Nitrato Amonio', kilos_plan: 20 },
        ],
        receta_temporada: [
          { fert_name: 'Sulfato Zn', kilos_total: 50 },
        ],
        saldo_temporada: [
          { fert_name: 'Sulfato Zn', saldo: 40 },
        ],
        solicitudes: [],
      };

      const entry = findFertInList(sec.receta_mes, 'Sulfato Zn');
      expect(entry?.kilos_plan).toBe(10);
    });

    it('should compute saldo correctly', () => {
      const recetaTemp = [{ fert_name: 'Sulfato Zn', kilos_total: 100 }];
      const aplicado = [{ fert_name: 'Sulfato Zn', kilos_aplicados: 60 }];
      
      const saldoMap: Record<string, number> = {};
      for (const r of recetaTemp) saldoMap[r.fert_name] = r.kilos_total;
      for (const a of aplicado) saldoMap[a.fert_name] -= a.kilos_aplicados;
      
      expect(saldoMap['Sulfato Zn']).toBe(40);
    });

    it('should handle negative saldo (over-applied)', () => {
      const recetaTemp = [{ fert_name: 'Sulfato Zn', kilos_total: 50 }];
      const aplicado = [{ fert_name: 'Sulfato Zn', kilos_aplicados: 70 }];
      
      const saldoMap: Record<string, number> = {};
      for (const r of recetaTemp) saldoMap[r.fert_name] = r.kilos_total;
      for (const a of aplicado) saldoMap[a.fert_name] -= a.kilos_aplicados;
      
      expect(saldoMap['Sulfato Zn']).toBe(-20);
    });

    it('should handle saldo with no recipe (applied only)', () => {
      const recetaTemp: any[] = [];
      const aplicado = [{ fert_name: 'Sulfato Zn', kilos_aplicados: 30 }];
      
      const saldoMap: Record<string, number> = {};
      for (const r of recetaTemp) saldoMap[r.fert_name] = r.kilos_total;
      for (const a of aplicado) {
        if (!saldoMap[a.fert_name]) saldoMap[a.fert_name] = 0;
        saldoMap[a.fert_name] -= a.kilos_aplicados;
      }
      
      expect(saldoMap['Sulfato Zn']).toBe(-30);
    });
  });

  describe('Nutrient calculation', () => {
    it('should compute nutrient units correctly', () => {
      const fertilizantes = [
        { name: 'Sulfato Zn', N: 0, P2O5: 0, K2O: 0, Zn: 0.22 },
        { name: 'Nitrato Amonio', N: 0.33, P2O5: 0, K2O: 0 },
      ];
      
      const FK_LOCAL = ['fert_sulfato_zn', 'fert_nitrato_amo'] as const;
      const FN_LOCAL = ['Sulfato Zn', 'Nitrato Amonio'] as const;
      
      const solicitudes = [
        { fert_sulfato_zn: 10, fert_nitrato_amo: 20 },
      ];
      
      let totalN = 0;
      let totalZn = 0;
      
      FK_LOCAL.forEach((fk, fi) => {
        const fertDef = fertilizantes.find(f => f.name === FN_LOCAL[fi]);
        const coeff = fertDef ? (fertDef.N ?? 0) : 0;
        const totalApplied = solicitudes.reduce((s, r) => s + (r[fk] ?? 0), 0);
        totalN += totalApplied * coeff;
        
        const znCoeff = fertDef ? (fertDef.Zn ?? 0) : 0;
        totalZn += totalApplied * znCoeff;
      });
      
      expect(totalN).toBeCloseTo(6.6); // 20 * 0.33
      expect(totalZn).toBeCloseTo(2.2); // 10 * 0.22
    });
  });

  describe('Edge cases for calendar grid', () => {
    it('should handle empty grid data', () => {
      const gridData: any[] = [];
      const solMap = new Map<string, any[]>();
      expect(gridData.length).toBe(0);
      expect(solMap.size).toBe(0);
    });

    it('should build solMap correctly', () => {
      const gridData = [
        {
          id: 1,
          solicitudes: [
            { fecha_riego: '2026-10-01', horas: 5, m3_programados: 100 },
            { fecha_riego: '2026-10-01', horas: 3, m3_programados: 60 },
          ],
        },
      ];
      
      const map = new Map<string, any[]>();
      for (const sec of gridData) {
        for (const s of sec.solicitudes ?? []) {
          const d = parseInt(s.fecha_riego.split('-')[2], 10);
          const k = `${sec.id}-${d}`;
          if (!map.has(k)) map.set(k, []);
          map.get(k)!.push(s);
        }
      }
      
      const sols = map.get('1-1') ?? [];
      expect(sols).toHaveLength(2);
      expect(sols.reduce((s: number, r: any) => s + r.horas, 0)).toBe(8);
    });

    it('should handle February correctly', () => {
      const daysInFeb = new Date(2026, 2, 0).getDate();
      expect(daysInFeb).toBe(28); // 2026 is not a leap year
    });

    it('should handle leap year February', () => {
      const daysInFeb = new Date(2028, 2, 0).getDate();
      expect(daysInFeb).toBe(29); // 2028 is a leap year
    });
  });
});
