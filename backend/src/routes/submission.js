const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const Invite = require("../models/Invite");
const Submission = require("../models/Submission");
const haversine = require("../utils/distance");
const router = express.Router();

// ==============================
// GEOAPIFY STATIC MAP HELPER
// ==============================
function getGeoapifyStaticMap(lat, lng, accuracy = 50) {
  const API_KEY = process.env.GEOAPIFY_API_KEY;

  return `https://maps.geoapify.com/v1/staticmap
?style=osm-bright
&width=1600
&height=800
&scale=2
&zoom=17
&center=lonlat:${lng},${lat}
&marker=lonlat:${lng},${lat};color:%23ff0000;size:large
&circle=lonlat:${lng},${lat};radius:${accuracy};fillcolor:%23008cff33;strokeColor:%23008cff;strokeWidth:3
&apiKey=${API_KEY}`.replace(/\s+/g, "");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup (memory storage for live camera capture)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload helper
async function uploadBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder }, (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      })
      .end(buffer);
  });
}

// ADVANCED FILTERS — GET /api/submissions/filter
router.get("/filter", async (req, res) => {
  try {
    const {
      from,
      to,
      status,
      client,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    let query = {};

    // Status filter
    if (status) query.status = status;

    // Date range filter
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to + "T23:59:59");
    }

    // Client name filter
    if (client) {
      const invites = await Invite.find({
        clientName: new RegExp(client, "i"),
      }).select("_id");
      query.invite = { $in: invites.map((i) => i._id) };
    }

    // Search candidate name / mobile
    if (search) {
      const invites = await Invite.find({
        $or: [
          { candidateName: new RegExp(search, "i") },
          { candidateMobile: new RegExp(search, "i") },
        ],
      }).select("_id");

      query.invite = { $in: invites.map((i) => i._id) };
    }

    // COUNT for pagination
    const total = await Submission.countDocuments(query);

    // PAGINATED RESULTS
    const submissions = await Submission.find(query)
      .populate("invite")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      submissions,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const { candidateFields } = req.body;

    const updated = await Submission.findByIdAndUpdate(
      req.params.id,
      {
        ownership: candidateFields.ownership,
        addressType: candidateFields.addressType,
        fromMonth: candidateFields.fromMonth,
        fromYear: candidateFields.fromYear,
        toMonth: candidateFields.toMonth,
        toYear: candidateFields.toYear,
        verifiedByRelation: candidateFields.verifiedByRelation, // ⭐
        verifiedPersonName: candidateFields.verifiedPersonName, // ⭐
      },
      { new: true }
    );

    res.json({ success: true, submission: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE SINGLE SUBMISSION
router.delete("/delete/:id", async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // --- DELETE INVITE ALSO ---
    if (submission.invite) {
      await Invite.findByIdAndDelete(submission.invite);
    }

    // --- DELETE SUBMISSION ---
    await Submission.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Submission + Invite deleted permanently",
    });
  } catch (err) {
    console.error("DELETE ERROR", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// BULK DELETE SUBMISSIONS
router.post("/bulk-delete", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No submission IDs provided",
      });
    }

    // Fetch all submissions to get related invite IDs
    const submissions = await Submission.find({ _id: { $in: ids } });

    const inviteIds = submissions
      .map((s) => s.invite)
      .filter((id) => id !== undefined && id !== null);

    // DELETE SUBMISSIONS
    await Submission.deleteMany({ _id: { $in: ids } });

    // DELETE RELATED INVITES
    if (inviteIds.length > 0) {
      await Invite.deleteMany({ _id: { $in: inviteIds } });
    }

    res.json({
      success: true,
      message: `Deleted ${ids.length} submissions & ${inviteIds.length} invites`,
    });
  } catch (err) {
    console.error("BULK DELETE ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// *************************
//   CANDIDATE SUBMISSION
// *************************

router.post(
  "/submit/:token",
  upload.fields([
    { name: "houseEntrance" },
    { name: "selfieWithHouse" },
    { name: "idPhoto" },
    { name: "landmarkPhoto" },
  ]),
  async (req, res) => {
    try {
      const invite = await Invite.findOne({ token: req.params.token });

      if (!invite)
        return res
          .status(404)
          .json({ success: false, message: "Invalid token" });

      if (invite.tokenDisabled)
        return res
          .status(410)
          .json({ success: false, message: "This link is disabled" });

      const {
        lat,
        lng,
        accuracy,
        ownership,
        addressType,
        fromMonth,
        fromYear,
        toMonth,
        toYear,
        resolvedAddress,
        verifiedByRelation,
        verifiedPersonName,
      } = req.body;

      const mapImageUrl = getGeoapifyStaticMap(
        Number(lat),
        Number(lng),
        Number(accuracy || 50)
      );

      // -----------------------
      // Radius Validation (Phase-1)
      // -----------------------

      if (invite.center?.lat && invite.center?.lng && invite.radius) {
        const dist = haversine(
          invite.center.lat,
          invite.center.lng,
          Number(lat),
          Number(lng)
        );

        if (dist > invite.radius)
          return res.status(400).json({
            success: false,
            message: "You are outside the allowed verification radius.",
            distance: dist,
          });
      }

      // -----------------------
      // IMAGE UPLOAD SECTION
      // -----------------------

      const photos = {};

      if (req.files.houseEntrance) {
        photos.houseEntrance = await uploadBuffer(
          req.files.houseEntrance[0].buffer,
          "lions/house"
        );
      }

      if (req.files.selfieWithHouse) {
        photos.selfieWithHouse = await uploadBuffer(
          req.files.selfieWithHouse[0].buffer,
          "lions/selfie"
        );
      }

      if (req.files.idPhoto) {
        photos.idPhoto = await uploadBuffer(
          req.files.idPhoto[0].buffer,
          "lions/id"
        );
      }

      if (req.files.landmarkPhoto) {
        photos.landmarkPhoto = await uploadBuffer(
          req.files.landmarkPhoto[0].buffer,
          "lions/landmark"
        );
      }

      // Signature (base64)
      let signatureUrl = null;
      if (req.body.signature?.startsWith("data:image")) {
        const base64 = req.body.signature.split(",")[1];
        const buffer = Buffer.from(base64, "base64");
        signatureUrl = await uploadBuffer(buffer, "lions/signatures");
      }

      // -----------------------
      // CREATE OR UPDATE SUBMISSIO
      // -----------------------

      let submission = await Submission.findOne({ invite: invite._id });

      if (submission) {
        // 🔁 UPDATE existing (rejected) submission
        submission.ownership = ownership;
        submission.addressType = addressType;
        submission.fromMonth = fromMonth;
        submission.fromYear = fromYear;
        submission.toMonth = toMonth;
        submission.toYear = toYear;
        submission.resolvedAddress = resolvedAddress;
        submission.verifiedByRelation = verifiedByRelation;
        submission.verifiedPersonName = verifiedPersonName;

        submission.location = { lat, lng, accuracy };
        submission.mapImageUrl = mapImageUrl;
        submission.photos = photos;
        submission.signatureUrl = signatureUrl;

        submission.status = "submitted";
        submission.rejectedAt = null;
        submission.rejectReason = null;
        submission.regeneratedLink = null;

        await submission.save();
      } else {
        // 🆕 FIRST TIME submission
        submission = await Submission.create({
          invite: invite._id,
          ownership,
          addressType,
          fromMonth,
          fromYear,
          toMonth,
          toYear,
          resolvedAddress,
          verifiedByRelation,
          verifiedPersonName,

          location: { lat, lng, accuracy },
          mapImageUrl,
          photos,
          signatureUrl,

          status: "submitted",
        });
      }

      // Disable invite after submit
      invite.tokenDisabled = true;
      invite.status = "submitted";
      await invite.save();

      res.json({
        success: true,
        message: "Submission received successfully",
        submission,
      });
    } catch (err) {
      console.error("SUBMISSION ERROR:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Server error",
      });
    }
  }
);

// *************************
//   ADMIN SUBMISSION LIST
// *************************

router.get("/", async (req, res) => {
  const subs = await Submission.find()
    .sort({ createdAt: -1 })
    .populate("invite");

  res.json({ success: true, submissions: subs });
});

// *************************
//   ADMIN SINGLE SUBMISSION VIEW
// *************************

router.get("/:id", async (req, res) => {
  const sub = await Submission.findById(req.params.id).populate("invite");
  res.json({ success: true, submission: sub });
});

// *************************
//   ADMIN ACCEPT
// *************************

router.post("/accept/:id", async (req, res) => {
  try {
    const updated = await Submission.findByIdAndUpdate(
      req.params.id,
      {
        status: "accepted",
        acceptedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    res.json({
      success: true,
      submission: updated,
    });
  } catch (err) {
    console.error("ACCEPT ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Accept failed",
    });
  }
});

// *************************
//   ADMIN REJECT
// *************************

router.post("/reject/:id", async (req, res) => {
  try {
    const reason = req.body.reason?.trim();
    if (!reason) {
      return res
        .status(400)
        .json({ success: false, message: "Reason is required" });
    }

    // 1) Find submission + invite
    const submission = await Submission.findById(req.params.id).populate(
      "invite"
    );

    if (!submission) {
      return res
        .status(404)
        .json({ success: false, message: "Submission not found" });
    }

    const invite = submission.invite;

    if (!invite) {
      return res
        .status(404)
        .json({ success: false, message: "Invite not found" });
    }

    // -----------------------------
    // (A) ENABLE SAME TOKEN AGAIN
    // -----------------------------
    if (invite.tokenDisabled === true) {
      invite.tokenDisabled = false;
    }

    invite.status = "pending"; // Optional (useful for UI)
    await invite.save();

    // -----------------------------------
    // (B) GENERATE CORRECT FRONTEND URL
    // -----------------------------------
    const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
    const regeneratedLink = `${CLIENT_URL}/verify/${invite.token}`;

    // -----------------------------
    //  (C) UPDATE SUBMISSION DATA
    // -----------------------------
    submission.status = "rejected";
    submission.rejectReason = reason;
    submission.rejectedAt = new Date();
    submission.regeneratedLink = regeneratedLink; 
    await submission.save();

    // -----------------------------
    // SUCCESS RESPONSE
    // -----------------------------
    return res.json({
      success: true,
      message: "Submission rejected successfully",
      link: regeneratedLink,
      submission,
    });
  } catch (err) {
    console.error("REJECT ROUTE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error in reject route",
      error: err.message,
    });
  }
});

module.exports = router;
