const fs = require("fs");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const Razorpay = require("razorpay");
require("dotenv").config();
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 8080;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const refreshToken = process.env.REFRESH_TOKEN;
let accessToken = "";
let tokenTime = 0;
let logsData = {};
fs.readFile("./token.json", function (err, data) {
  if (err) throw err;
  const token = JSON.parse(data);
  accessToken = token.token;
  tokenTime = token.time;
});

fs.readFile("./logs.json", function (err, data) {
  if (err) throw err;
  const logs = JSON.parse(data);
  logsData = { ...logs };
});

const freeMeetLink = `https://us06web.zoom.us/j/2616664243?pwd=TVVzblZXd1Nwb20wRi9zWVJURGJsQT09`;

const getZohoToken = async () => {
  try {
    const res = await axios.post(
      `https://accounts.zoho.com/oauth/v2/token?client_id=${clientId}&grant_type=refresh_token&client_secret=${clientSecret}&refresh_token=${refreshToken}`
    );
    // console.log(res.data);
    const token = res.data.access_token;
    return token;
  } catch (error) {
    return error;
  }
};

const getZohoTokenOptimized = async () => {
  if (!accessToken) {
    accessToken = await getZohoToken();
    tokenTime = Math.floor(new Date() / 1000);
    const tokenData = {
      token: accessToken,
      time: tokenTime,
    };
    fs.writeFile("./token.json", JSON.stringify(tokenData, null, 2), (err) => {
      if (err) throw err;
      console.log("Done writing");
    });
  } else {
    if (Math.floor(new Date() / 1000) - tokenTime > 2400) {
      accessToken = await getZohoToken();
      tokenTime = Math.floor(new Date() / 1000);
      const tokenData = {
        token: accessToken,
        time: tokenTime,
      };
      fs.writeFile(
        "./token.json",
        JSON.stringify(tokenData, null, 2),
        (err) => {
          if (err) throw err;
          console.log("Done writing");
        }
      );
    }
  }
  return accessToken;
};

const updateStatus = async (contactid, key, value) => {
  const zohoToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${zohoToken}`,
    },
  };
  const body = {
    data: [
      {
        id: contactid,
        [key]: value,
        $append_values: {
          [key]: true,
        },
      },
    ],
    duplicate_check_fields: ["id"],
    apply_feature_execution: [
      {
        name: "layout_rules",
      },
    ],
    trigger: ["workflow"],
  };
  await axios.post(
    `https://www.zohoapis.com/crm/v3/Contacts/upsert`,
    body,
    zohoConfig
  );
};

const getMeetingLink = async (emailParam, payId) => {
  logsData.zoomLogs.push({
    email: emailParam,
    description: "EnteredEmail",
  });
  fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
    if (err) throw err;
    console.log("Done writing");
  });
  // return "success";
  const accessToken = await getZohoTokenOptimized();
  console.log("Token :", accessToken);
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${accessToken}`,
    },
  };

  const contact = await axios.get(
    `https://www.zohoapis.com/crm/v2/Contacts/search?email=${emailParam}`,
    zohoConfig
  );

  if (contact.status >= 400) {
    logsData.zoomLogs.push({
      email: emailParam,
      description: `internalservererrorinfindinguser ${contact.status}`,
    });
    fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
      if (err) throw err;
      console.log("Done writing");
    });
    return {
      status: contact.status,
      mode: "internalservererrorinfindinguser",
    };
  }
  // // return { contact };
  if (contact.status === 204) {
    logsData.zoomLogs.push({
      email: emailParam,
      description: `nouser 204`,
    });
    fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
      if (err) throw err;
      console.log("Done writing");
    });
    return {
      status: contact.status,
      mode: "nouser",
    };
  }

  const email = contact.data.data[0].Email;
  const grade = contact.data.data[0].Student_Grade;
  const credits = contact.data.data[0].Credits;
  const date = new Date();
  const start = new Date();
  start.setMinutes(start.getMinutes() + 270);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const startHours = start.getHours().toString().padStart(2, "0");
  const endHours = end.getHours().toString().padStart(2, "0");
  const startMinutes = start.getMinutes().toString().padStart(2, "0");
  const endMinutes = end.getMinutes().toString().padStart(2, "0");
  const formattedDateStart = `${year}-${month}-${day}T${startHours}:${startMinutes}:00+05:30`;
  const formattedDateEnd = `${year}-${month}-${day}T${endHours}:${endMinutes}:00+05:30`;
  const sessionBody = {
    select_query: `select Session_Grade, LMS_Activity_ID, Explanation_Meeting_Link from Sessions where Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}'`,
  };

  const session = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    sessionBody,
    zohoConfig
  );

  if (session.status >= 400) {
    logsData.zoomLogs.push({
      email: emailParam,
      description: `internalservererrorinfindingsession ${session.status}`,
    });
    fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
      if (err) throw err;
      console.log("Done writing");
    });
    return {
      status: session.status,
      mode: "internalservererrorinfindingsession",
    };
  }

  if (session.status === 204) {
    logsData.zoomLogs.push({
      email: emailParam,
      description: `nosession ${session.status}`,
    });
    fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
      if (err) throw err;
      console.log("Done writing");
    });
    return {
      status: session.status,
      mode: "nosession",
    };
  }

  for (let i = 0; i < session.data.data.length; i++) {
    const sessionGrade = session.data.data[i].Session_Grade;
    const paidMeetLink = session.data.data[i].Explanation_Meeting_Link;
    let link = !credits || credits == 0 ? freeMeetLink : paidMeetLink;
    link = payId ? paidMeetLink : link;
    const correctSession = sessionGrade.find((res) => res === grade);
    if (correctSession) {
      logsData.zoomLogs.push({
        email: emailParam,
        description: `LinkGenerated 200`,
      });
      fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
        if (err) throw err;
        console.log("Done writing");
      });
      return {
        status: 200,
        formattedDateStart,
        formattedDateEnd,
        mode: "zoomlink",
        email,
        link,
      };
    }
  }

  logsData.zoomLogs.push({
    email: emailParam,
    description: `nosession 204`,
  });
  fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
    if (err) throw err;
    console.log("Done writing");
  });
  return {
    status: session.status,
    mode: "nosession",
  };
};

