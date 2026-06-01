const express = require('express');
const router = express.Router();
const supabase = require('../utils/db');

let featureMappingsCache = null;
let featureMappingsLastUpdated = 0;
const FEATURE_MAPPINGS_CACHE_TTL = 60000;

const clearFeatureMappingsCache = () => {
  featureMappingsCache = null;
  featureMappingsLastUpdated = 0;
};

async function getFeatureMappings() {
  const now = Date.now();

  if (featureMappingsCache && (now - featureMappingsLastUpdated) < FEATURE_MAPPINGS_CACHE_TTL) {
    return featureMappingsCache;
  }

  try {
    const { data, error } = await supabase
      .from('component_mapping')
      .select('pc_to_component, check_type, fixed_info, feature_type, format_as_ratio');

    if (error) {
      featureMappingsCache = [];
      return featureMappingsCache;
    }

    featureMappingsCache = data;
    featureMappingsLastUpdated = now;
    return data;
  } catch (err) {
    return featureMappingsCache || [];
  }
}

function splitMultipleValues(value) {
  if (!value) return [];

  return value
    .toString()
    .split(/[\/,;•·|]/)
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .map(item => item.toLowerCase().replace(/\s+/g, ' ').trim());
}

function multiplyVolumeByQuantity(value, quantity) {
  if (quantity <= 1) return value;

  const match = value.match(/(\d+(?:\.\d+)?)\s*([A-Za-zА-Яа-я]+)/i);
  if (match) {
    const numericValue = parseFloat(match[1]);
    const unit = match[2];
    return `${numericValue * quantity} ${unit}`;
  }

  return value;
}

function compareValues(pcValue, componentValue) {
  const normalize = (val) => {
    if (!val) return '';
    return val.toString()
      .toLowerCase()
      .replace(/\s/g, '')
      .replace('gb', '')
      .replace('гб', '')
      .replace('mhz', '')
      .replace('мгц', '')
      .replace('ghz', '')
      .replace('ггц', '')
      .replace('"', '')
      .replace('дюйм', '');
  };

  return normalize(pcValue) === normalize(componentValue);
}

function getComponentCategory(componentData) {
  const categories = componentData.additional?.categories;
  if (categories && categories.length > 0) {
    return categories[categories.length - 1].category;
  }
  return 'Компонент';
}

async function checkProductOnWebsite(productCode, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const API_TOKEN = process.env.HITECH_API_TOKEN;

      if (!API_TOKEN) {
        throw new Error('HITECH_API_TOKEN environment variable is not set');
      }

      let normalizedCode = productCode;
      if (!/^[ТT]-\d{9}$/i.test(productCode)) {
        const digits = productCode.replace(/\D/g, '');
        normalizedCode = `Т-${digits.padStart(9, '0')}`;
      }

      const apiUrl = `https://hi-tech.md/product-api.php?code=${encodeURIComponent(normalizedCode)}&token=${API_TOKEN}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            continue;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          return { exists: false, fullData: null };
        }

        return { exists: true, fullData: data };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      if (attempt === retries) {
        throw new Error(`API check failed: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 300 * attempt));
    }
  }
}

