const express = require('express');
const router = express.Router();
const supabase = require('../utils/db');

router.get('/cars/get-cars', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('cars')
            .select('id, number, department, company, type, fuel_type, gas_type, tank, year, spending_norm, active, insurance, technical_inspection, mold_insurance')
            .order('number', { ascending: true });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (err) {
        console.error('Error getting cars:', err);
        res.status(500).json({ success: false, error: 'Ошибка загрузки автомобилей' });
    }
});

router.post('/cars/save-car', async (req, res) => {
    try {
        const {
            id, number, department, company, type, fuel_type, gas_type,
            tank, year, spending_norm, active, insurance, technical_inspection, mold_insurance
        } = req.body;

        if (!number) {
            return res.status(400).json({ success: false, error: 'Номер автомобиля обязателен' });
        }

        const carData = {
            number,
            department: department || null,
            company: company || null,
            type: type || null,
            fuel_type: fuel_type || null,
            gas_type: gas_type || null,
            tank: tank || null,
            year: year || null,
            spending_norm: spending_norm || null,
            active: active !== undefined ? active : true,
            insurance: insurance || null,
            technical_inspection: technical_inspection || null,
            mold_insurance: mold_insurance || null,
            updated_at: new Date().toISOString()
        };

        let result;

        if (id) {
            const { data, error } = await supabase
                .from('cars')
                .update(carData)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            const { data, error } = await supabase
                .from('cars')
                .insert(carData)
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        res.json({ success: true, data: result });
    } catch (err) {
        console.error('Error saving car:', err);
        res.status(500).json({ success: false, error: 'Ошибка сохранения автомобиля: ' + err.message });
    }
});

router.delete('/cars/delete-car/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('cars')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting car:', err);
        res.status(500).json({ success: false, error: 'Ошибка удаления автомобиля' });
    }
});

