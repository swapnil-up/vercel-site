const PROVINCES = {
  1: ['Koshi', 'कोशी'],
  2: ['Madhesh', 'मधेश'],
  3: ['Bagmati', 'बागमती'],
  4: ['Gandaki', 'गण्डकी'],
  5: ['Lumbini', 'लुम्बिनी'],
  6: ['Karnali', 'कर्णाली'],
  7: ['Sudurpashchim', 'सुदूरपश्चिम']
};

const DEVANAGARI_DIGITS = '०१२३४५६७८९';
const TYPE_LABELS = {
  Metropolitan: ['Metropolitan City', 'महानगरपालिका'],
  SubMetropolitan: ['Sub-Metropolitan City', 'उपमहानगरपालिका'],
  Municipality: ['Municipality', 'नगरपालिका'],
  RuralMunicipality: ['Rural Municipality', 'गाउँपालिका']
};

export class VdcLookupError extends Error {
  constructor(message, code = 'LOOKUP_ERROR') {
    super(message);
    this.name = 'VdcLookupError';
    this.code = code;
  }
}

let dataset = { version: 'unloaded', districts: [] };
let districtIndex = new Map();
let vdcIndex = new Map();

function normalize(value) {
  return String(value ?? '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

function devanagari(value) {
  return String(value).replace(/[0-9]/g, digit => DEVANAGARI_DIGITS[Number(digit)]);
}

function validText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function provinceInfo(number, district) {
  const id = Number(number);
  const suppliedEn = district.province_en;
  const suppliedNe = district.province_ne;
  const defaults = PROVINCES[id];
  if (!defaults && !validText(suppliedEn)) {
    throw new VdcLookupError(`Invalid or missing province for district ${district.district_en}`, 'INVALID_DATA');
  }
  return {
    id,
    en: suppliedEn || defaults[0],
    ne: suppliedNe || (defaults && defaults[1]) || ''
  };
}

function normalizeType(value) {
  const normalized = normalize(value).replace(/[ _-]/g, '');
  const types = {
    metropolitan: 'Metropolitan',
    submetropolitan: 'SubMetropolitan',
    municipality: 'Municipality',
    nagarpalika: 'Municipality',
    ruralmunicipality: 'RuralMunicipality',
    gaunpalika: 'RuralMunicipality'
  };
  const result = types[normalized];
  if (!result) throw new VdcLookupError(`Unsupported local-level type: ${value}`, 'INVALID_DATA');
  return result;
}

function validateDataset(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.districts)) {
    throw new VdcLookupError('Mapping data must contain a districts array', 'INVALID_DATA');
  }
  if (data.districts.length === 0) {
    throw new VdcLookupError('At least one district mapping is required', 'INVALID_DATA');
  }
  const seenDistricts = new Set();
  const seenVdcs = new Set();
  for (const district of data.districts) {
    if (!validText(district.district_en) || !validText(district.district_ne)) {
      throw new VdcLookupError('Every district requires English and Devanagari names', 'INVALID_DATA');
    }
    if (!Number.isInteger(Number(district.province)) || Number(district.province) < 1 || Number(district.province) > 7) {
      throw new VdcLookupError(`Invalid province for ${district.district_en}`, 'INVALID_DATA');
    }
    const districtKey = normalize(district.district_en);
    if (seenDistricts.has(districtKey)) throw new VdcLookupError(`Duplicate district: ${district.district_en}`, 'INVALID_DATA');
    seenDistricts.add(districtKey);
    if (!Array.isArray(district.vdcMappings)) {
      throw new VdcLookupError(`District ${district.district_en} requires vdcMappings`, 'INVALID_DATA');
    }
    for (const vdc of district.vdcMappings) {
      if (!validText(vdc.oldVdc_en) || !validText(vdc.oldVdc_ne) || !Array.isArray(vdc.oldWards) || !vdc.oldWards.length || !vdc.wardMap || typeof vdc.wardMap !== 'object') {
        throw new VdcLookupError(`Incomplete VDC mapping in ${district.district_en}`, 'INVALID_DATA');
      }
      if (!validText(vdc.newLocalLevel_en) || !validText(vdc.newLocalLevel_ne)) {
        throw new VdcLookupError(`Missing bilingual new local-level name for ${vdc.oldVdc_en}`, 'INVALID_DATA');
      }
      normalizeType(vdc.newLocalLevelType);
      const vdcKey = `${districtKey}|${normalize(vdc.oldVdc_en)}`;
      if (seenVdcs.has(vdcKey)) throw new VdcLookupError(`Duplicate VDC: ${vdc.oldVdc_en}`, 'INVALID_DATA');
      seenVdcs.add(vdcKey);
      const wards = new Set();
      for (const ward of vdc.oldWards) {
        if (!Number.isInteger(ward) || ward < 1 || ward > 35 || wards.has(ward)) {
          throw new VdcLookupError(`Invalid or duplicate old ward in ${vdc.oldVdc_en}`, 'INVALID_DATA');
        }
        wards.add(ward);
        const mapped = vdc.wardMap[String(ward)];
        if (!Number.isInteger(mapped) || mapped < 1 || mapped > 32) {
          throw new VdcLookupError(`Missing or invalid new ward mapping for ${vdc.oldVdc_en}, ward ${ward}`, 'INVALID_DATA');
        }
      }
      for (const key of Object.keys(vdc.wardMap)) {
        if (!wards.has(Number(key))) throw new VdcLookupError(`Unexpected ward mapping ${key} in ${vdc.oldVdc_en}`, 'INVALID_DATA');
      }
    }
  }
  return true;
}

