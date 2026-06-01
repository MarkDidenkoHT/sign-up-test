const express = require('express');
const router = express.Router();
const { verifySession } = require('../middleware/auth');

const publicRoutes = [
    'public_test_routes',
    'password_reset_routes',
    'telegram_webhook_routes_office',
    'telegram_webhook_routes_shop',
];

const protectedRoutes = [
    'dish_tasting_routes',
    'pc_checker_routes',
    'image_checker_routes',
    'stock_notifications_routes',
    'car_routes',
    'metrics_routes',
    'aeo_routes',
    'stop_list_routes',
    'car_requests_routes',
    'fuel_input_routes',
    'module_stats_routes',
    'vacations_routes',
    'timetable_routes',
    'security_routes',
    'distribution_routes',
    'tabnumber_routes',
    'shop_app_routes',
    'pricetags_routes',
    'service_routes',
    'test_routes',
    'qr_generator_routes',
    'test_form_routes',
    'rental_routes',
];

publicRoutes.forEach(name => router.use(require(`./${name}`)));

router.use(verifySession);

protectedRoutes.forEach(name => router.use(require(`./${name}`)));

module.exports = router;