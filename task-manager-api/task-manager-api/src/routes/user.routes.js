const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../validators/schemas');

// Admin only
router.use(protect, authorize('admin'));

router.get('/', validate({ query: s.listUsersQuery }), ctrl.listUsers);
router.patch('/:id/role', validate({ params: s.idParam, body: s.updateRole }), ctrl.updateRole);
router.delete('/:id', validate({ params: s.idParam }), ctrl.deleteUser);

module.exports = router;