const getZohoUserData = async (phone) => {
  const zohoToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${zohoToken}`,
    },
  };
  const contact = await axios.get(
    `https://www.zohoapis.com/crm/v2/Contacts/search?phone=${phone}`,
    zohoConfig
  );

  if (!contact || !contact.data || !contact.data.data) {
    return { phone, message: "No Contact Found" };
  }
  const contactid = contact.data.data[0].id;
  const name = contact.data.data[0].Full_Name;
  return { name, contactid };
};

const getQuizLink = async (emailParam) => {
  logsData.quizLogs.push({
    email: emailParam,
    description: "EnteredEmail",
  });
  fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
    if (err) throw err;
    console.log("Done writing");
  });
  const accessToken = await getZohoTokenOptimized();
  console.log("Token :", accessToken);
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${accessToken}`,
    },
  };
  const contact = await axios.get(
    `https://www.zohoapis.com/crm/v2/Contacts/search?email=${emailParam}`,
    zohoConfig
  );

  if (contact.status >= 400) {
    logsData.quizLogs.push({
      email: emailParam,
      description: `internalservererrorinfindinguser ${contact.status}`,
    });
    fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
      if (err) throw err;
      console.log("Done writing");
    });
    return {
      status: contact.status,
      mode: "internalservererrorinfindinguser",
    };
  }
  // return { contact };
  if (contact.status === 204) {
    logsData.quizLogs.push({
      email: emailParam,
      description: `nouser ${contact.status}`,
    });
    fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
      if (err) throw err;
      console.log("Done writing");
    });
    return {
      status: contact.status,
      mode: "nouser",
    };
  }
  const contactid = contact.data.data[0].id;
  const email = contact.data.data[0].Email;
  const grade = contact.data.data[0].Student_Grade;
  const date = new Date();
  const start = new Date();
  start.setMinutes(start.getMinutes() + 300);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const startHours = start.getHours().toString().padStart(2, "0");
  const endHours = end.getHours().toString().padStart(2, "0");
  const startMinutes = start.getMinutes().toString().padStart(2, "0");
  const endMinutes = end.getMinutes().toString().padStart(2, "0");
  const formattedDateStart = `${year}-${month}-${day}T${startHours}:${startMinutes}:00+05:30`;
  const formattedDateEnd = `${year}-${month}-${day}T${endHours}:${endMinutes}:00+05:30`;
  // console.log("Start", formattedDateStart);
  const sessionBody = {
    select_query: `select Session_Grade, LMS_Activity_ID from Sessions where Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}'`,
  };

  const session = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    sessionBody,
    zohoConfig
  );

  if (session.status >= 400) {
    logsData.quizLogs.push({
      email: emailParam,
      description: `internalservererrorinfindingsession ${session.status}`,
    });
    fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
      if (err) throw err;
      console.log("Done writing");
    });
    return {
      status: session.status,
      mode: "internalservererrorinfindingsession",
    };
  }

  if (session.status === 204) {
    logsData.quizLogs.push({
      email: emailParam,
      description: `nosession ${session.status}`,
    });
    fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
      if (err) throw err;
      console.log("Done writing");
    });
    return {
      status: session.status,
      mode: "nosession",
    };
  }
  // console.log(session.data.data);
  for (let i = 0; i < session.data.data.length; i++) {
    const sessionGrade = session.data.data[i].Session_Grade;
    const sessionid = session.data.data[i].LMS_Activity_ID.toString();
    const correctSession = sessionGrade.find((res) => res === grade);
    if (correctSession) {
      logsData.quizLogs.push({
        email: emailParam,
        description: `LinkGenerated 200`,
      });
      fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
        if (err) throw err;
        console.log("Done writing");
      });
      return {
        status: 200,
        formattedDateStart,
        formattedDateEnd,
        mode: "quizlink",
        email,
        link: `https://wisechamps.app/mod/lti/view.php?id=${sessionid}`,
      };
    }
  }

  logsData.quizLogs.push({
    email: emailParam,
    description: `nosession 204`,
  });
  fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
    if (err) throw err;
    console.log("Done writing");
  });

  return {
    status: session.status,
    mode: "nosession",
  };
};

