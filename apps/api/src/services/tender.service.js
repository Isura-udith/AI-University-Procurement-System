/**
 * Tender Service
 */
const Tender = require('../models/tender.model');
const Bid = require('../models/bid.model');
const Vendor = require('../models/vendor.model');
const { getPagination } = require('../utils/pagination');
const logger = require('../config/logger');

class TenderService {
  async create(data, userId, tenantId) {
    const tender = await Tender.create({ ...data, createdBy: userId, tenantId });
    logger.audit('TENDER_CREATED', userId, { tenderId: tender._id });
    return tender;
  }

  async getAll(query, tenantId) {
    const { page, limit, skip, sort } = getPagination(query);
    const filters = { tenantId };
    if (query.status) {
      if (typeof query.status === 'string' && query.status.includes(',')) {
        filters.status = { $in: query.status.split(',') };
      } else {
        filters.status = query.status;
      }
    }
    if (query.category) filters.category = query.category;
    const [data, total] = await Promise.all([
      Tender.find(filters)
        .populate('procurementId', 'referenceNumber title')
        .populate('createdBy', 'firstName lastName')
        .populate('appeals.vendorId', 'companyName')
        .populate('debriefingRequests.vendorId', 'companyName')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Tender.countDocuments(filters),
    ]);

    const populatedData = await Promise.all(data.map(async (tender) => {
      const tenderObj = tender.toObject();
      
      const bids = await Bid.find({ tenderId: tender._id, tenantId })
        .populate('vendorId', 'companyName')
        .sort('-combinedScore totalBidAmount');
        
      const winningBid = bids.find(b => b.status === 'awarded') || bids[0];
      const runningBids = bids.filter(b => b._id.toString() !== winningBid?._id.toString());
      
      if (winningBid) {
        tenderObj.winner = {
          name: winningBid.vendorId?.companyName || 'Unknown Vendor',
          bidAmount: winningBid.totalBidAmount || 0,
          combined: winningBid.combinedScore || 0
        };
      } else {
        tenderObj.winner = {
          name: 'N/A',
          bidAmount: 0,
          combined: 0
        };
      }
      
      tenderObj.runners = runningBids.map(b => ({
        name: b.vendorId?.companyName || 'Unknown Vendor',
        bidAmount: b.totalBidAmount || 0,
        combined: b.combinedScore || 0
      }));

      tenderObj.bidsReceived = bids.length;
      tenderObj.loaIssued = !!tender.loaIssuedAt;
      tenderObj.loaDate = tender.loaIssuedAt ? new Date(tender.loaIssuedAt).toISOString().split('T')[0] : null;
      tenderObj.loaRef = tender.loaIssuedAt ? `LOA/UWU/2026/${tender._id.toString().slice(-3).toUpperCase()}` : null;
      
      tenderObj.appeals = (tender.appeals || []).map(ap => ({
        bidder: ap.vendorId?.companyName || 'Anonymous Bidder',
        text: ap.reason || '',
        date: ap.submittedAt ? new Date(ap.submittedAt).toISOString().split('T')[0] : '',
        status: ap.status || 'pending'
      }));

      tenderObj.debriefRequests = (tender.debriefingRequests || []).map(dr => ({
        bidder: dr.vendorId?.companyName || 'Unknown Bidder',
        requestDate: dr.requestedAt ? new Date(dr.requestedAt).toISOString().split('T')[0] : '',
        status: dr.status || 'pending',
        scheduledDate: dr.scheduledDate ? new Date(dr.scheduledDate).toISOString().split('T')[0] : null
      }));

      return tenderObj;
    }));

    return { data: populatedData, total, page, limit };
  }

