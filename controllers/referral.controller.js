const express = require("express");
const { getZohoUserData } = require("../components/referral.component");
const referralRouter = express.Router();

// get referrals data
referralRouter.get("/", async (req, res) => {
  const phone = req.query.phone;
  const data = await getZohoUserData(phone);
  res.status(200).send({
    ...data,
  });
});

module.exports = referralRouter;
