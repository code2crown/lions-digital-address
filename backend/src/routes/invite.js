const router = require("express").Router();
const Invite = require("../models/Invite");
const { v4: uuidv4 } = require("uuid");

router.get("/all", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filters = {};

    // Date filter
    if (req.query.from || req.query.to) {
      filters.createdAt = {};
      if (req.query.from) filters.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filters.createdAt.$lte = new Date(req.query.to);
    }

    // Client filter
    if (req.query.client) {
      filters.clientName = { $regex: req.query.client, $options: "i" };
    }

    // Search by candidate name or mobile
    if (req.query.search) {
      filters.$or = [
        { candidateName: { $regex: req.query.search, $options: "i" } },
        { candidateMobile: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const total = await Invite.countDocuments(filters);

    const invites = await Invite.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      invites,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET Invite by ID

router.get("/:id", async (req, res) => {
  try {
    const invite = await Invite.findById(req.params.id);

    if (!invite) {
      return res.status(404).json({ success: false, message: "Invite not found" });
    }

    // generate link before sending
    const link = `${process.env.CLIENT_URL}/verify/${invite.token}`;

    res.json({ success: true, invite, link });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// UPDATE Invite

router.put("/update/:id", async (req, res) => {
  try {
    const updated = await Invite.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Invite not found" });
    }

    res.json({ success: true, invite: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE Invite

router.delete("/delete/:id", async (req, res) => {
  try {
    await Invite.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Invite deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create Single Invite
router.post("/create", async (req, res) => {
  try {
    const {
      clientName,
      organization,
      candidateName,
      candidateEmail,
      candidateMobile,
      fullAddress,
      district,
      pincode,
      referenceId,
    } = req.body;

    if (
      !clientName ||
      !organization ||
      !candidateName ||
      !candidateEmail ||
      !candidateMobile ||
      !fullAddress ||
      !district ||
      !pincode ||
      !referenceId
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // unique token
    const token = uuidv4();

    const invite = await Invite.create({
      clientName,
      organization,
      candidateName,
      candidateEmail,
      candidateMobile,
      fullAddress,
      district,
      pincode,
      referenceId,
      token,
    });

    // Candidate link
    const link = `${process.env.CLIENT_URL}/verify/${token}`;

    // WhatsApp auto link
    const whatsappMessage = encodeURIComponent(`Dear ${candidateName},
Your address verification is required.

Click the link below to complete your verification:
${link}`);

    const whatsappURL = `https://wa.me/${candidateMobile}?text=${whatsappMessage}`;

    return res.json({
      success: true,
      message: "Invite created successfully",
      invite,
      link,
      whatsappURL,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