const getZohoUserDetails = async (email) => {
  const accessToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${accessToken}`,
    },
  };
  const contact = await axios.get(
    `https://www.zohoapis.com/crm/v2/Contacts/search?email=${email}`,
    zohoConfig
  );

  if (contact.status >= 400) {
    return {
      status: contact.status,
      mode: "internalservererrorinfindinguser",
    };
  }
  // return { contact };
  if (contact.status === 204) {
    return {
      status: contact.status,
      mode: "nouser",
    };
  }

  return {
    status: 200,
    mode: "user",
    email,
  };
};

const createPaymentEntry = async ({ amount, id, email, credits, payId }) => {
  amount = amount / 100;
  const zohoToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${zohoToken}`,
    },
  };
  const attemptsCount = await axios.get(
    `https://www.zohoapis.com/crm/v2.1/Payments/actions/count`,
    zohoConfig
  );
  let attemptNumber = attemptsCount.data.count + 1;
  const contact = await axios.get(
    `https://www.zohoapis.com/crm/v2/Contacts/search?email=${email}`,
    zohoConfig
  );
  if (!contact || !contact.data || !contact.data.data) {
    console.log("no contacts");
    return;
  }
  const contactid = contact.data.data[0].id;
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;
  const body = {
    data: [
      {
        Name: `${attemptNumber}`,
        Payment_Demanded: amount,
        Payment_Link_ID: id,
        Conntact: contactid,
        Reference_ID: payId,
        Payment_Date: formattedDate,
        Credits: credits,
      },
    ],
    apply_feature_execution: [
      {
        name: "layout_rules",
      },
    ],
    trigger: ["workflow"],
  };
  const result = await axios.post(
    `https://www.zohoapis.com/crm/v2/Payments`,
    body,
    zohoConfig
  );
  return result;
};

app.post("/meeting", async (req, res) => {
  const { email, payId } = req.body;
  const data = await getMeetingLink(email, payId);
  res.status(200).send({
    ...data,
  });
});

app.post("/quiz", async (req, res) => {
  const { email } = req.body;
  const data = await getQuizLink(email);
  res.status(200).send({
    ...data,
  });
});

app.get("/referral", async (req, res) => {
  const phone = req.query.phone;
  const data = await getZohoUserData(phone);
  res.status(200).send({
    ...data,
  });
});

app.post("/user", async (req, res) => {
  const { email } = req.body;
  const data = await getZohoUserDetails(email);
  res.status(200).send({
    ...data,
  });
});

app.get("/", (req, res) => {
  res.status(200).send({
    message: "Server Started 👌🤳 ",
  });
});

app.post("/payment_links", async (req, res) => {
  try {
    const { email, amount } = req.body;
    const credits = {
      39: 1,
      119: 4,
      999: 52,
      1999: 200,
    };
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });
    const data = await instance.paymentLink.create({
      amount: amount * 100,
      currency: "INR",
      description: `Live Quiz Payment for ${credits[amount]} Credits`,
      customer: {
        email,
      },
      callback_url: `https://zoom.wisechamps.com?email=${email}&credits=${credits[amount]}&amount=${amount}`,
      callback_method: "get",
    });
    return res.status(200).send(data);
  } catch (error) {
    return res.status(500).send(error);
  }
});

app.post("/payment/capture", async (req, res) => {
  try {
    const { linkId, payId, email, credits, amount } = req.body;
    const createdPayment = await createPaymentEntry({
      amount: amount,
      id: linkId,
      email: email,
      credits: credits,
      payId: payId,
    });
    return res.status(200).send(createdPayment.data.data);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

app.listen(PORT, () => {
  console.log(`Server Started 🎈🎈 http://localhost:${PORT}`);
});
