const router = require('express').Router();
const ctrl = require('../controllers/task.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../validators/schemas');

router.use(protect);

router.get('/stats', ctrl.stats);
router.route('/')
  .get(validate({ query: s.listTasksQuery }), ctrl.listTasks)
  .post(validate({ body: s.createTask }), ctrl.createTask);

router.route('/:id')
  .get(validate({ params: s.idParam }), ctrl.getTask)
  .patch(validate({ params: s.idParam, body: s.updateTask }), ctrl.updateTask)
  .delete(validate({ params: s.idParam }), ctrl.deleteTask);

module.exports = router;