  async getById(id, tenantId) {
    const tender = await Tender.findOne({ _id: id, tenantId })
      .populate('procurementId')
      .populate('createdBy', 'firstName lastName')
      .populate('becMembers.userId', 'firstName lastName email')
      .populate('bocMembers.userId', 'firstName lastName email')
      .populate('appeals.vendorId', 'companyName')
      .populate('debriefingRequests.vendorId', 'companyName');
    if (!tender) throw Object.assign(new Error('Tender not found'), { statusCode: 404 });
    
    const tenderObj = tender.toObject();
    
    const bids = await Bid.find({ tenderId: tender._id, tenantId })
      .populate('vendorId', 'companyName')
      .sort('-combinedScore totalBidAmount');
      
    const winningBid = bids.find(b => b.status === 'awarded') || bids[0];
    const runningBids = bids.filter(b => b._id.toString() !== winningBid?._id.toString());
    
    if (winningBid) {
      tenderObj.winner = {
        name: winningBid.vendorId?.companyName || 'Unknown Vendor',
        bidAmount: winningBid.totalBidAmount || 0,
        combined: winningBid.combinedScore || 0
      };
    } else {
      tenderObj.winner = {
        name: 'N/A',
        bidAmount: 0,
        combined: 0
      };
    }
    
    tenderObj.runners = runningBids.map(b => ({
      name: b.vendorId?.companyName || 'Unknown Vendor',
      bidAmount: b.totalBidAmount || 0,
      combined: b.combinedScore || 0
    }));

    tenderObj.bidsReceived = bids.length;
    tenderObj.loaIssued = !!tender.loaIssuedAt;
    tenderObj.loaDate = tender.loaIssuedAt ? new Date(tender.loaIssuedAt).toISOString().split('T')[0] : null;
    tenderObj.loaRef = tender.loaIssuedAt ? `LOA/UWU/2026/${tender._id.toString().slice(-3).toUpperCase()}` : null;
    
    tenderObj.appeals = (tender.appeals || []).map(ap => ({
      bidder: ap.vendorId?.companyName || 'Anonymous Bidder',
      text: ap.reason || '',
      date: ap.submittedAt ? new Date(ap.submittedAt).toISOString().split('T')[0] : '',
      status: ap.status || 'pending'
    }));

    tenderObj.debriefRequests = (tender.debriefingRequests || []).map(dr => ({
      bidder: dr.vendorId?.companyName || 'Unknown Bidder',
      requestDate: dr.requestedAt ? new Date(dr.requestedAt).toISOString().split('T')[0] : '',
      status: dr.status || 'pending',
      scheduledDate: dr.scheduledDate ? new Date(dr.scheduledDate).toISOString().split('T')[0] : null
    }));

    return tenderObj;
  }

