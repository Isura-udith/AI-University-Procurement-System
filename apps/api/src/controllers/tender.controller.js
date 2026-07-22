/**
 * Tender Controller
 */
const tenderService = require('../services/tender.service');
const { success, created, paginated } = require('../utils/response');

const createTender = async (req, res, next) => {
  try { return created(res, await tenderService.create(req.body, req.user._id, req.tenantId)); } catch (err) { next(err); }
};
const getAllTenders = async (req, res, next) => {
  try { const { data, total, page, limit } = await tenderService.getAll(req.query, req.tenantId); return paginated(res, data, total, page, limit); } catch (err) { next(err); }
};
const getTender = async (req, res, next) => {
  try { return success(res, await tenderService.getById(req.params.id, req.tenantId)); } catch (err) { next(err); }
};
const updateTender = async (req, res, next) => {
  try { return success(res, await tenderService.update(req.params.id, req.body, req.user._id, req.tenantId), 'Updated'); } catch (err) { next(err); }
};
const deleteTender = async (req, res, next) => {
  try { return success(res, await tenderService.delete(req.params.id, req.user._id, req.tenantId), 'Deleted'); } catch (err) { next(err); }
};
const publishTender = async (req, res, next) => {
  try { return success(res, await tenderService.publish(req.params.id, req.user._id, req.tenantId), 'Published'); } catch (err) { next(err); }
};
const cancelTender = async (req, res, next) => {
  try { return success(res, await tenderService.cancel(req.params.id, req.body.reason, req.user._id, req.tenantId), 'Cancelled'); } catch (err) { next(err); }
};
const extendDeadline = async (req, res, next) => {
  try { return success(res, await tenderService.extendDeadline(req.params.id, req.body, req.user._id, req.tenantId), 'Deadline extended'); } catch (err) { next(err); }
};
const closeBidding = async (req, res, next) => {
  try { return success(res, await tenderService.closeBidding(req.params.id, req.user._id, req.tenantId), 'Bidding closed'); } catch (err) { next(err); }
};
const openBidBox = async (req, res, next) => {
  try { return success(res, await tenderService.openBidBox(req.params.id, req.user._id, req.tenantId), 'Bid box opened'); } catch (err) { next(err); }
};
const getBids = async (req, res, next) => {
  try { return success(res, await tenderService.getBidsForTender(req.params.id, req.tenantId, req.user)); } catch (err) { next(err); }
};
const getMyBids = async (req, res, next) => {
  try { return success(res, await tenderService.getMyBids(req.user._id, req.tenantId)); } catch (err) { next(err); }
};
const submitBid = async (req, res, next) => {
  try { return created(res, await tenderService.submitBid(req.params.id, req.body, req.user._id, req.tenantId), 'Bid submitted'); } catch (err) { next(err); }
};
const withdrawBid = async (req, res, next) => {
  try { return success(res, await tenderService.withdrawBid(req.params.id, req.params.bidId, req.user._id, req.tenantId), 'Bid withdrawn'); } catch (err) { next(err); }
};
const generateMinutes = async (req, res, next) => {
  try { return success(res, await tenderService.generateOpeningMinutes(req.params.id, req.user._id, req.tenantId)); } catch (err) { next(err); }
};
const unsealBid = async (req, res, next) => {
  try { return success(res, await tenderService.unsealBid(req.params.id, req.params.bidId, req.user._id, req.tenantId), 'Bid unsealed'); } catch (err) { next(err); }
};
const recordBidPrice = async (req, res, next) => {
  try { return success(res, await tenderService.recordBidPrice(req.params.id, req.params.bidId, req.body, req.user._id, req.tenantId), 'Price recorded'); } catch (err) { next(err); }
};
const awardTender = async (req, res, next) => {
  try { return success(res, await tenderService.awardTender(req.params.id, req.body, req.user._id, req.tenantId), 'Tender awarded'); } catch (err) { next(err); }
};
const issueLOA = async (req, res, next) => {
  try { return success(res, await tenderService.issueLOA(req.params.id, req.body, req.user._id, req.tenantId), 'LOA issued'); } catch (err) { next(err); }
};
const submitAppeal = async (req, res, next) => {
  try { return success(res, await tenderService.submitAppeal(req.params.id, req.body, req.user._id, req.tenantId), 'Appeal submitted'); } catch (err) { next(err); }
};
const resolveAppeal = async (req, res, next) => {
  try { return success(res, await tenderService.resolveAppeal(req.params.id, req.params.appealId, req.body, req.user._id, req.tenantId), 'Appeal resolved'); } catch (err) { next(err); }
};
const requestDebriefing = async (req, res, next) => {
  try { return success(res, await tenderService.requestDebriefing(req.params.id, req.body, req.user._id, req.tenantId), 'Debriefing requested'); } catch (err) { next(err); }
};
const addClarification = async (req, res, next) => {
  try { return success(res, await tenderService.addClarification(req.params.id, req.body.question, req.body.vendorId, req.tenantId)); } catch (err) { next(err); }
};
const answerClarification = async (req, res, next) => {
  try { return success(res, await tenderService.answerClarification(req.params.id, req.params.index, req.body.answer, req.tenantId), 'Clarification answered'); } catch (err) { next(err); }
};
const evaluateBid = async (req, res, next) => {
  try { return success(res, await tenderService.evaluateBid(req.params.id, req.params.bidId, req.body, req.user._id, req.tenantId), 'Bid evaluated'); } catch (err) { next(err); }
};
const completeBidOpening = async (req, res, next) => {
  try { return success(res, await tenderService.completeBidOpening(req.params.id, req.user._id, req.tenantId, req.body), 'Bid opening completed'); } catch (err) { next(err); }
};
const getEvaluationResults = async (req, res, next) => {
  try { return success(res, await tenderService.getEvaluationResults(req.params.id, req.tenantId)); } catch (err) { next(err); }
};
const submitEvaluation = async (req, res, next) => {
  try { return success(res, await tenderService.submitEvaluation(req.params.id, req.body, req.user._id, req.tenantId), 'Evaluation submitted'); } catch (err) { next(err); }
};
const addAddendum = async (req, res, next) => {
  try { return success(res, await tenderService.addAddendum(req.params.id, req.body, req.user._id, req.tenantId), 'Addendum issued'); } catch (err) { next(err); }
};
const assignCommittee = async (req, res, next) => {
  try { return success(res, await tenderService.assignCommittee(req.params.id, req.body, req.user._id, req.tenantId), 'Committee assigned'); } catch (err) { next(err); }
};
const resolveDebriefing = async (req, res, next) => {
  try { return success(res, await tenderService.resolveDebriefing(req.params.id, req.params.debriefIndex, req.body, req.user._id, req.tenantId), 'Debriefing resolved'); } catch (err) { next(err); }
};

module.exports = {
  createTender, getAllTenders, getTender, updateTender, deleteTender,
  publishTender, cancelTender, extendDeadline, closeBidding, openBidBox,
  getBids, getMyBids, submitBid, withdrawBid, generateMinutes, unsealBid,
  recordBidPrice, awardTender, issueLOA, submitAppeal, resolveAppeal,
  requestDebriefing, addClarification, answerClarification,
  evaluateBid, completeBidOpening, getEvaluationResults, submitEvaluation,
  addAddendum, assignCommittee, resolveDebriefing,
};

