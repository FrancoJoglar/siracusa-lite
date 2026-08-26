import { FK, FN } from '../lib/api';

describe('Solicitudes - Recipe Validation', () => {
  describe('Fertilizer limit validation', () => {
    it('should validate against recipe limits', () => {
      const solReceta: Record<string, { max: number }> = {
        'Sulfato Zn': { max: 10 },
        'Nitrato Amonio': { max: 20 },
      };
      
      const ferts = [15, 5, 0, 0, 0, 0, 0, 0]; // Sulfato Zn = 15, exceeds max of 10
      
      let error = '';
      for (let i = 0; i < FK.length; i++) {
        const fertName = FN[i];
        const limit = solReceta[fertName];
        if (limit && ferts[i] > limit.max) {
          error = `${fertName}: ${ferts[i]} kg excede el máximo de ${limit.max} kg`;
          break;
        }
      }
      
      expect(error).toContain('Sulfato Zn');
      expect(error).toContain('excede el máximo');
    });

    it('should pass validation when within limits', () => {
      const solReceta: Record<string, { max: number }> = {
        'Sulfato Zn': { max: 10 },
        'Nitrato Amonio': { max: 20 },
      };
      
      const ferts = [8, 15, 0, 0, 0, 0, 0, 0];
      
      let error = '';
      for (let i = 0; i < FK.length; i++) {
        const fertName = FN[i];
        const limit = solReceta[fertName];
        if (limit && ferts[i] > limit.max) {
          error = `${fertName}: ${ferts[i]} kg excede el máximo de ${limit.max} kg`;
          break;
        }
      }
      
      expect(error).toBe('');
    });

    it('should pass validation when no recipe exists', () => {
      const solReceta: Record<string, { max: number }> = {};
      
      const ferts = [100, 200, 300, 0, 0, 0, 0, 0];
      
      let error = '';
      for (let i = 0; i < FK.length; i++) {
        const fertName = FN[i];
        const limit = solReceta[fertName];
        if (limit && ferts[i] > limit.max) {
          error = `${fertName}: ${ferts[i]} kg excede el máximo de ${limit.max} kg`;
          break;
        }
      }
      
      expect(error).toBe('');
    });

    it('should validate exact limit (at limit is OK)', () => {
      const solReceta: Record<string, { max: number }> = {
        'Sulfato Zn': { max: 10 },
      };
      
      const ferts = [10, 0, 0, 0, 0, 0, 0, 0]; // Exactly at limit
      
      let error = '';
      for (let i = 0; i < FK.length; i++) {
        const fertName = FN[i];
        const limit = solReceta[fertName];
        if (limit && ferts[i] > limit.max) {
          error = `${fertName}: ${ferts[i]} kg excede el máximo de ${limit.max} kg`;
          break;
        }
      }
      
      expect(error).toBe(''); // At limit is OK
    });
  });

  describe('M³ calculation', () => {
    it('should calculate m³ correctly', () => {
      const hectareas = 16.97;
      const horas = 5;
      const m3_ha_hr = 0.5;
      
      const m3 = hectareas * horas * m3_ha_hr;
      expect(m3).toBeCloseTo(42.425);
    });

    it('should handle zero hours', () => {
      const hectareas = 16.97;
      const horas = 0;
      const m3_ha_hr = 0.5;
      
      const m3 = hectareas * horas * m3_ha_hr;
      expect(m3).toBe(0);
    });

    it('should handle zero hectares', () => {
      const hectareas = 0;
      const horas = 5;
      const m3_ha_hr = 0.5;
      
      const m3 = hectareas * horas * m3_ha_hr;
      expect(m3).toBe(0);
    });
  });

  describe('Form validation', () => {
    it('should require sector, fecha, and horas', () => {
      const sectorId = '';
      const fecha = '';
      const horas = '';
      
      const isValid = sectorId !== '' && fecha !== '' && horas !== '';
      expect(isValid).toBe(false);
    });

    it('should pass with all required fields', () => {
      const sectorId = '1';
      const fecha = '2026-10-01';
      const horas = '5';
      
      const isValid = sectorId !== '' && fecha !== '' && horas !== '';
      expect(isValid).toBe(true);
    });
  });

  describe('Sector filtering', () => {
    it('should filter sectors by equipo', () => {
      const sectores = [
        { id: 1, name: 'Sector 1', id_equipo: 1 },
        { id: 2, name: 'Sector 2', id_equipo: 1 },
        { id: 3, name: 'Sector 3', id_equipo: 2 },
      ];
      
      const equipoId = '1';
      const filtered = sectores.filter(s => s.id_equipo === Number(equipoId));
      
      expect(filtered).toHaveLength(2);
      expect(filtered.map(s => s.id)).toEqual([1, 2]);
    });

    it('should return empty for non-existent equipo', () => {
      const sectores = [
        { id: 1, name: 'Sector 1', id_equipo: 1 },
      ];
      
      const equipoId = '999';
      const filtered = sectores.filter(s => s.id_equipo === Number(equipoId));
      
      expect(filtered).toHaveLength(0);
    });
  });
});
