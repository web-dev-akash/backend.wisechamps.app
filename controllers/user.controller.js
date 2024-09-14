const express = require("express");
const {
  getZohoUserDetailsWithEmail,
  getZohoUserDetailsWithPhone,
  addUserToZoho,
  generateAndSendOtp,
  resendOTP,
  getReferralAnalysisData,
  updateUserDifficulty,
  getDailyRevenueAnalysisData,
} = require("../components/user.component");
const { default: axios } = require("axios");
const { authMiddleware } = require("../components/common.component");
const userRouter = express.Router();
const {
  getZohoTokenOptimized,
  getAnalysisData,
} = require("../components/common.component");

const pLimit = require("p-limit");
const limit = pLimit(20);

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

userRouter.post("/update", authMiddleware, async (req, res) => {
  try {
    const data = await updateUserDifficulty(req.body);
    return res.status(200).send(data);
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

userRouter.get("/analysis/daily", authMiddleware, async (req, res) => {
  try {
    const data = await getDailyRevenueAnalysisData();
    return res.status(200).send(data);
  } catch (error) {
    return res
      .status(500)
      .send({ status: error.status || 500, message: error.message });
  }
});

const getUserRegularToInactive = async (contactId, zohoConfig) => {
  try {
    const url = `https://www.zohoapis.com/crm/v6/Contacts/${contactId}/__timeline?sort_by=audited_time&include_inner_details=field_history.data_type, field_history.field_label, field_history.enable_colour_code, field_history.pick_list_values`;

    const data = await axios.get(url, zohoConfig);
    return data.data.__timeline;
  } catch (error) {
    throw new Error(error);
  }
};

userRouter.get("/getRegularInactiveUser", authMiddleware, async (req, res) => {
  try {
    const zohoToken = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${zohoToken}`,
      },
    };

    const userQuery = `select id, Email, Student_Name, Student_Grade, Phone from Contacts where (((Tag = 'Inactive') and (Student_Grade != 0)) and (Blocked = 'false')) limit 2000`;

    const users = await getAnalysisData(userQuery, zohoConfig);

    const totalUsers = users.data.data;

    const finalUsers = [];

    const data = await Promise.all(
      totalUsers.map(async (user) => {
        const timeline = await limit(() =>
          getUserRegularToInactive(user.id, zohoConfig)
        );

        const tagEvents = timeline.filter(
          (event) =>
            event.field_history?.length > 0 &&
            event.field_history[0].api_name === "Tag"
        );

        let inactiveIndex = -1;

        for (let i = 0; i < tagEvents.length; i++) {
          const tags = tagEvents[i].field_history[0]._value.new;
          if (tags.includes("Inactive")) {
            inactiveIndex = i;
            break;
          }
        }
        if (inactiveIndex === -1) {
          return false;
        }

        for (let i = 0; i < inactiveIndex; i++) {
          const tags = tagEvents[i].field_history[0]._value.new;
          if (tags.includes("Regular")) {
            return false;
          }
        }

        for (let i = inactiveIndex; i < tagEvents.length; i++) {
          const tags = tagEvents[i].field_history[0]._value.new;
          if (tags.includes("Regular")) {
            finalUsers.push(user);
            return;
          }
        }

        return false;
      })
    );

    return res.status(200).send({ size: finalUsers.length, finalUsers });
  } catch (error) {
    return res
      .status(500)
      .send({ status: error.status || 500, message: error.message });
  }
});

module.exports = userRouter;
