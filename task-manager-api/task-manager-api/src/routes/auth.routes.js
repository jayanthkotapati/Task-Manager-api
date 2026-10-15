const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const s = require('../validators/schemas');

router.post('/register', authLimiter, validate({ body: s.register }), ctrl.register);
router.post('/login', authLimiter, validate({ body: s.login }), ctrl.login);
router.get('/me', protect, ctrl.me);

module.exports = router;
