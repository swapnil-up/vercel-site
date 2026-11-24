import { beforeEach, describe, expect, it } from 'vitest';
import {
  VdcLookupError,
  getDataVersion,
  getDistricts,
  getVdcsByDistrict,
  loadMappingData,
  lookup,
  lookupBatch,
  search
} from './vdcLookup.js';

const fixture = {
  version: 'test-2017-restructuring',
  districts: [
    {
      district_en: 'Kathmandu',
      district_ne: 'काठमाडौं',
      province: 3,
      vdcMappings: [
        {
          oldVdc_en: 'Dhapasi',
          oldVdc_ne: 'धापासी',
          oldWards: [1, 2, 3],
          newLocalLevel_en: 'Budhanilkantha',
          newLocalLevel_ne: 'बुढानिलकण्ठ',
          newLocalLevelType: 'Municipality',
          wardMap: { '1': 1, '2': 2, '3': 3 }
        },
        {
          oldVdc_en: 'Tokha',
          oldVdc_ne: 'टोखा',
          oldWards: [1, 2],
          newLocalLevel_en: 'Tokha',
          newLocalLevel_ne: 'टोखा',
          newLocalLevelType: 'Municipality',
          wardMap: { '1': 4, '2': 5 }
        }
      ]
    },
    {
      district_en: 'Lalitpur',
      district_ne: 'ललितपुर',
      province: 3,
      vdcMappings: [
        {
          oldVdc_en: 'Lubhu',
          oldVdc_ne: 'लुभु',
          oldWards: [1, 2, 3, 4, 5],
          newLocalLevel_en: 'Mahalaxmi',
          newLocalLevel_ne: 'महालक्ष्मी',
          newLocalLevelType: 'Municipality',
          wardMap: { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 }
        }
      ]
    },
    {
      district_en: 'Dolakha',
      district_ne: 'दोलखा',
      province: 3,
      vdcMappings: [
        {
          oldVdc_en: 'Jiri',
          oldVdc_ne: 'जिरी',
          oldWards: [1, 2],
          newLocalLevel_en: 'Jiri',
          newLocalLevel_ne: 'जिरी',
          newLocalLevelType: 'RuralMunicipality',
          wardMap: { '1': 6, '2': 7 }
        }
      ]
    }
  ]
};

beforeEach(() => loadMappingData(fixture));

describe('lookup', () => {
  it('returns all bilingual formats for a valid address', () => {
    expect(lookup({ district: 'Kathmandu', vdc: 'Dhapasi', ward: 1 })).toEqual({
      province: '3 (Bagmati)',
      province_ne: '३ (बागमती)',
      district_en: 'Kathmandu',
      district_ne: 'काठमाडौं',
      localLevel_en: 'Budhanilkantha',
      localLevel_ne: 'बुढानिलकण्ठ',
      localLevelType: 'Municipality',
      newWard: 1,
      formatted_en: 'Ward 1, Budhanilkantha, Kathmandu, Province 3',
      formatted_ne: 'वडा १, बुढानिलकण्ठ, काठमाडौं, प्रदेश ३',
      formal_en: 'Ward No. 1, Budhanilkantha Municipality, Kathmandu District, Province No. 3, Nepal',
      formal_ne: 'वडा नं. १, बुढानिलकण्ठ नगरपालिका, काठमाडौं जिल्ला, प्रदेश नं. ३, नेपाल'
    });
  });

  it('matches district and VDC in Devanagari', () => {
    const result = lookup({ district: 'काठमाडौं', vdc: 'धापासी', ward: 2 });
    expect(result.newWard).toBe(2);
    expect(result.localLevel_en).toBe('Budhanilkantha');
  });

  it('matches English names without regard to case', () => {
    expect(lookup({ district: 'kAtHmAnDu', vdc: 'dHaPaSi', ward: 3 }).newWard).toBe(3);
  });

  it('supports rural municipality output', () => {
    const result = lookup({ district: 'Dolakha', vdc: 'Jiri', ward: 1 });
    expect(result.formal_en).toContain('Rural Municipality');
    expect(result.formal_ne).toContain('गाउँपालिका');
  });

  it('supports source-specific new district names after an old district split', () => {
    const custom = structuredClone(fixture);
    custom.districts[0].vdcMappings[0].newDistrict_en = 'Kathmandu';
    custom.districts[0].vdcMappings[0].newDistrict_ne = 'काठमाडौं';
    loadMappingData(custom);
    expect(lookup({ district: 'Kathmandu', vdc: 'Dhapasi', ward: 1 }).district_ne).toBe('काठमाडौं');
  });

  it('is deterministic across repeated calls', () => {
    const input = { district: 'Kathmandu', vdc: 'Dhapasi', ward: 1 };
    const expected = lookup(input);
    for (let index = 0; index < 100; index += 1) expect(lookup(input)).toEqual(expected);
  });
});

