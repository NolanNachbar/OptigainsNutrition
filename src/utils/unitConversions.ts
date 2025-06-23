// Unit conversion utilities

export const CONVERSION_FACTORS = {
  // Weight conversions
  KG_TO_LBS: 2.20462,
  LBS_TO_KG: 0.453592,
  G_TO_OZ: 0.035274,
  OZ_TO_G: 28.3495,
  
  // Length conversions
  CM_TO_FT: 0.0328084,
  FT_TO_CM: 30.48,
  CM_TO_IN: 0.393701,
  IN_TO_CM: 2.54,
  
  // Volume conversions
  ML_TO_FL_OZ: 0.033814,
  FL_OZ_TO_ML: 29.5735,
};

// Weight conversions
export const convertWeight = (value: number, from: 'kg' | 'lbs' | 'g' | 'oz', to: 'kg' | 'lbs' | 'g' | 'oz'): number => {
  if (from === to) return value;
  
  // Convert to base unit (kg) first
  let valueInKg = value;
  switch (from) {
    case 'lbs':
      valueInKg = value * CONVERSION_FACTORS.LBS_TO_KG;
      break;
    case 'g':
      valueInKg = value / 1000;
      break;
    case 'oz':
      valueInKg = value * CONVERSION_FACTORS.OZ_TO_G / 1000;
      break;
  }
  
  // Convert from kg to target unit
  switch (to) {
    case 'kg':
      return valueInKg;
    case 'lbs':
      return valueInKg * CONVERSION_FACTORS.KG_TO_LBS;
    case 'g':
      return valueInKg * 1000;
    case 'oz':
      return valueInKg * 1000 * CONVERSION_FACTORS.G_TO_OZ;
  }
};

// Height conversions
export const convertHeight = (value: number, from: 'cm' | 'ft' | 'in', to: 'cm' | 'ft' | 'in'): number => {
  if (from === to) return value;
  
  // Convert to base unit (cm) first
  let valueInCm = value;
  switch (from) {
    case 'ft':
      valueInCm = value * CONVERSION_FACTORS.FT_TO_CM;
      break;
    case 'in':
      valueInCm = value * CONVERSION_FACTORS.IN_TO_CM;
      break;
  }
  
  // Convert from cm to target unit
  switch (to) {
    case 'cm':
      return valueInCm;
    case 'ft':
      return valueInCm * CONVERSION_FACTORS.CM_TO_FT;
    case 'in':
      return valueInCm * CONVERSION_FACTORS.CM_TO_IN;
  }
};

// Format weight for display
export const formatWeight = (weightInGrams: number, unit: 'metric' | 'imperial'): string => {
  if (unit === 'imperial') {
    const oz = convertWeight(weightInGrams, 'g', 'oz');
    if (oz >= 16) {
      const lbs = Math.floor(oz / 16);
      const remainingOz = oz % 16;
      if (remainingOz === 0) {
        return `${lbs} lb`;
      }
      return `${lbs} lb ${remainingOz.toFixed(1)} oz`;
    }
    return `${oz.toFixed(1)} oz`;
  } else {
    if (weightInGrams >= 1000) {
      return `${(weightInGrams / 1000).toFixed(1)} kg`;
    }
    return `${weightInGrams.toFixed(0)} g`;
  }
};

// Format body weight for display
export const formatBodyWeight = (weightInKg: number, unit: 'metric' | 'imperial'): string => {
  if (unit === 'imperial') {
    const lbs = convertWeight(weightInKg, 'kg', 'lbs');
    return `${lbs.toFixed(1)} lbs`;
  } else {
    return `${weightInKg.toFixed(1)} kg`;
  }
};

// Format height for display
export const formatHeight = (heightInCm: number, unit: 'metric' | 'imperial'): string => {
  if (unit === 'imperial') {
    const totalInches = convertHeight(heightInCm, 'cm', 'in');
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  } else {
    return `${heightInCm.toFixed(0)} cm`;
  }
};

// Parse weight input
export const parseWeightInput = (input: string, unit: 'metric' | 'imperial'): number => {
  const cleanInput = input.trim();
  
  if (unit === 'imperial') {
    // Check for "X lb Y oz" format
    const lbOzMatch = cleanInput.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs?)(?:\s+(\d+(?:\.\d+)?)\s*(?:oz)?)?/i);
    if (lbOzMatch) {
      const lbs = parseFloat(lbOzMatch[1]) || 0;
      const oz = parseFloat(lbOzMatch[2]) || 0;
      return convertWeight(lbs * 16 + oz, 'oz', 'g');
    }
    
    // Check for just oz
    const ozMatch = cleanInput.match(/(\d+(?:\.\d+)?)\s*(?:oz)/i);
    if (ozMatch) {
      return convertWeight(parseFloat(ozMatch[1]), 'oz', 'g');
    }
    
    // Default to oz if no unit specified
    const value = parseFloat(cleanInput);
    return isNaN(value) ? 0 : convertWeight(value, 'oz', 'g');
  } else {
    // Check for kg
    const kgMatch = cleanInput.match(/(\d+(?:\.\d+)?)\s*(?:kg)/i);
    if (kgMatch) {
      return parseFloat(kgMatch[1]) * 1000;
    }
    
    // Default to grams if no unit specified
    const value = parseFloat(cleanInput);
    return isNaN(value) ? 0 : value;
  }
};

// Get default food portion sizes based on unit preference
export const getDefaultPortions = (unit: 'metric' | 'imperial') => {
  if (unit === 'imperial') {
    return [
      { label: '1 oz', value: 28.35 },
      { label: '2 oz', value: 56.7 },
      { label: '3 oz', value: 85.05 },
      { label: '4 oz', value: 113.4 },
      { label: '6 oz', value: 170.1 },
      { label: '8 oz', value: 226.8 },
      { label: '12 oz', value: 340.2 },
      { label: '16 oz (1 lb)', value: 453.6 },
    ];
  } else {
    return [
      { label: '25g', value: 25 },
      { label: '50g', value: 50 },
      { label: '75g', value: 75 },
      { label: '100g', value: 100 },
      { label: '150g', value: 150 },
      { label: '200g', value: 200 },
      { label: '250g', value: 250 },
      { label: '500g', value: 500 },
    ];
  }
};