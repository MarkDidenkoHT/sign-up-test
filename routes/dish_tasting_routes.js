const express = require('express');
const router = express.Router();
const supabase = require('../utils/db');
const { notifyError } = require('../utils/errorNotifier');

router.get('/get-current-tasting-menu', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tasting_menus')
            .select('*')
            .eq('current', true)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        res.json({ 
            success: true, 
            menu: data || null 
        });
    } catch (err) {
        console.error('Error getting current menu:', err);
        await notifyError('Tasting: Get Current Menu Error', err.message, {
            endpoint: req.path,
            method: req.method,
            stack: err.stack,
            ip: req.ip
        });
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка загрузки текущего меню' 
        });
    }
});

router.get('/get-all-tasting-menus', async (req, res) => {
    try {
        const { data: menus, error: menusError } = await supabase
            .from('tasting_menus')
            .select('*')
            .order('menu_name');

        if (menusError) throw menusError;

        const menusWithCounts = await Promise.all(
            menus.map(async (menu) => {
                const { count, error: countError } = await supabase
                    .from('tasting_dishes')
                    .select('*', { count: 'exact', head: true })
                    .eq('tasting_menu', menu.menu_name);

                if (countError) {
                    console.error('Error counting dishes:', countError);
                    return { ...menu, dish_count: 0 };
                }

                return { ...menu, dish_count: count || 0 };
            })
        );

        res.json({ 
            success: true, 
            menus: menusWithCounts 
        });
    } catch (err) {
        console.error('Error getting all menus:', err);
        await notifyError('Tasting: Get All Menus Error', err.message, {
            endpoint: req.path,
            method: req.method,
            stack: err.stack,
            ip: req.ip
        });
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка загрузки меню' 
        });
    }
});

router.get('/get-tasting-dishes', async (req, res) => {
    try {
        const { menuId } = req.query;
        
        if (!menuId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing menuId parameter' 
            });
        }

        const { data: menu, error: menuError } = await supabase
            .from('tasting_menus')
            .select('menu_name')
            .eq('id', menuId)
            .single();

        if (menuError) throw menuError;

        const { data: dishes, error: dishesError } = await supabase
            .from('tasting_dishes')
            .select('*')
            .eq('tasting_menu', menu.menu_name)
            .order('dish_name');

        if (dishesError) throw dishesError;

        res.json({ 
            success: true, 
            dishes 
        });
    } catch (err) {
        console.error('Error getting tasting dishes:', err);
        await notifyError('Tasting: Get Dishes Error', err.message, {
            endpoint: req.path,
            method: req.method,
            menuId: req.query.menuId,
            stack: err.stack,
            ip: req.ip
        });
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка загрузки блюд' 
        });
    }
});

router.get('/get-user-ratings', async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing userId parameter' 
            });
        }

        const { data, error } = await supabase
            .from('tasting_results')
            .select('*')
            .eq('user_tasting', userId);

        if (error) throw error;

        res.json({ 
            success: true, 
            ratings: data 
        });
    } catch (err) {
        console.error('Error getting user ratings:', err);
        await notifyError('Tasting: Get User Ratings Error', err.message, {
            endpoint: req.path,
            method: req.method,
            userId: req.query.userId,
            stack: err.stack,
            ip: req.ip
        });
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка загрузки оценок' 
        });
    }
});

