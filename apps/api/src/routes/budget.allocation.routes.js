const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  createBudgetAllocation, getBudgetAllocations, getBudgetAllocation,
  advanceDistribution, getMyBudget, consumeBudget, releaseBudget,
} = require('../controllers/budget.allocation.controller');

router.use(protect);

router.get('/my-budget', getMyBudget);
router.get('/', getBudgetAllocations);
router.post('/', createBudgetAllocation);
router.get('/:id', getBudgetAllocation);
router.post('/:id/advance', advanceDistribution);
router.post('/:id/consume', consumeBudget);
router.post('/:id/release', releaseBudget);

module.exports = router;