async function validateComponentAgainstPC(part, componentData, pcData, featureMappings) {
  if (!componentData || !componentData.success || !pcData || !pcData.success) {
    return {
      status: 'missing',
      comparisons: [],
      componentName: null,
      componentCategory: null
    };
  }

  const comparisons = [];
  let hasMismatch = false;

  const componentFeatures = componentData.additional?.features || [];
  const pcFeatures = pcData.additional?.features || [];
  const componentName = (componentData.product?.product || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const componentTypeFeature = componentFeatures.find(f => f.feature_id === '3987');
  const componentType = componentTypeFeature ? componentTypeFeature.variant : null;

  for (const mapping of featureMappings) {
    const pcFeatureId = Object.keys(mapping.pc_to_component || {})[0];
    if (!pcFeatureId) continue;

    const mappingConfig = mapping.pc_to_component[pcFeatureId];
    if (!mappingConfig) continue;

    const pcFeatureValues = pcFeatures.filter(f => f.feature_id === pcFeatureId);
    if (pcFeatureValues.length === 0) continue;

    if (mapping.check_type === 'feature') {
      const componentFeatureId = mappingConfig.componentFeatureId;
      const componentFeatureId2 = mappingConfig.componentFeatureId2;

      if (!componentFeatureId && !componentFeatureId2) continue;

      let componentFeatureValues = componentFeatureId
        ? componentFeatures.filter(f => f.feature_id === componentFeatureId)
        : [];

      if (componentFeatureValues.length === 0 && mapping.feature_type === 'either' && componentFeatureId2) {
        componentFeatureValues = componentFeatures.filter(f => f.feature_id === componentFeatureId2);
      }

      if (componentFeatureValues.length === 0) continue;

      pcFeatureValues.forEach(pcFeature => {
        let pcValue = pcFeature.variant;

        if (
          (mappingConfig.name.includes('Объем') || mappingConfig.name.includes('Объём')) &&
          part.quantity > 1
        ) {
          pcValue = multiplyVolumeByQuantity(pcValue, part.quantity);
        }

        const pcValues = splitMultipleValues(pcValue);

        componentFeatureValues.forEach(componentFeature => {
          const componentValues = splitMultipleValues(componentFeature.variant);

          let featureMatches = false;

          outer: for (const pcVal of pcValues) {
            for (const compVal of componentValues) {
              if (compareValues(pcVal, compVal)) {
                featureMatches = true;
                break outer;
              }
            }
          }

          comparisons.push({
            featureId: pcFeatureId,
            featureName: mappingConfig.name,
            pcValue: pcFeature.variant,
            componentValue: componentFeature.variant,
            matches: featureMatches,
            formatAsRatio: mapping.format_as_ratio || false
          });

          if (!featureMatches) hasMismatch = true;
        });
      });

    } else if (mapping.check_type === 'model') {
      if (!mapping.fixed_info || !componentType) continue;

      if (mapping.fixed_info === componentType) {
        pcFeatureValues.forEach(pcFeature => {
          const pcValue = pcFeature.variant;
          const valuesMatch = compareValues(pcValue, componentName);

          comparisons.push({
            featureId: pcFeatureId,
            featureName: mappingConfig.name,
            pcValue,
            componentValue: componentName,
            matches: valuesMatch
          });

          if (!valuesMatch) hasMismatch = true;
        });
      }

    } else if (mapping.check_type === 'fixed') {
      continue;
    }
  }

  const status = comparisons.length === 0 ? 'no-data' : (hasMismatch ? 'incorrect' : 'correct');

  return {
    status,
    comparisons,
    componentName,
    componentCategory: getComponentCategory(componentData)
  };
}

router.post('/analyze-pc-batch', async (req, res) => {
  try {
    const { pcs } = req.body;

    if (!pcs || !Array.isArray(pcs)) {
      return res.json({ success: false, error: 'No PCs data provided' });
    }

    const allCodes = new Set();
    pcs.forEach(pc => {
      allCodes.add(pc.code);
      if (pc.parts && pc.parts.length > 0) {
        pc.parts.forEach(part => allCodes.add(part.code));
      }
    });

    const uniqueCodes = Array.from(allCodes);
    const codeData = new Map();

    const CONCURRENT_REQUESTS = 15;
    const BATCH_DELAY = 150;

    const codeChunks = [];
    for (let i = 0; i < uniqueCodes.length; i += CONCURRENT_REQUESTS) {
      codeChunks.push(uniqueCodes.slice(i, i + CONCURRENT_REQUESTS));
    }

    for (let chunkIndex = 0; chunkIndex < codeChunks.length; chunkIndex++) {
      const chunk = codeChunks[chunkIndex];

      const chunkResults = await Promise.all(
        chunk.map(async (code) => {
          try {
            const productData = await checkProductOnWebsite(code);
            return { code, data: productData };
          } catch (error) {
            return { code, data: { exists: false, fullData: null, error: error.message } };
          }
        })
      );

      chunkResults.forEach(({ code, data }) => codeData.set(code, data));

      if (chunkIndex < codeChunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    const FEATURE_MAPPINGS = await getFeatureMappings();
    const results = [];

    for (const pc of pcs) {
      try {
        const pcData = codeData.get(pc.code) || { exists: false, fullData: null };

        let status = 'missing';
        let websitePrice = null;
        let websiteBasePrice = null;
        let discountStatus = 'missing';
        const discountPrice = pc.discountPrice;

        if (pcData.exists && pcData.fullData) {
          websitePrice = parseFloat(pcData.fullData.product?.price);
          websiteBasePrice = parseFloat(pcData.fullData.product?.list_price);

          if (pc.excelPrice && websitePrice) {
            status = Math.abs(websitePrice - pc.excelPrice) < 1 ? 'correct' : 'incorrect';
          } else if (websitePrice) {
            status = 'partial';
          }

          if (discountPrice && websiteBasePrice) {
            discountStatus = Math.abs(websiteBasePrice - discountPrice) < 1 ? 'correct' : 'incorrect';
          } else if (websiteBasePrice) {
            discountStatus = 'partial';
          }
        }

        const partsWithValidation = [];
        if (pc.parts && pc.parts.length > 0) {
          for (const part of pc.parts) {
            const partData = codeData.get(part.code) || { exists: false, fullData: null };

            const validation = await validateComponentAgainstPC(
              part,
              partData.fullData,
              pcData.fullData,
              FEATURE_MAPPINGS
            );

            partsWithValidation.push({
              code: part.code,
              price: part.price,
              quantity: part.quantity || 1,
              productId: partData.fullData?.product?.product_id || null,
              validation
            });
          }
        }

        results.push({
          code: pc.code,
          status,
          discountStatus,
          excelPrice: pc.excelPrice,
          websitePrice,
          discountPrice: pc.discountPrice,
          websiteBasePrice,
          parts: partsWithValidation,
          fullProductData: pcData.fullData || null,
          productName: pcData.fullData?.product?.product || null,
          amount: pcData.fullData?.product?.amount || 0
        });

      } catch (error) {
        results.push({
          code: pc.code,
          status: 'error',
          discountStatus: 'error',
          excelPrice: pc.excelPrice,
          discountPrice: pc.discountPrice,
          websitePrice: null,
          websiteBasePrice: null,
          parts: [],
          fullProductData: null,
          error: error.message
        });
      }
    }

    res.json({ success: true, results });

  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get('/component-mappings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('component_mapping')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Ошибка при загрузке маппингов' });
    }

    res.json({ success: true, mappings: data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/component-mappings', async (req, res) => {
  try {
    const { pc_to_component, check_type, fixed_info, feature_type, format_as_ratio } = req.body;

    if (!pc_to_component || typeof pc_to_component !== 'object') {
      return res.status(400).json({ error: 'Invalid pc_to_component data' });
    }

    const { data, error } = await supabase
      .from('component_mapping')
      .insert({
        pc_to_component,
        check_type: check_type || 'feature',
        fixed_info: fixed_info || null,
        feature_type: feature_type || 'single',
        format_as_ratio: format_as_ratio || false
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Ошибка при создании маппинга' });
    }

    clearFeatureMappingsCache();
    res.json({ success: true, mapping: data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/component-mappings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { pc_to_component, check_type, fixed_info, feature_type, format_as_ratio } = req.body;

    if (!pc_to_component || typeof pc_to_component !== 'object') {
      return res.status(400).json({ error: 'Invalid pc_to_component data' });
    }

    const updateData = {
      pc_to_component,
      check_type: check_type || 'feature',
      feature_type: feature_type || 'single',
      format_as_ratio: format_as_ratio || false
    };

    if (fixed_info !== undefined) {
      updateData.fixed_info = fixed_info;
    }

    const { data, error } = await supabase
      .from('component_mapping')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Ошибка при обновлении маппинга' });
    }

    clearFeatureMappingsCache();
    res.json({ success: true, mapping: data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/component-mappings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('component_mapping')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Ошибка при удалении маппинга' });
    }

    clearFeatureMappingsCache();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;