function rebuildIndexes() {
  districtIndex = new Map();
  vdcIndex = new Map();
  for (const district of dataset.districts) {
    const aliases = [district.district_en, district.district_ne, ...(district.aliases || [])];
    for (const alias of aliases) districtIndex.set(normalize(alias), district);
    for (const vdc of district.vdcMappings) {
      const key = `${normalize(district.district_en)}|${normalize(vdc.oldVdc_en)}`;
      vdcIndex.set(key, { district, vdc });
      for (const alias of [vdc.oldVdc_en, vdc.oldVdc_ne, ...(vdc.aliases || [])]) {
        vdcIndex.set(`${normalize(district.district_en)}|${normalize(alias)}`, { district, vdc });
      }
    }
  }
}

export function loadMappingData(mappingData) {
  validateDataset(mappingData);
  dataset = structuredClone(mappingData);
  rebuildIndexes();
}

function resolveDistrict(value) {
  const district = districtIndex.get(normalize(value));
  if (district) return district;
  const suggestions = dataset.districts.map(item => item.district_en).slice(0, 12);
  throw new VdcLookupError(`District not found: ${value}. Available districts: ${suggestions.join(', ') || 'mapping data not loaded'}`, 'DISTRICT_NOT_FOUND');
}

function buildResult(district, vdc, oldWard) {
  const province = provinceInfo(district.province, district);
  const type = normalizeType(vdc.newLocalLevelType);
  const typeLabels = TYPE_LABELS[type];
  const newWard = vdc.wardMap[String(oldWard)];
  const districtEn = vdc.newDistrict_en || district.district_en;
  const districtNe = vdc.newDistrict_ne || district.district_ne;
  const formattedEn = `Ward ${newWard}, ${vdc.newLocalLevel_en}, ${districtEn}, Province ${province.id}`;
  const formattedNe = `वडा ${devanagari(newWard)}, ${vdc.newLocalLevel_ne}, ${districtNe}, प्रदेश ${devanagari(province.id)}`;
  const formalEn = `Ward No. ${newWard}, ${vdc.newLocalLevel_en} ${typeLabels[0]}, ${districtEn} District, Province No. ${province.id}, Nepal`;
  const formalNe = `वडा नं. ${devanagari(newWard)}, ${vdc.newLocalLevel_ne} ${typeLabels[1]}, ${districtNe} जिल्ला, प्रदेश नं. ${devanagari(province.id)}, नेपाल`;
  return {
    province: `${province.id} (${province.en})`,
    province_ne: `${devanagari(province.id)} (${province.ne})`,
    district_en: districtEn,
    district_ne: districtNe,
    localLevel_en: vdc.newLocalLevel_en,
    localLevel_ne: vdc.newLocalLevel_ne,
    localLevelType: type,
    newWard,
    formatted_en: formattedEn,
    formatted_ne: formattedNe,
    formal_en: formalEn,
    formal_ne: formalNe
  };
}

