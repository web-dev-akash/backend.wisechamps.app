const express = require("express");
const {
  getZohoUserDetailsWithEmail,
  getZohoUserDetailsWithPhone,
  addUserToZoho,
  generateAndSendOtp,
} = require("../components/user.component");
const { default: axios } = require("axios");
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
    const { phone } = req.body;
    const data = await generateAndSendOtp(phone);
    return res.status(data.status).send({
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

module.exports = userRouter;