describe('batch lookup', () => {
  it('separates successful results and invalid addresses', () => {
    const result = lookupBatch([
      { district: 'Kathmandu', vdc: 'Dhapasi', ward: 1 },
      { district: 'Kathmandu', vdc: 'Unknown', ward: 1 },
      { district: 'Lalitpur', vdc: 'Lubhu', ward: 5 }
    ]);
    expect(result.results).toHaveLength(2);
    expect(result.notFound).toHaveLength(1);
    expect(result.results[1].localLevel_en).toBe('Mahalaxmi');
  });

  it('rejects non-array batch input', () => {
    expect(() => lookupBatch(null)).toThrow(VdcLookupError);
  });
});

describe('search and browsing', () => {
  it('returns partial English and Devanagari matches', () => {
    expect(search('dhap', 5)[0].vdc).toBe('Dhapasi');
    expect(search('धापा', 5)[0].vdc_ne).toBe('धापासी');
  });

  it('respects search limit', () => {
    expect(search('a', 1)).toHaveLength(1);
  });

  it('lists districts with bilingual names and province numbers', () => {
    expect(getDistricts()).toHaveLength(3);
    expect(getDistricts()[0]).toEqual({ district_en: 'Kathmandu', district_ne: 'काठमाडौं', province: 3 });
  });

  it('lists all VDC mappings for a district', () => {
    expect(getVdcsByDistrict('काठमाडौं')).toHaveLength(2);
    expect(getVdcsByDistrict('Kathmandu')[0].oldWards).toEqual([1, 2, 3]);
  });

  it('exposes the loaded data version', () => {
    expect(getDataVersion()).toBe('test-2017-restructuring');
  });
});

describe('validation and helpful errors', () => {
  it('rejects malformed addresses', () => {
    expect(() => lookup({ district: '', vdc: 'Dhapasi', ward: 1 })).toThrowError(/requires district/);
    expect(() => lookup({ district: 'Kathmandu', vdc: 'Dhapasi', ward: 0 })).toThrowError(/between 1 and 35/);
  });

  it('provides district suggestions', () => {
    expect(() => lookup({ district: 'Unknown', vdc: 'X', ward: 1 })).toThrowError(/Available districts: Kathmandu/);
  });

  it('provides VDC suggestions', () => {
    expect(() => lookup({ district: 'Kathmandu', vdc: 'Unknown', ward: 1 })).toThrowError(/Available VDCs: Dhapasi, Tokha/);
  });

  it('provides valid ward numbers', () => {
    expect(() => lookup({ district: 'Lalitpur', vdc: 'Lubhu', ward: 9 })).toThrowError(/Valid wards: 1, 2, 3, 4, 5/);
  });

  it('rejects incomplete custom datasets without replacing the active dataset', () => {
    expect(() => loadMappingData({ districts: [] })).toThrow(VdcLookupError);
    expect(lookup({ district: 'Kathmandu', vdc: 'Dhapasi', ward: 1 }).newWard).toBe(1);
  });

  it('rejects incomplete ward maps', () => {
    const invalid = structuredClone(fixture);
    delete invalid.districts[0].vdcMappings[0].wardMap['2'];
    expect(() => loadMappingData(invalid)).toThrow(/Missing or invalid new ward mapping/);
  });

  it('rejects duplicate district and VDC records', () => {
    const duplicateDistrict = structuredClone(fixture);
    duplicateDistrict.districts.push(structuredClone(duplicateDistrict.districts[0]));
    expect(() => loadMappingData(duplicateDistrict)).toThrow(/Duplicate district/);
    const duplicateVdc = structuredClone(fixture);
    duplicateVdc.districts[0].vdcMappings.push(structuredClone(duplicateVdc.districts[0].vdcMappings[0]));
    expect(() => loadMappingData(duplicateVdc)).toThrow(/Duplicate VDC/);
  });

  it('uses stable error codes', () => {
    try {
      lookup({ district: 'Kathmandu', vdc: 'Unknown', ward: 1 });
    } catch (error) {
      expect(error).toBeInstanceOf(VdcLookupError);
      expect(error.code).toBe('VDC_NOT_FOUND');
    }
  });
});