export function lookup(oldAddress) {
  if (!oldAddress || typeof oldAddress !== 'object' || !validText(oldAddress.district) || !validText(oldAddress.vdc) || !Number.isInteger(oldAddress.ward)) {
    throw new VdcLookupError('Address requires district, VDC name, and an integer ward number', 'INVALID_INPUT');
  }
  if (oldAddress.ward < 1 || oldAddress.ward > 35) {
    throw new VdcLookupError('Old ward must be between 1 and 35', 'INVALID_WARD');
  }
  const district = resolveDistrict(oldAddress.district);
  const match = vdcIndex.get(`${normalize(district.district_en)}|${normalize(oldAddress.vdc)}`);
  if (!match) {
    const available = district.vdcMappings.map(item => item.oldVdc_en).slice(0, 20);
    throw new VdcLookupError(`VDC not found in ${district.district_en}: ${oldAddress.vdc}. Available VDCs: ${available.join(', ')}`, 'VDC_NOT_FOUND');
  }
  const { vdc } = match;
  if (!vdc.oldWards.includes(oldAddress.ward)) {
    throw new VdcLookupError(`Ward ${oldAddress.ward} does not exist in ${vdc.oldVdc_en}. Valid wards: ${vdc.oldWards.join(', ')}`, 'WARD_NOT_FOUND');
  }
  return buildResult(district, vdc, oldAddress.ward);
}

export function lookupBatch(addresses) {
  if (!Array.isArray(addresses)) throw new VdcLookupError('Batch input must be an array', 'INVALID_INPUT');
  const results = [];
  const notFound = [];
  for (const address of addresses) {
    try {
      results.push(lookup(address));
    } catch {
      notFound.push(address);
    }
  }
  return { results, notFound };
}

export function search(query, limit = 10) {
  if (!Number.isInteger(limit) || limit < 1) throw new VdcLookupError('Search limit must be a positive integer', 'INVALID_INPUT');
  const needle = normalize(query);
  if (!needle) return [];
  const matches = [];
  for (const district of dataset.districts) {
    for (const vdc of district.vdcMappings) {
      const fields = [district.district_en, district.district_ne, vdc.oldVdc_en, vdc.oldVdc_ne, ...(district.aliases || []), ...(vdc.aliases || [])];
      if (fields.some(field => normalize(field).includes(needle))) {
        matches.push({
          district: district.district_en,
          district_ne: district.district_ne,
          vdc: vdc.oldVdc_en,
          vdc_ne: vdc.oldVdc_ne,
          oldWards: [...vdc.oldWards]
        });
        if (matches.length >= limit) return matches;
      }
    }
  }
  return matches;
}

export function getVdcsByDistrict(name) {
  const district = resolveDistrict(name);
  return district.vdcMappings.map(vdc => ({
    vdc_en: vdc.oldVdc_en,
    vdc_ne: vdc.oldVdc_ne,
    oldWards: [...vdc.oldWards],
    newLocalLevel_en: vdc.newLocalLevel_en,
    newLocalLevel_ne: vdc.newLocalLevel_ne
  }));
}

export function getDistricts() {
  return dataset.districts.map(district => ({
    district_en: district.district_en,
    district_ne: district.district_ne,
    province: Number(district.province)
  }));
}

export function getDataVersion() {
  return dataset.version;
}