  async update(id, data, userId, tenantId) {
    const tender = await Tender.findOne({ _id: id, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (!['draft', 'preparation'].includes(tender.status)) {
      throw Object.assign(new Error('Cannot edit tender in current status'), { statusCode: 400 });
    }
    Object.assign(tender, data);
    await tender.save();
    logger.audit('TENDER_UPDATED', userId, { tenderId: tender._id });
    return tender;
  }

  async delete(id, userId, tenantId) {
    const tender = await Tender.findOne({ _id: id, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (!['draft', 'preparation'].includes(tender.status)) {
      throw Object.assign(new Error('Can only delete tenders in draft/preparation'), { statusCode: 400 });
    }
    await Tender.deleteOne({ _id: id });
    logger.audit('TENDER_DELETED', userId, { tenderId: id });
    return { message: 'Tender deleted' };
  }

  async publish(id, userId, tenantId) {
    const tender = await Tender.findOne({ _id: id, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    tender.status = 'published';
    tender.publishedAt = new Date();
    tender.publishedBy = userId;
    await tender.save();
    logger.audit('TENDER_PUBLISHED', userId, { tenderId: tender._id });
    return tender;
  }

  async cancel(id, reason, userId, tenantId) {
    const tender = await Tender.findOne({ _id: id, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    tender.status = 'cancelled';
    tender.cancellationReason = reason;
    tender.cancelledAt = new Date();
    tender.cancelledBy = userId;
    await tender.save();
    logger.audit('TENDER_CANCELLED', userId, { tenderId: tender._id, reason });
    return tender;
  }

  async extendDeadline(id, data, userId, tenantId) {
    const tender = await Tender.findOne({ _id: id, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (data.newDeadline) tender.bidSubmissionDeadline = new Date(data.newDeadline);
    if (data.newClosingDate) tender.closingDate = new Date(data.newClosingDate);
    await tender.save();
    logger.audit('TENDER_DEADLINE_EXTENDED', userId, { tenderId: tender._id, newDeadline: data.newDeadline });
    return tender;
  }

  async closeBidding(id, userId, tenantId) {
    const tender = await Tender.findOne({ _id: id, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (!['published', 'bidding'].includes(tender.status)) {
      throw Object.assign(new Error('Can only close bidding for published/active tenders'), { statusCode: 400 });
    }
    tender.status = 'bid_closed';
    tender.bidBoxLocked = true;
    tender.bidBoxClosedAt = new Date();
    await tender.save();
    logger.audit('BIDDING_CLOSED', userId, { tenderId: tender._id });
    return tender;
  }

  async openBidBox(id, userId, tenantId) {
    const tender = await Tender.findOne({ _id: id, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    const allowedStatuses = ['published', 'bidding', 'bid_closed', 'closed'];
    if (!allowedStatuses.includes(tender.status)) {
      throw Object.assign(new Error(`Cannot open bid box for a tender in '${tender.status}' status`), { statusCode: 400 });
    }
    if (tender.bidSubmissionDeadline && new Date() < tender.bidSubmissionDeadline) {
      throw Object.assign(new Error('Bid submission deadline not yet reached'), { statusCode: 400 });
    }
    tender.bidBoxLocked = false;
    tender.bidBoxOpenedAt = new Date();
    tender.bidBoxOpenedBy = userId;
    tender.status = 'opening';
    await tender.save();
    // Unseal all bids for the opening ceremony
    await Bid.updateMany({ tenderId: id }, { isSealed: false, openedAt: new Date() });
    logger.audit('BID_BOX_OPENED', userId, { tenderId: tender._id });
    return tender;
  }

  async getBidsForTender(tenderId, tenantId, user = null) {
    let filter = { tenderId, tenantId };
    if (user && user.role === 'supplier') {
      const vendor = await Vendor.findOne({ userId: user._id, tenantId });
      if (vendor) {
        filter.vendorId = vendor._id;
      } else {
        return [];
      }
    }
    return Bid.find(filter).populate('vendorId', 'companyName contactPerson email performanceScore').sort('totalBidAmount');
  }

  async getMyBids(userId, tenantId) {
    const vendor = await Vendor.findOne({ userId, tenantId });
    if (!vendor) return [];
    return Bid.find({ vendorId: vendor._id, tenantId })
      .populate('tenderId', 'tenderNumber title category status bidSubmissionDeadline estimatedValue')
      .sort('-submittedAt');
  }

  async submitBid(tenderId, data, userId, tenantId) {
    const tender = await Tender.findOne({ _id: tenderId, tenantId });
    if (!tender) throw Object.assign(new Error('Tender not found'), { statusCode: 404 });
    if (!['published', 'bidding'].includes(tender.status)) {
      throw Object.assign(new Error('Bids can only be submitted for active (published/bidding) tenders'), { statusCode: 400 });
    }
    if (tender.bidSubmissionDeadline && new Date() > tender.bidSubmissionDeadline) {
      throw Object.assign(new Error('Bid submission deadline has passed'), { statusCode: 400 });
    }

    // Look up the vendor associated with the logged-in supplier user
    let vendor = await Vendor.findOne({ userId, tenantId });
    if (!vendor) {
      // Fallback: allow admins/officers to test submissions via a mock vendor
      vendor = await Vendor.findOne({ companyName: 'Mock Test Supplier', tenantId });
      if (!vendor) {
        vendor = await Vendor.create({
          companyName: 'Mock Test Supplier',
          registrationNumber: 'MOCK-REG-123',
          contactPerson: 'Mock Supplier Contact',
          email: 'mock-supplier@example.com',
          tenantId,
          status: 'verified'
        });
      }
    }

    // ── Duplicate bid prevention: one active bid per vendor per tender ──
    const existingBid = await Bid.findOne({
      tenderId,
      vendorId: vendor._id,
      tenantId,
      status: { $nin: ['withdrawn'] },
    });
    if (existingBid) {
      throw Object.assign(
        new Error('You have already submitted a bid for this tender. Please withdraw your existing bid before submitting a new one.'),
        { statusCode: 409 }
      );
    }

    const bidData = {
      ...data,
      tenderId,
      vendorId: vendor._id,
      submittedBy: userId,
      tenantId,
      isSealed: true,
      submittedAt: new Date(),
    };

    const bid = await Bid.create(bidData);
    logger.audit('BID_SUBMITTED', userId, { tenderId, bidId: bid._id });
    return bid;
  }

  async withdrawBid(tenderId, bidId, userId, tenantId) {
    const bid = await Bid.findOne({ _id: bidId, tenderId, tenantId });
    if (!bid) throw Object.assign(new Error('Bid not found'), { statusCode: 404 });
    bid.status = 'withdrawn';
    bid.withdrawnAt = new Date();
    bid.withdrawnBy = userId;
    await bid.save();
    logger.audit('BID_WITHDRAWN', userId, { tenderId, bidId });
    return bid;
  }

  async generateOpeningMinutes(tenderId, userId, tenantId) {
    const tender = await Tender.findOne({ _id: tenderId, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    const bids = await Bid.find({ tenderId, tenantId }).populate('vendorId', 'companyName');
    const minutes = {
      tenderId: tender._id,
      tenderNumber: tender.tenderNumber,
      openedAt: tender.bidBoxOpenedAt,
      openedBy: tender.bidBoxOpenedBy,
      totalBidsReceived: bids.length,
      bidSummary: bids.map(b => ({
        bidId: b._id,
        vendor: b.vendorId?.companyName || 'Unknown',
        amount: b.totalBidAmount,
        submittedAt: b.submittedAt,
      })),
      generatedAt: new Date(),
    };
    logger.audit('OPENING_MINUTES_GENERATED', userId, { tenderId });
    return minutes;
  }

  async unsealBid(tenderId, bidId, userId, tenantId) {
    const bid = await Bid.findOne({ _id: bidId, tenderId, tenantId });
    if (!bid) throw Object.assign(new Error('Bid not found'), { statusCode: 404 });
    bid.isSealed = false;
    bid.openedAt = new Date();
    bid.openedBy = userId;
    await bid.save();
    logger.audit('BID_UNSEALED', userId, { tenderId, bidId });
    return bid;
  }

  async recordBidPrice(tenderId, bidId, data, userId, tenantId) {
    const bid = await Bid.findOne({ _id: bidId, tenderId, tenantId });
    if (!bid) throw Object.assign(new Error('Bid not found'), { statusCode: 404 });
    if (data.totalBidAmount !== undefined) bid.totalBidAmount = data.totalBidAmount;
    if (data.correctedPrice !== undefined) bid.correctedPrice = data.correctedPrice;
    if (data.notes) bid.evaluationNotes = data.notes;
    await bid.save();
    logger.audit('BID_PRICE_RECORDED', userId, { tenderId, bidId, amount: data.totalBidAmount });
    return bid;
  }

  async awardTender(tenderId, data, userId, tenantId) {
    const tender = await Tender.findOne({ _id: tenderId, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    tender.status = 'awarded';
    tender.awardedVendorId = data.vendorId;
    tender.awardedBidId = data.bidId;
    tender.awardDate = new Date();
    tender.awardedBy = userId;
    tender.awardAmount = data.amount;
    // Set standstill period
    const standstillDays = 10;
    tender.standstillStartDate = new Date();
    tender.standstillEndDate = new Date(Date.now() + standstillDays * 24 * 60 * 60 * 1000);
    await tender.save();

    // Update the winning bid status to 'awarded'
    await Bid.updateOne({ _id: data.bidId, tenantId }, { status: 'awarded' });

    logger.audit('TENDER_AWARDED', userId, { tenderId, vendorId: data.vendorId, amount: data.amount });
    return tender;
  }

  async issueLOA(tenderId, data, userId, tenantId) {
    const tender = await Tender.findOne({ _id: tenderId, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    tender.loaIssuedAt = new Date();
    tender.loaIssuedBy = userId;
    tender.loaDocument = data.document || null;
    tender.status = 'loa_issued';
    await tender.save();
    logger.audit('LOA_ISSUED', userId, { tenderId });
    return tender;
  }

  async submitAppeal(tenderId, data, userId, tenantId) {
    const tender = await Tender.findOne({ _id: tenderId, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (!tender.appeals) tender.appeals = [];
    
    let vendorId = data.vendorId;
    if (!vendorId && userId) {
      const vendor = await Vendor.findOne({ userId, tenantId });
      if (vendor) vendorId = vendor._id;
    }

    const appeal = {
      submittedBy: userId,
      vendorId: vendorId,
      reason: data.reason,
      submittedAt: new Date(),
      status: 'pending',
    };
    tender.appeals.push(appeal);
    await tender.save();
    logger.audit('APPEAL_SUBMITTED', userId, { tenderId, reason: data.reason });
    return tender;
  }

  async resolveAppeal(tenderId, appealIndex, data, userId, tenantId) {
    const tender = await Tender.findOne({ _id: tenderId, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    const idx = parseInt(appealIndex, 10);
    if (tender.appeals && tender.appeals[idx]) {
      tender.appeals[idx].status = data.resolution || 'resolved';
      tender.appeals[idx].resolvedBy = userId;
      tender.appeals[idx].resolvedAt = new Date();
      tender.appeals[idx].resolutionNotes = data.notes;
    }
    await tender.save();
    logger.audit('APPEAL_RESOLVED', userId, { tenderId, appealIndex: idx });
    return tender;
  }

  async requestDebriefing(tenderId, data, userId, tenantId) {
    const tender = await Tender.findOne({ _id: tenderId, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (!tender.debriefingRequests) tender.debriefingRequests = [];

    let vendorId = data.vendorId;
    if (!vendorId && userId) {
      const vendor = await Vendor.findOne({ userId, tenantId });
      if (vendor) vendorId = vendor._id;
    }

    tender.debriefingRequests.push({
      requestedBy: userId,
      vendorId: vendorId,
      requestedAt: new Date(),
      status: 'pending',
      reason: data.reason,
    });
    await tender.save();
    logger.audit('DEBRIEFING_REQUESTED', userId, { tenderId });
    return tender;
  }

  async addClarification(tenderId, question, vendorId, tenantId) {
    const tender = await Tender.findOne({ _id: tenderId, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    tender.clarifications.push({ question, askedBy: vendorId, isPublic: true });
    await tender.save();
    return tender;
  }

  async answerClarification(tenderId, clarificationIndex, answer, tenantId) {
    const tender = await Tender.findOne({ _id: tenderId, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (tender.clarifications[clarificationIndex]) {
      tender.clarifications[clarificationIndex].answer = answer;
      tender.clarifications[clarificationIndex].answeredAt = new Date();
    }
    await tender.save();
    return tender;
  }

  async evaluateBid(tenderId, bidId, scores, userId, tenantId) {
    const tender = await Tender.findOne({ _id: tenderId, tenantId });
    if (!tender) throw Object.assign(new Error('Tender not found'), { statusCode: 404 });
    const bid = await Bid.findOne({ _id: bidId, tenderId, tenantId });
    if (!bid) throw Object.assign(new Error('Bid not found'), { statusCode: 404 });

    // Save technical evaluation scores
    if (scores.technicalScores) {
      bid.technicalEvaluation = {
        scores: scores.technicalScores.map(s => ({
          criterion: s.criterion,
          maxScore: s.maxScore,
          givenScore: s.givenScore,
          justification: s.justification || '',
        })),
        totalScore: scores.technicalScores.reduce((sum, s) => sum + (s.givenScore || 0), 0),
        passed: scores.technicalScores.reduce((sum, s) => sum + (s.givenScore || 0), 0) >= (tender.technicalPassMark || 70),
        evaluatedBy: [userId],
        evaluatedAt: new Date(),
      };
    }

    // Save financial evaluation
    if (scores.financialEvaluation) {
      bid.financialEvaluation = {
        correctedBidAmount: scores.financialEvaluation.correctedAmount || bid.totalBidAmount,
        arithmeticErrors: scores.financialEvaluation.arithmeticErrors || [],
        priceAdjustments: scores.financialEvaluation.priceAdjustments || [],
        normalizedPrice: scores.financialEvaluation.normalizedPrice || bid.totalBidAmount,
        evaluatedAt: new Date(),
      };
    }

    // Calculate combined score using QCBS weighting
    const techWeight = scores.techWeight || 70;
    const finWeight = 100 - techWeight;
    const techMax = (tender.technicalCriteria || []).reduce((sum, c) => sum + (c.maxScore || 0), 0) || 100;
    const techRawScore = bid.technicalEvaluation?.totalScore || 0;
    const techWeightedScore = techMax > 0 ? (techRawScore / techMax) * techWeight : 0;

    // Financial scoring: lowest price gets full financial weight
    const allBids = await Bid.find({ tenderId, tenantId, status: { $nin: ['withdrawn', 'non_responsive'] } });
    const lowestPrice = Math.min(...allBids.map(b => b.financialEvaluation?.correctedBidAmount || b.totalBidAmount || Infinity));
    const bidPrice = bid.financialEvaluation?.correctedBidAmount || bid.totalBidAmount || Infinity;
    const finWeightedScore = bidPrice > 0 ? (lowestPrice / bidPrice) * finWeight : 0;

    bid.combinedScore = Math.round((techWeightedScore + finWeightedScore) * 10) / 10;
    bid.status = 'financially_evaluated';
    await bid.save();

    // Re-rank all evaluated bids
    const evaluatedBids = await Bid.find({ tenderId, tenantId, combinedScore: { $exists: true, $ne: null } }).sort('-combinedScore');
    for (let i = 0; i < evaluatedBids.length; i++) {
      evaluatedBids[i].rank = i + 1;
      await evaluatedBids[i].save();
    }

    logger.audit('BID_EVALUATED', userId, { tenderId, bidId, combinedScore: bid.combinedScore });
    return bid;
  }

  async completeBidOpening(tenderId, userId, tenantId) {
    const tender = await Tender.findOne({ _id: tenderId, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    
    const bids = await Bid.find({ tenderId, tenantId }).populate('vendorId', 'companyName');
    const minutes = {
      tenderId: tender._id,
      tenderNumber: tender.tenderNumber,
      openedAt: tender.bidBoxOpenedAt,
      openedBy: tender.bidBoxOpenedBy,
      completedAt: new Date(),
      completedBy: userId,
      totalBidsReceived: bids.length,
      bidSummary: bids.map(b => ({
        bidId: b._id,
        vendor: b.vendorId?.companyName || 'Unknown',
        amount: b.totalBidAmount,
        submittedAt: b.submittedAt,
        bidSecurityPresent: !!b.bidSecurityDocument,
      })),
    };

    tender.status = 'evaluation';
    tender.bidOpeningCompletedAt = new Date();
    tender.bidOpeningCompletedBy = userId;
    tender.bidOpeningMinutes = minutes;
    await tender.save();

    // Mark all bids as opened
    await Bid.updateMany(
      { tenderId, tenantId },
      { isSealed: false, status: 'opened', openedAt: new Date() }
    );

    logger.audit('BID_OPENING_COMPLETED', userId, { tenderId, bidsCount: bids.length });
    return { tender, minutes };
  }

  async getEvaluationResults(tenderId, tenantId) {
    const tender = await Tender.findOne({ _id: tenderId, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    
    const bids = await Bid.find({ tenderId, tenantId, status: { $nin: ['withdrawn'] } })
      .populate('vendorId', 'companyName contactPerson email performanceScore')
      .sort('-combinedScore totalBidAmount');

    const techCriteria = (tender.technicalCriteria || []).map(c => ({
      name: c.criterion,
      max: c.maxScore,
      key: c.criterion.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    }));

    const techMax = techCriteria.reduce((sum, c) => sum + c.max, 0) || 100;
    const techWeight = 70; // Default QCBS weight
    const finWeight = 30;
    const lowestPrice = Math.min(...bids.map(b => b.financialEvaluation?.correctedBidAmount || b.totalBidAmount || Infinity));

    const results = bids.map((bid, i) => {
      const techScores = {};
      (bid.technicalEvaluation?.scores || []).forEach(s => {
        const key = s.criterion.toLowerCase().replace(/[^a-z0-9]/g, '_');
        techScores[key] = s.givenScore || 0;
      });

      const rawTech = Object.values(techScores).reduce((s, v) => s + v, 0);
      const techPercent = techMax > 0 ? (rawTech / techMax) * 100 : 0;
      const techWeighted = (techPercent * techWeight) / 100;
      
      const bidPrice = bid.financialEvaluation?.correctedBidAmount || bid.totalBidAmount || 0;
      const finWeighted = bidPrice > 0 ? (lowestPrice / bidPrice) * finWeight : 0;
      const combined = bid.combinedScore || Math.round((techWeighted + finWeighted) * 10) / 10;

      return {
        id: bid._id,
        vendorId: bid.vendorId,
        name: bid.vendorId?.companyName || 'Unknown Vendor',
        techScores,
        quotedPrice: bid.totalBidAmount || 0,
        correctedPrice: bid.financialEvaluation?.correctedBidAmount || bid.totalBidAmount || 0,
        techWeighted: Math.round(techWeighted * 10) / 10,
        finWeighted: Math.round(finWeighted * 10) / 10,
        combined,
        rank: bid.rank || i + 1,
        hasAnomaly: (bid.aiAnalysis?.anomalyFlags || []).length > 0,
        status: bid.status,
      };
    });

    return { results, criteria: techCriteria, techWeight, finWeight, tender: { _id: tender._id, tenderNumber: tender.tenderNumber, title: tender.title } };
  }

  async submitEvaluation(tenderId, data, userId, tenantId) {
    const tender = await Tender.findOne({ _id: tenderId, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });

    // Store the evaluation submission metadata
    tender.evaluationSubmittedAt = new Date();
    tender.evaluationSubmittedBy = userId;
    await tender.save();

    logger.audit('EVALUATION_SUBMITTED', userId, { tenderId });
    return tender;
  }

  async addAddendum(tenderId, data, userId, tenantId) {
    const tender = await Tender.findOne({ _id: tenderId, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (!tender.addenda) tender.addenda = [];
    const addendumNumber = tender.addenda.length + 1;
    tender.addenda.push({
      number: addendumNumber,
      description: data.description,
      document: data.document || null,
      issuedAt: new Date(),
      issuedBy: userId,
    });
    await tender.save();
    logger.audit('ADDENDUM_ISSUED', userId, { tenderId, addendumNumber });
    return tender;
  }

  async assignCommittee(tenderId, data, userId, tenantId) {
    const tender = await Tender.findOne({ _id: tenderId, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (data.becMembers) {
      tender.becMembers = data.becMembers.map(m => ({
        userId: m.userId,
        role: m.role || 'member',
        coiDeclared: m.coiDeclared || false,
      }));
    }
    if (data.bocMembers) {
      tender.bocMembers = data.bocMembers.map(m => ({
        userId: m.userId,
        role: m.role || 'member',
      }));
    }
    await tender.save();
    logger.audit('COMMITTEE_ASSIGNED', userId, { tenderId });
    return tender;
  }

  async resolveDebriefing(tenderId, debriefIndex, data, userId, tenantId) {
    const tender = await Tender.findOne({ _id: tenderId, tenantId });
    if (!tender) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    const idx = parseInt(debriefIndex, 10);
    if (tender.debriefingRequests && tender.debriefingRequests[idx]) {
      tender.debriefingRequests[idx].status = data.status || 'scheduled';
      tender.debriefingRequests[idx].scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : new Date();
    }
    await tender.save();
    logger.audit('DEBRIEFING_RESOLVED', userId, { tenderId, debriefIndex: idx });
    return tender;
  }
}

module.exports = new TenderService();