router.get('/get-average-ratings', async (req, res) => {
    try {
        const { menuId } = req.query;
        
        if (!menuId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing menuId parameter' 
            });
        }

        const { data: menu, error: menuError } = await supabase
            .from('tasting_menus')
            .select('menu_name')
            .eq('id', menuId)
            .single();

        if (menuError) throw menuError;

        const { data: results, error: resultsError } = await supabase
            .from('tasting_results')
            .select('*')
            .eq('tasting_menu', menu.menu_name);

        if (resultsError) throw resultsError;

        const { data: dishes, error: dishesError } = await supabase
            .from('tasting_dishes')
            .select('dish_name')
            .eq('tasting_menu', menu.menu_name);

        if (dishesError) throw dishesError;

        const dishStats = {};
        
        dishes.forEach(dish => {
            dishStats[dish.dish_name] = {
                dish_name: dish.dish_name,
                presentation: [],
                taste: [],
                necessity: [],
                price: [],
                comment_count: 0,
                user_count: 0
            };
        });

        results.forEach(result => {
            const dish = dishStats[result.dish_name];
            if (dish) {
                if (result.presentation) {
                    const val = parseFloat(result.presentation);
                    if (!isNaN(val)) dish.presentation.push(val);
                }
                if (result.taste) {
                    const val = parseFloat(result.taste);
                    if (!isNaN(val)) dish.taste.push(val);
                }
                if (result.necessity) {
                    const val = parseFloat(result.necessity);
                    if (!isNaN(val)) dish.necessity.push(val);
                }
                if (result.price) {
                    const val = parseFloat(result.price);
                    if (!isNaN(val)) dish.price.push(val);
                }
                if (result.comments && result.comments.trim()) {
                    dish.comment_count++;
                }
                dish.user_count++;
            }
        });

        const averages = Object.values(dishStats).map(dish => {
            const presAvg = dish.presentation.length ? 
                dish.presentation.reduce((a, b) => a + b, 0) / dish.presentation.length : null;
            const tasteAvg = dish.taste.length ? 
                dish.taste.reduce((a, b) => a + b, 0) / dish.taste.length : null;
            const necAvg = dish.necessity.length ? 
                dish.necessity.reduce((a, b) => a + b, 0) / dish.necessity.length : null;
            const priceAvg = dish.price.length ? 
                dish.price.reduce((a, b) => a + b, 0) / dish.price.length : null;
            
            let totalAvg = null;
            if (presAvg !== null && tasteAvg !== null && necAvg !== null && priceAvg !== null) {
                totalAvg = (presAvg * 0.20) + (tasteAvg * 0.35) + (necAvg * 0.25) + (priceAvg * 0.20);
            }

            return {
                dish_name: dish.dish_name,
                presentation: presAvg !== null ? presAvg.toFixed(1) : '-',
                taste: tasteAvg !== null ? tasteAvg.toFixed(1) : '-',
                necessity: necAvg !== null ? necAvg.toFixed(1) : '-',
                price: priceAvg !== null ? priceAvg.toFixed(1) : '-',
                total: totalAvg !== null ? totalAvg.toFixed(1) : '-',
                user_count: dish.user_count,
                comment_count: dish.comment_count
            };
        });

        averages.sort((a, b) => {
            const aTotal = a.total === '-' ? 0 : parseFloat(a.total);
            const bTotal = b.total === '-' ? 0 : parseFloat(b.total);
            return bTotal - aTotal;
        });

        res.json({ 
            success: true, 
            averages 
        });
    } catch (err) {
        console.error('Error getting average ratings:', err);
        await notifyError('Tasting: Get Average Ratings Error', err.message, {
            endpoint: req.path,
            method: req.method,
            menuId: req.query.menuId,
            stack: err.stack,
            ip: req.ip
        });
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка загрузки средних оценок' 
        });
    }
});

router.post('/save-tasting-rating', async (req, res) => {
    try {
        const { userId, dishName, tastingMenu, presentation, taste, necessity, price, comments } = req.body;
        
        if (!userId || !dishName || !tastingMenu) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }

        const validateRating = (rating) => {
            const num = typeof rating === 'string' ? parseFloat(rating) : Number(rating);
            return !isNaN(num) && num >= 1 && num <= 10;
        };

        const presNum = typeof presentation === 'string' ? parseFloat(presentation) : Number(presentation);
        const tasteNum = typeof taste === 'string' ? parseFloat(taste) : Number(taste);
        const necNum = typeof necessity === 'string' ? parseFloat(necessity) : Number(necessity);
        const priceNum = typeof price === 'string' ? parseFloat(price) : Number(price);

        if (!validateRating(presNum) || !validateRating(tasteNum) || 
            !validateRating(necNum) || !validateRating(priceNum)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Ratings must be numbers between 1 and 10' 
            });
        }

        const { data: existing, error: checkError } = await supabase
            .from('tasting_results')
            .select('id')
            .eq('user_tasting', userId)
            .eq('dish_name', dishName)
            .eq('tasting_menu', tastingMenu)
            .single();

        let result;
        
        if (existing) {
            const { data, error } = await supabase
                .from('tasting_results')
                .update({
                    presentation: presNum.toString(),
                    taste: tasteNum.toString(),
                    necessity: necNum.toString(),
                    price: priceNum.toString(),
                    comments: comments || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            const { data, error } = await supabase
                .from('tasting_results')
                .insert({
                    user_tasting: userId,
                    dish_name: dishName,
                    tasting_menu: tastingMenu,
                    presentation: presNum.toString(),
                    taste: tasteNum.toString(),
                    necessity: necNum.toString(),
                    price: priceNum.toString(),
                    comments: comments || null
                })
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        res.json({ 
            success: true, 
            rating: result 
        });
    } catch (err) {
        console.error('Error saving tasting rating:', err);
        await notifyError('Tasting: Save Rating Error', err.message, {
            endpoint: req.path,
            method: req.method,
            userId: req.body.userId,
            dishName: req.body.dishName,
            tastingMenu: req.body.tastingMenu,
            stack: err.stack,
            ip: req.ip
        });
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сохранения оценки' 
        });
    }
});