router.post('/cars/save-milage', async (req, res) => {
    try {
        const { carNumber, milage, month, year, repairs } = req.body;

        if (!carNumber || !milage || !month || !year) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const milageStr = milage.toString();
        let repairsJson = repairs;

        if (repairs && typeof repairs === 'string') {
            try {
                JSON.parse(repairs);
            } catch {
                repairsJson = JSON.stringify([{ type: 'Ремонт', comment: '', price: parseFloat(repairs) }]);
            }
        }

        const { data: existing, error: checkError } = await supabase
            .from('cars_milage')
            .select('id')
            .eq('car', carNumber)
            .eq('month', month)
            .eq('year', year)
            .single();

        let result;

        if (existing) {
            const { data, error } = await supabase
                .from('cars_milage')
                .update({ milage: milageStr, repairs: repairsJson, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            const { data, error } = await supabase
                .from('cars_milage')
                .insert({ car: carNumber, milage: milageStr, repairs: repairsJson, month, year })
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        res.json({ success: true, milage: result });
    } catch (err) {
        console.error('Error saving milage:', err);
        res.status(500).json({ success: false, error: 'Ошибка сохранения пробега' });
    }
});

router.post('/cars/delete-milage', async (req, res) => {
    try {
        const { car, month, year } = req.body;

        if (!car || !month || !year) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const { error } = await supabase
            .from('cars_milage')
            .delete()
            .eq('car', car)
            .eq('month', month)
            .eq('year', year);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting milage:', err);
        res.status(500).json({ success: false, error: 'Ошибка удаления пробега' });
    }
});

router.get('/cars/dashboard-data', async (req, res) => {
    try {
        const { month, year } = req.query;

        const { data: cars, error: carsError } = await supabase
            .from('cars')
            .select('*')
            .order('number', { ascending: true });

        if (carsError) throw carsError;

        const carsWithData = await Promise.all(cars.map(async (car) => {
            const { data: currentMilage, error: currentMilageError } = await supabase
                .from('cars_milage')
                .select('*')
                .eq('car', car.number)
                .eq('month', month)
                .eq('year', year)
                .single();

            const monthMap = {
                "Январь": 1, "Февраль": 2, "Март": 3, "Апрель": 4, "Май": 5, "Июнь": 6,
                "Июль": 7, "Август": 8, "Сентябрь": 9, "Октябрь": 10, "Ноябрь": 11, "Декабрь": 12
            };

            const targetMonthNum = monthMap[month];
            const targetYearNum = parseInt(year);

            const { data: allMilageForPrev, error: prevError } = await supabase
                .from('cars_milage')
                .select('*')
                .eq('car', car.number)
                .order('year', { ascending: false })
                .order('month', { ascending: false });

            let previousMilage = null;
            if (!prevError && allMilageForPrev && allMilageForPrev.length > 0) {
                let mostRecentDate = null;
                for (const record of allMilageForPrev) {
                    const recordMonthNum = monthMap[record.month];
                    const recordYearNum = parseInt(record.year);
                    if (recordYearNum < targetYearNum || (recordYearNum === targetYearNum && recordMonthNum < targetMonthNum)) {
                        const recordDate = recordYearNum * 12 + recordMonthNum;
                        if (!previousMilage || recordDate > mostRecentDate) {
                            previousMilage = record;
                            mostRecentDate = recordDate;
                        }
                    }
                }
            }

            const { data: allMilage, error: allMilageError } = await supabase
                .from('cars_milage')
                .select('repairs')
                .eq('car', car.number)
                .not('repairs', 'is', null);

            const totalRepairs = allMilage && !allMilageError
                ? allMilage.reduce((sum, item) => sum + (parseFloat(item.repairs) || 0), 0)
                : 0;

            const { data: fuel, error: fuelError } = await supabase
                .from('cars_fuel')
                .select('*')
                .eq('car', car.number)
                .eq('month', month)
                .eq('year', year)
                .single();

            return {
                ...car,
                milage: { current: currentMilageError ? null : currentMilage, previous: previousMilage },
                fuel: fuelError ? null : [fuel],
                totalRepairs
            };
        }));

        res.json({ success: true, data: carsWithData });
    } catch (err) {
        console.error('Error getting dashboard data:', err);
        res.status(500).json({ success: false, error: 'Ошибка загрузки данных' });
    }
});

router.post('/cars/save-fuel', async (req, res) => {
    try {
        const { car, month, year, fuelAmount, gasAmount, comment, archive } = req.body;

        const { data: existing, error: checkError } = await supabase
            .from('cars_fuel')
            .select('id')
            .eq('car', car)
            .eq('month', month)
            .eq('year', year)
            .single();

        let result;

        if (existing) {
            const updateData = { updated_at: new Date().toISOString() };
            if (fuelAmount !== undefined) updateData.fuel_amount = fuelAmount.toString();
            if (gasAmount !== undefined) updateData.gas_amount = gasAmount.toString();
            if (comment !== undefined) updateData.comment = comment;
            if (archive !== undefined) updateData.archive = archive;

            const { data, error } = await supabase
                .from('cars_fuel')
                .update(updateData)
                .eq('id', existing.id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            const insertData = { car, month, year };
            if (fuelAmount !== undefined) insertData.fuel_amount = fuelAmount.toString();
            if (gasAmount !== undefined) insertData.gas_amount = gasAmount.toString();
            if (comment !== undefined) insertData.comment = comment;
            if (archive !== undefined) insertData.archive = archive;

            const { data, error } = await supabase
                .from('cars_fuel')
                .insert(insertData)
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        res.json({ success: true, data: result });
    } catch (err) {
        console.error('Error saving fuel data:', err);
        res.status(500).json({ success: false, error: 'Ошибка сохранения данных по топливу' });
    }
});

router.post('/cars/save-archive', async (req, res) => {
    try {
        const { carNumber, month, year, archiveData } = req.body;

        if (!carNumber || !month || !year) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const { data: existing, error: checkError } = await supabase
            .from('cars_fuel')
            .select('id')
            .eq('car', carNumber)
            .eq('month', month)
            .eq('year', year)
            .single();

        let result;

        if (existing) {
            const { data, error } = await supabase
                .from('cars_fuel')
                .update({ archive: archiveData, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            const { data, error } = await supabase
                .from('cars_fuel')
                .insert({ car: carNumber, month, year, archive: archiveData })
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        res.json({ success: true, data: result });
    } catch (err) {
        console.error('Error saving archive data:', err);
        res.status(500).json({ success: false, error: 'Ошибка сохранения данных архива' });
    }
});

router.get('/cars/missing-fuel-types', async (req, res) => {
    try {
        const { month, year } = req.query;

        const { data: cars, error: carsError } = await supabase
            .from('cars')
            .select('fuel_type')
            .not('fuel_type', 'is', null)
            .not('fuel_type', 'eq', '');

        if (carsError) throw carsError;

        const { data: fuelPrices, error: pricesError } = await supabase
            .from('fuel_prices')
            .select('fuel_type')
            .eq('month', month)
            .eq('year', year);

        if (pricesError) throw pricesError;

        const existingTypes = fuelPrices.map(p => p.fuel_type);
        const fuelTypeCounts = {};

        cars.forEach(car => {
            if (car.fuel_type && !existingTypes.includes(car.fuel_type)) {
                fuelTypeCounts[car.fuel_type] = (fuelTypeCounts[car.fuel_type] || 0) + 1;
            }
        });

        const missingFuelTypes = Object.keys(fuelTypeCounts)
            .map(fuelType => ({ fuel_type: fuelType, car_count: fuelTypeCounts[fuelType] }))
            .sort((a, b) => b.car_count - a.car_count);

        res.json({ success: true, data: missingFuelTypes });
    } catch (err) {
        console.error('Error getting missing fuel types:', err);
        res.status(500).json({ success: false, error: 'Ошибка загрузки отсутствующих типов топлива' });
    }
});

router.post('/cars/delete-fuel', async (req, res) => {
    try {
        const { car, month, year } = req.body;

        if (!car || !month || !year) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const { error } = await supabase
            .from('cars_fuel')
            .delete()
            .eq('car', car)
            .eq('month', month)
            .eq('year', year);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting fuel:', err);
        res.status(500).json({ success: false, error: 'Ошибка удаления данных топлива' });
    }
});

router.get('/cars/fuel-prices', async (req, res) => {
    try {
        const { month, year } = req.query;

        let query = supabase.from('fuel_prices').select('*');
        if (month && year) {
            query = query.eq('month', month).eq('year', year);
        }

        const { data, error } = await query.order('fuel_type', { ascending: true });
        if (error) throw error;

        res.json({ success: true, data: data || [] });
    } catch (err) {
        console.error('Error getting fuel prices:', err);
        res.status(500).json({ success: false, error: 'Ошибка загрузки цен на топливо' });
    }
});

router.post('/cars/fuel-price', async (req, res) => {
    try {
        const { id, fuelType, type, month, year, price, company } = req.body;

        if (!fuelType || !type || !company || !price) {
            return res.status(400).json({ success: false, error: 'Тип топлива, категория, компания и цена обязательны' });
        }

        const priceData = {
            fuel_type: fuelType,
            type,
            company,
            price: price.toString(),
            month: month || null,
            year: year || null
        };

        let result;

        if (id) {
            const { data, error } = await supabase
                .from('fuel_prices')
                .update(priceData)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            const { data, error } = await supabase
                .from('fuel_prices')
                .insert(priceData)
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        res.json({ success: true, data: result });
    } catch (err) {
        console.error('Error saving fuel price:', err);
        res.status(500).json({ success: false, error: 'Ошибка сохранения цены топлива' });
    }
});

router.delete('/cars/fuel-price/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('fuel_prices')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting fuel price:', err);
        res.status(500).json({ success: false, error: 'Ошибка удаления цены топлива' });
    }
});

router.get('/cars/analytics-data', async (req, res) => {
    try {
        const { startMonth, startYear, endMonth, endYear, car } = req.query;

        if (!startMonth || !startYear || !endMonth || !endYear || !car) {
            return res.status(400).json({ success: false, error: 'Missing required parameters' });
        }

        const monthMap = {
            "Январь": 1, "Февраль": 2, "Март": 3, "Апрель": 4, "Май": 5, "Июнь": 6,
            "Июль": 7, "Август": 8, "Сентябрь": 9, "Октябрь": 10, "Ноябрь": 11, "Декабрь": 12
        };

        const startMonthNum = monthMap[startMonth];
        const startYearNum = parseInt(startYear);
        const endMonthNum = monthMap[endMonth];
        const endYearNum = parseInt(endYear);

        const { data: carData, error: carError } = await supabase
            .from('cars')
            .select('*')
            .eq('number', car)
            .single();
        if (carError) throw carError;

        const { data: milageData, error: milageError } = await supabase
            .from('cars_milage')
            .select('*')
            .eq('car', car)
            .order('year', { ascending: true })
            .order('month', { ascending: true });
        if (milageError) throw milageError;

        const { data: fuelData, error: fuelError } = await supabase
            .from('cars_fuel')
            .select('*')
            .eq('car', car)
            .order('year', { ascending: true })
            .order('month', { ascending: true });
        if (fuelError) throw fuelError;

        const { data: prices, error: pricesError } = await supabase
            .from('fuel_prices')
            .select('*');
        if (pricesError) throw pricesError;

        const monthsList = [
            "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
            "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
        ];

        const labels = [];
        const metrics = {
            mileage: [], fuel_used: [], gas_used: [], fuel_cost: [],
            gas_cost: [], repairs: [], total_cost: [], efficiency: []
        };

        const GAS_TO_FUEL_RATIO = 1.0;
        let currentYear = startYearNum;
        let currentMonth = startMonthNum;

        while (currentYear < endYearNum || (currentYear === endYearNum && currentMonth <= endMonthNum)) {
            const monthName = monthsList[currentMonth - 1];
            labels.push(`${monthName} ${currentYear}`);

            const monthFuel = fuelData.find(f => f.month === monthName && f.year === currentYear.toString());
            const monthMilage = milageData.find(m => m.month === monthName && m.year === currentYear.toString());

            const fuelAmount = monthFuel?.fuel_amount ? parseFloat(monthFuel.fuel_amount) : 0;
            const gasAmount = monthFuel?.gas_amount ? parseFloat(monthFuel.gas_amount) : 0;
            const repairs = monthMilage?.repairs ? parseFloat(monthMilage.repairs) : 0;

            const fuelPrice = prices.find(p => p.fuel_type === carData.fuel_type && p.company === carData.company);
            const gasPrice = prices.find(p => p.fuel_type === carData.gas_type && p.company === carData.company);

            const fuelPricePerUnit = fuelPrice ? parseFloat(fuelPrice.price) : 0;
            const gasPricePerUnit = gasPrice ? parseFloat(gasPrice.price) : 0;

            const fuelCost = fuelAmount * fuelPricePerUnit;
            const gasCost = gasAmount * gasPricePerUnit;
            const totalCost = fuelCost + gasCost + repairs;

            metrics.mileage.push(monthMilage?.milage ? parseFloat(monthMilage.milage) : 0);
            metrics.fuel_used.push(fuelAmount);
            metrics.gas_used.push(gasAmount);
            metrics.fuel_cost.push(fuelCost);
            metrics.gas_cost.push(gasCost);
            metrics.repairs.push(repairs);
            metrics.total_cost.push(totalCost);

            let prevMilage = null;
            let bestDate = -1;
            for (const record of milageData) {
                const recordMonthNum = monthMap[record.month];
                const recordYearNum = parseInt(record.year);
                if (recordYearNum < currentYear || (recordYearNum === currentYear && recordMonthNum < currentMonth)) {
                    const recordDate = recordYearNum * 12 + recordMonthNum;
                    if (recordDate > bestDate) {
                        bestDate = recordDate;
                        prevMilage = record;
                    }
                }
            }

            if (prevMilage && monthMilage?.milage) {
                const currentMilageNum = parseFloat(monthMilage.milage);
                const prevMilageNum = parseFloat(prevMilage.milage);
                if (currentMilageNum > prevMilageNum) {
                    const monthlyMilage = currentMilageNum - prevMilageNum;
                    const totalFuelEquivalent = fuelAmount + (gasAmount * GAS_TO_FUEL_RATIO);
                    metrics.efficiency.push(
                        monthlyMilage > 0 && totalFuelEquivalent > 0
                            ? (totalFuelEquivalent / monthlyMilage) * 100
                            : 0
                    );
                } else {
                    metrics.efficiency.push(0);
                }
            } else {
                metrics.efficiency.push(0);
            }

            currentMonth++;
            if (currentMonth > 12) { currentMonth = 1; currentYear++; }
        }

        const filteredMileage = metrics.mileage.filter(v => v > 0);
        const filteredEfficiency = metrics.efficiency.filter(v => v > 0);

        const summary = [
            { metric: 'mileage', label: 'Средний пробег', value: filteredMileage.length ? filteredMileage.reduce((a, b) => a + b, 0) / filteredMileage.length : 0 },
            { metric: 'fuel_used', label: 'Всего топлива', value: metrics.fuel_used.reduce((a, b) => a + b, 0) },
            { metric: 'gas_used', label: 'Всего газа', value: metrics.gas_used.reduce((a, b) => a + b, 0) },
            { metric: 'fuel_cost', label: 'Затраты на топливо', value: metrics.fuel_cost.reduce((a, b) => a + b, 0) },
            { metric: 'gas_cost', label: 'Затраты на газ', value: metrics.gas_cost.reduce((a, b) => a + b, 0) },
            { metric: 'repairs', label: 'Затраты на ремонт', value: metrics.repairs.reduce((a, b) => a + b, 0) },
            { metric: 'total_cost', label: 'Общие затраты', value: metrics.total_cost.reduce((a, b) => a + b, 0) },
            { metric: 'efficiency', label: 'Средний расход', value: filteredEfficiency.length ? filteredEfficiency.reduce((a, b) => a + b, 0) / filteredEfficiency.length : 0 }
        ];

        res.json({ success: true, data: { labels, metrics, summary } });
    } catch (err) {
        console.error('Error getting analytics data:', err);
        res.status(500).json({ success: false, error: 'Ошибка загрузки аналитических данных' });
    }
});

module.exports = router;