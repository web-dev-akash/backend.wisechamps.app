const express = require("express");
const {
  getZohoUserDetailsWithEmail,
  getZohoUserDetailsWithPhone,
  addUserToZoho,
  generateAndSendOtp,
  resendOTP,
  getReferralAnalysisData,
} = require("../components/user.component");
const { default: axios } = require("axios");
const { authMiddleware } = require("../components/common.component");
const userRouter = express.Router();

userRouter.post("/", async (req, res) => {
  const { email, phone, referral } = req.body;
  if (email) {
    const data = await getZohoUserDetailsWithEmail(email);
    return res.status(200).send({
      ...data,
    });
  }
  const data = await getZohoUserDetailsWithPhone(phone, referral);
  return res.status(200).send({
    ...data,
  });
});

userRouter.post("/add", async (req, res) => {
  try {
    const contactData = req.body;
    const data = await addUserToZoho(contactData);
    return res.status(200).send({
      ...data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

userRouter.post("/verify", async (req, res) => {
  try {
    const { phone, email, lead_source, source_campaign } = req.body;
    const data = await generateAndSendOtp(
      phone,
      email,
      lead_source,
      source_campaign
    );
    return res.status(200).send({
      ...data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

userRouter.post("/resend/otp", async (req, res) => {
  try {
    const { phone } = req.body;
    const data = await resendOTP(phone);
    return res.status(200).send({
      ...data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

userRouter.post("/feedback", async (req, res) => {
  try {
    const { feedbackData } = req.body;
    const url =
      "https://script.google.com/macros/s/AKfycbzfelbwgNpG1v4zY8t-avVggcgH3K_7yE-r7B7eTWF45lt1q_guT4qaQTaEiYccHy-b/exec?type=feedback";
    const response = await axios.post(url, feedbackData);
    return res.status(200).send(response.data);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

userRouter.get("/analysis/referral", authMiddleware, async (req, res) => {
  try {
    const data = await getReferralAnalysisData();
    return res.status(data.status).send(data);
  } catch (error) {
    return res
      .status(500)
      .send({ status: error.status || 500, message: error.message });
  }
});

module.exports = userRouter;