router.post('/create-tasting-menu', async (req, res) => {
    try {
        const { menuName } = req.body;
        
        if (!menuName) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing menuName' 
            });
        }

        const { data, error } = await supabase
            .from('tasting_menus')
            .insert({
                menu_name: menuName,
                current: false
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ 
            success: true, 
            menu: data 
        });
    } catch (err) {
        console.error('Error creating tasting menu:', err);
        await notifyError('Tasting: Create Menu Error', err.message, {
            endpoint: req.path,
            method: req.method,
            menuName: req.body.menuName,
            stack: err.stack,
            ip: req.ip
        });
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка создания меню' 
        });
    }
});

router.post('/set-current-menu', async (req, res) => {
    try {
        const { menuId } = req.body;
        
        if (!menuId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing menuId' 
            });
        }

        const { error: clearError } = await supabase
            .from('tasting_menus')
            .update({ current: false })
            .eq('current', true);

        if (clearError) throw clearError;

        const { data, error } = await supabase
            .from('tasting_menus')
            .update({ current: true })
            .eq('id', menuId)
            .select()
            .single();

        if (error) throw error;

        res.json({ 
            success: true, 
            menu: data 
        });
    } catch (err) {
        console.error('Error setting current menu:', err);
        await notifyError('Tasting: Set Current Menu Error', err.message, {
            endpoint: req.path,
            method: req.method,
            menuId: req.body.menuId,
            stack: err.stack,
            ip: req.ip
        });
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка обновления текущего меню' 
        });
    }
});

router.post('/add-tasting-dish', async (req, res) => {
    try {
        const { menuId, dishName } = req.body;
        
        if (!menuId || !dishName) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }

        const { data: menu, error: menuError } = await supabase
            .from('tasting_menus')
            .select('menu_name')
            .eq('id', menuId)
            .single();

        if (menuError) throw menuError;

        const { data, error } = await supabase
            .from('tasting_dishes')
            .insert({
                tasting_menu: menu.menu_name,
                dish_name: dishName
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ 
            success: true, 
            dish: data 
        });
    } catch (err) {
        console.error('Error adding tasting dish:', err);
        await notifyError('Tasting: Add Dish Error', err.message, {
            endpoint: req.path,
            method: req.method,
            menuId: req.body.menuId,
            dishName: req.body.dishName,
            stack: err.stack,
            ip: req.ip
        });
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка добавления блюда' 
        });
    }
});

router.post('/delete-tasting-dish', async (req, res) => {
    try {
        const { dishId } = req.body;
        
        if (!dishId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing dishId' 
            });
        }

        const { data: dish, error: dishError } = await supabase
            .from('tasting_dishes')
            .select('dish_name, tasting_menu')
            .eq('id', dishId)
            .single();

        if (dishError) throw dishError;

        const { error: ratingsError } = await supabase
            .from('tasting_results')
            .delete()
            .eq('dish_name', dish.dish_name)
            .eq('tasting_menu', dish.tasting_menu);

        if (ratingsError) console.error('Error deleting ratings:', ratingsError);

        const { error } = await supabase
            .from('tasting_dishes')
            .delete()
            .eq('id', dishId);

        if (error) throw error;

        res.json({ 
            success: true 
        });
    } catch (err) {
        console.error('Error deleting tasting dish:', err);
        await notifyError('Tasting: Delete Dish Error', err.message, {
            endpoint: req.path,
            method: req.method,
            dishId: req.body.dishId,
            stack: err.stack,
            ip: req.ip
        });
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка удаления блюда' 
        });
    }
});

router.post('/delete-tasting-menu', async (req, res) => {
    try {
        const { menuId } = req.body;
        
        if (!menuId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing menuId' 
            });
        }

        const { data: menu, error: menuError } = await supabase
            .from('tasting_menus')
            .select('menu_name')
            .eq('id', menuId)
            .single();

        if (menuError) throw menuError;

        const { error: dishesError } = await supabase
            .from('tasting_dishes')
            .delete()
            .eq('tasting_menu', menu.menu_name);

        if (dishesError) throw dishesError;

        const { error: ratingsError } = await supabase
            .from('tasting_results')
            .delete()
            .eq('tasting_menu', menu.menu_name);

        if (ratingsError) console.error('Error deleting ratings:', ratingsError);

        const { error } = await supabase
            .from('tasting_menus')
            .delete()
            .eq('id', menuId);

        if (error) throw error;

        res.json({ 
            success: true 
        });
    } catch (err) {
        console.error('Error deleting tasting menu:', err);
        await notifyError('Tasting: Delete Menu Error', err.message, {
            endpoint: req.path,
            method: req.method,
            menuId: req.body.menuId,
            stack: err.stack,
            ip: req.ip
        });
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка удаления меню' 
        });
    }
});

module.exports = router;