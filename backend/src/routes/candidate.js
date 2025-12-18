const router = require("express").Router();
const Invite = require("../models/Invite");

// GET invite details by token (prefill candidate form)
router.get("/invite/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const invite = await Invite.findOne({ token });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired invite link"
      });
    }

    if (invite.tokenDisabled) {
  return res.status(403).json({
    success: false,
    message: "This link has already been used"
  });
}


    return res.json({
      success: true,
      invite: {
        clientName: invite.clientName,
        organization: invite.organization,

        candidateName: invite.candidateName,
        candidateEmail: invite.candidateEmail,
        candidateMobile: invite.candidateMobile,

        fullAddress: invite.fullAddress,
        district: invite.district,
        pincode: invite.pincode,

        referenceId: invite.referenceId,

        token: invite.token
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
