const router = require("express").Router();
const Invite = require("../models/Invite");
const Submission = require("../models/Submission");


// LAST 7 DAYS TREND
router.get("/trend", async (req, res) => {
  let result = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const start = new Date(date.setHours(0, 0, 0, 0));
    const end = new Date(date.setHours(23, 59, 59, 999));

    const count = await Invite.countDocuments({
      createdAt: { $gte: start, $lte: end }
    });

    result.push({
      date: start.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      count
    });
  }

  res.json({ trend: result });
});

// Submission Status - Donut
router.get("/status-summary", async (req, res) => {
  const accepted = await Submission.countDocuments({ status: "accepted" });
  const rejected = await Submission.countDocuments({ status: "rejected" });
  const pending = await Submission.countDocuments({ status: "pending" });

  res.json({ accepted, rejected, pending });
});


// DASHBOARD METRICS API
router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    
    // date edges
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // INVITES
    const totalInvites = await Invite.countDocuments();
    const invitesToday = await Invite.countDocuments({ createdAt: { $gte: startToday } });
    const invitesYesterday = await Invite.countDocuments({
      createdAt: { $gte: startYesterday, $lt: startToday }
    });
    const invitesThisMonth = await Invite.countDocuments({
      createdAt: { $gte: startMonth }
    });
    const invitesPrevMonth = await Invite.countDocuments({
      createdAt: { $gte: startPrevMonth, $lte: endPrevMonth }
    });

    const pendingAll = await Invite.countDocuments({ tokenDisabled: false });

    // SUBMISSIONS
    const submittedTotal = await Submission.countDocuments();
    const submittedToday = await Submission.countDocuments({ createdAt: { $gte: startToday } });
    const pendingThisMonth = await Invite.countDocuments({
      tokenDisabled: false,
      createdAt: { $gte: startMonth }
    });

    res.json({
      success: true,
      stats: {
        totalInvites,
        submittedTotal,
        pendingAll,
        invitesToday,
        invitesYesterday,
        submittedToday,
        invitesThisMonth,
        pendingThisMonth
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// RECENT INVITES
router.get("/recent-invites", async (req, res) => {
  try {
    const invites = await Invite.find()
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({ success: true, invites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// RECENT SUBMISSIONS
router.get("/recent-submissions", async (req, res) => {
  try {
    const subs = await Submission.find()
      .populate("invite")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({ success: true, submissions: subs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
