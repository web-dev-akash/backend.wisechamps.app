const fs = require("fs");
const moment = require("moment");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const pLimit = require("p-limit");
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
  if (data) {
    const token = JSON.parse(data);
    accessToken = token.token;
    tokenTime = token.time;
  }
});

fs.readFile("./logs.json", function (err, data) {
  if (err) throw err;
  if (data) {
    const logs = JSON.parse(data);
    logsData = { ...logs };
  }
});

const freeMeetLink = `https://us06web.zoom.us/j/87300068676?pwd=4mj1Nck0plfYDJle9YcfX1MJYrcLbu.1`;

const getZohoToken = async () => {
  try {
    const res = await axios.post(
      `https://accounts.zoho.com/oauth/v2/token?client_id=${clientId}&grant_type=refresh_token&client_secret=${clientSecret}&refresh_token=${refreshToken}`
    );
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
        }
      );
    }
  }
  return accessToken;
};

const getMeetingLink = async (emailParam, payId) => {
  let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
  logsData.zoomLogs?.push({
    email: emailParam,
    description: "EnteredEmail",
    date: new Date().toDateString(),
    time: new Date(oldDate).toLocaleTimeString("en-US"),
  });
  logsData.zoomLogs
    ? fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
        if (err) throw err;
      })
    : null;
  // return "success";
  const accessToken = await getZohoTokenOptimized();
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
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.zoomLogs?.push({
      email: emailParam,
      description: `internalservererrorinfindinguser ${contact.status}`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.zoomLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
    return {
      status: contact.status,
      mode: "internalservererrorinfindinguser",
    };
  }
  // // return { contact };
  if (contact.status === 204) {
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.zoomLogs?.push({
      email: emailParam,
      description: `nouser 204`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.zoomLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
    return {
      status: contact.status,
      mode: "nouser",
    };
  }

  const contactid = contact.data.data[0].id;
  const email = contact.data.data[0].Email;
  const grade = contact.data.data[0].Student_Grade;
  const name = contact.data.data[0].Student_Name;
  const credits = contact.data.data[0].Credits;
  const team = contact.data.data[0].Team;
  const address = contact.data.data[0].Address;
  const pincode = contact.data.data[0].Pincode;
  const gradeUpdated = contact.data.data[0].Grade_Updated;
  const source_campaign = contact.data.data[0].Source_Campaign;
  const date = new Date();
  const start = new Date();
  start.setMinutes(start.getMinutes() + 270);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const formattedDateStart = `${year}-${month}-${day}T00:00:00+05:30`;
  const formattedDateEnd = `${year}-${month}-${day}T23:59:00+05:30`;
  const sessionBody = {
    select_query: `select Session_Grade, LMS_Activity_ID, Explanation_Meeting_Link from Sessions where Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}'`,
  };

  const session = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    sessionBody,
    zohoConfig
  );

  if (session.status >= 400) {
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.zoomLogs?.push({
      email: emailParam,
      description: `internalservererrorinfindingsession ${session.status}`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.zoomLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
    return {
      status: session.status,
      mode: "internalservererrorinfindingsession",
    };
  }

  if (session.status === 204) {
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.zoomLogs?.push({
      email: emailParam,
      description: `nosession ${session.status}`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.zoomLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
    return {
      status: session.status,
      mode: "nosession",
      name,
      credits: credits ? credits : 0,
      grade: grade,
    };
  }

  const attemptBody = {
    select_query: `select Session.id as Session_id, Session.Name as Session_Name,Session.Subject as Subject, Session.Number_of_Questions as Total_Questions, Session_Date_Time, Quiz_Score from Attempts where Contact_Name = '${contactid}'`,
  };

  const attempt = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    attemptBody,
    zohoConfig
  );

  // console.log(session.data.data);
  let finalAddress = "";
  if (address) {
    finalAddress = address;
  } else if (attempt.data && attempt.data.info) {
    finalAddress = Number(attempt.data.info.count) <= 3 ? "Temp address" : null;
  } else {
    finalAddress = "Temp address";
  }

  for (let i = 0; i < session.data.data.length; i++) {
    const sessionGrade = session.data.data[i].Session_Grade;
    const paidMeetLink = session.data.data[i].Explanation_Meeting_Link;
    let link = !credits || credits == 0 ? freeMeetLink : paidMeetLink;
    link = payId ? paidMeetLink : link;
    const correctSession = sessionGrade.find((res) => res === grade);
    if (correctSession || Number(grade) === 0) {
      let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
      logsData.zoomLogs?.push({
        email: emailParam,
        description: `LinkGenerated 200`,
        date: new Date().toDateString(),
        time: new Date(oldDate).toLocaleTimeString("en-US"),
      });
      logsData.zoomLogs
        ? fs.writeFile(
            "./logs.json",
            JSON.stringify(logsData, null, 2),
            (err) => {
              if (err) throw err;
            }
          )
        : null;
      return {
        status: 200,
        mode:
          (source_campaign === "old olympiad data" && !gradeUpdated) ||
          (source_campaign === "old abacus data" && !gradeUpdated)
            ? "oldData"
            : "zoomlink",
        email,
        link,
        name,
        credits: credits ? credits : 0,
        grade: grade,
        team: team === "Boys" || team === "Girls" ? null : team,
        address: finalAddress,
        pincode,
      };
    }
  }

  let oldDate1 = new Date().setMinutes(new Date().getMinutes() + 330);
  logsData.zoomLogs?.push({
    email: emailParam,
    description: `nosession 204`,
    date: new Date().toDateString(),
    time: new Date(oldDate1).toLocaleTimeString("en-US"),
  });
  logsData.zoomLogs
    ? fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
        if (err) throw err;
      })
    : null;
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
  let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
  logsData.quizLogs?.push({
    email: emailParam,
    description: "EnteredEmail",
    date: new Date().toDateString(),
    time: new Date(oldDate).toLocaleTimeString("en-US"),
  });
  logsData.quizLogs
    ? fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
        if (err) throw err;
      })
    : null;
  const accessToken = await getZohoTokenOptimized();
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
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.quizLogs?.push({
      email: emailParam,
      description: `internalservererrorinfindinguser ${contact.status}`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.quizLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
    return {
      status: contact.status,
      mode: "internalservererrorinfindinguser",
    };
  }
  // return { contact };
  if (contact.status === 204) {
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.quizLogs?.push({
      email: emailParam,
      description: `nouser ${contact.status}`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.quizLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
    return {
      status: contact.status,
      mode: "nouser",
    };
  }
  // return contact.data.data[0];

  const contactid = contact.data.data[0].id;
  const email = contact.data.data[0].Email;
  const grade = contact.data.data[0].Student_Grade;
  const name = contact.data.data[0].Student_Name;
  const credits = contact.data.data[0].Credits;
  const team = contact.data.data[0].Team;
  const address = contact.data.data[0].Address;
  const pincode = contact.data.data[0].Pincode;
  const date = new Date();
  const start = new Date();
  start.setMinutes(start.getMinutes() + 285);
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
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.quizLogs?.push({
      email: emailParam,
      description: `internalservererrorinfindingsession ${session.status}`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.quizLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
    return {
      status: session.status,
      mode: "internalservererrorinfindingsession",
    };
  }

  if (session.status === 204) {
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.quizLogs?.push({
      email: emailParam,
      description: `nosession ${session.status}`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.quizLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
    return {
      status: session.status,
      mode: "nosession",
      name,
      credits: credits ? credits : 0,
    };
  }

  if (!credits || credits === 0) {
    return {
      mode: "nocredits",
      email,
      credits: credits ? credits : 0,
      name,
      grade,
      team,
      address,
      pincode,
    };
  }

  for (let i = 0; i < session.data.data.length; i++) {
    const sessionGrade = session.data.data[i].Session_Grade;
    const sessionid = session.data.data[i].LMS_Activity_ID.toString();
    const correctSession = sessionGrade.find((res) => res === grade);
    if (correctSession) {
      let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
      logsData.quizLogs?.push({
        email: emailParam,
        description: `LinkGenerated 200`,
        date: new Date().toDateString(),
        time: new Date(oldDate).toLocaleTimeString("en-US"),
      });
      logsData.quizLogs
        ? fs.writeFile(
            "./logs.json",
            JSON.stringify(logsData, null, 2),
            (err) => {
              if (err) throw err;
            }
          )
        : null;
      return {
        status: 200,
        mode: "quizlink",
        email,
        credits: credits ? credits : 0,
        name,
        link: `https://wisechamps.app/mod/lti/view.php?id=${sessionid}`,
        grade,
        team,
        address,
        pincode,
      };
    }
  }

  let oldDate1 = new Date().setMinutes(new Date().getMinutes() + 330);
  logsData.quizLogs?.push({
    email: emailParam,
    description: `nosession 204`,
    date: new Date().toDateString(),
    time: new Date(oldDate1).toLocaleTimeString("en-US"),
  });
  logsData.quizLogs
    ? fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
        if (err) throw err;
      })
    : null;

  return {
    status: session.status,
    mode: "nosession",
  };
};

const getZohoUserDetailsWithEmail = async (email) => {
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
  if (contact.status === 204) {
    return {
      status: contact.status,
      mode: "nouser",
    };
  }

  const contactName = contact.data.data[0].Full_Name;
  const contactEmail = contact.data.data[0].Email;
  const contactPhone = contact.data.data[0].Phone;
  const contactId = contact.data.data[0].id;
  const credits = contact.data.data[0].Credits;
  const studentName = contact.data.data[0].Student_Name;

  return {
    status: 200,
    mode: "user",
    email,
    user: {
      name: contactName,
      email: contactEmail,
      phone: contactPhone,
      id: contactId,
      credits,
      studentName: studentName,
    },
  };
};

const getZohoUserDetailsWithPhone = async (phone, referral) => {
  let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
  if (referral) {
    logsData.referralLogs?.push({
      email: "NA",
      description: `Referee Captured ${phone}`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.referralLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
  } else {
    logsData.dailyLogs?.push({
      email: "NA",
      description: `Referee Captured ${phone}`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.dailyLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
  }
  const accessToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${accessToken}`,
    },
  };
  const contact = await axios.get(
    `https://www.zohoapis.com/crm/v2/Contacts/search?phone=${phone}`,
    zohoConfig
  );

  if (contact.status >= 400) {
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.dailyLogs?.push({
      email: "NA",
      description: `internalservererrorinfindinguser ${contact.status}`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.dailyLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
    return {
      status: contact.status,
      mode: "internalservererrorinfindinguser",
    };
  }
  // return { contact };
  if (contact.status === 204) {
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    if (referral) {
      logsData.referralLogs?.push({
        email: "NA",
        description: `No Referee Found ${phone}`,
        date: new Date().toDateString(),
        time: new Date(oldDate).toLocaleTimeString("en-US"),
      });
      logsData.referralLogs
        ? fs.writeFile(
            "./logs.json",
            JSON.stringify(logsData, null, 2),
            (err) => {
              if (err) throw err;
            }
          )
        : null;
    } else {
      logsData.dailyLogs?.push({
        email: "NA",
        description: `No Referee Found ${phone}`,
        date: new Date().toDateString(),
        time: new Date(oldDate).toLocaleTimeString("en-US"),
      });
      logsData.dailyLogs
        ? fs.writeFile(
            "./logs.json",
            JSON.stringify(logsData, null, 2),
            (err) => {
              if (err) throw err;
            }
          )
        : null;
    }
    return {
      status: contact.status,
      mode: "user",
    };
  }

  const contactName = contact.data.data[0].Full_Name;
  const contactEmail = contact.data.data[0].Email;
  const contactPhone = contact.data.data[0].Phone;
  const contactId = contact.data.data[0].id;
  const studentName = contact.data.data[0].Student_Name;

  if (referral) {
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.referralLogs?.push({
      email: "NA",
      description: `Referee Found ${phone}`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.referralLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
  } else {
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.dailyLogs?.push({
      email: "NA",
      description: `Referee Found ${phone}`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.dailyLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
  }

  return {
    status: 200,
    mode: "user",
    phone,
    user: {
      name: contactName,
      email: contactEmail,
      phone: contactPhone,
      id: contactId,
      studentName: studentName,
    },
  };
};

const createPaymentEntry = async ({ amount, id, email, credits, payId }) => {
  const zohoToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${zohoToken}`,
    },
  };

  const paymentData = await axios.get(
    `https://www.zohoapis.com/crm/v2/Payments/search?criteria=Payment_Link_ID:equals:${id}`,
    zohoConfig
  );

  const paymentAlreadyDone = paymentData.data?.data?.length >= 1 ? true : false;
  if (paymentAlreadyDone) {
    return { status: "Already Done" };
  }

  const attemptsCount = await axios.get(
    `https://www.zohoapis.com/crm/v2.1/Payments/actions/count`,
    zohoConfig
  );

  let attemptNumber = attemptsCount.data.count + 1;
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
  return result?.data?.data;
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

const addUserToZoho = async ({
  email,
  phone,
  parent_name,
  student_name,
  student_grade,
  referralId,
  source_campaign,
  relation,
}) => {
  try {
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.dailyLogs?.push({
      email: email,
      description: `Filled Form ${referralId}`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.dailyLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
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
          Email: email,
          Phone: phone,
          Last_Name: parent_name,
          Student_Name: student_name,
          Student_Grade: student_grade,
          Referee_Relation: relation ? relation : "",
          Lead_Source: "External Referral",
          Source_Campaign: source_campaign ? source_campaign : "Join Community",
          Referral_Contact_Id: referralId ? referralId : "",
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
      `https://www.zohoapis.com/crm/v2/Contacts`,
      body,
      zohoConfig
    );

    if (result.status >= 400) {
      let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
      logsData.dailyLogs?.push({
        email: email,
        description: `Interal Server Error ${result.status}`,
        date: new Date().toDateString(),
        time: new Date(oldDate).toLocaleTimeString("en-US"),
      });
      logsData.dailyLogs
        ? fs.writeFile(
            "./logs.json",
            JSON.stringify(logsData, null, 2),
            (err) => {
              if (err) throw err;
            }
          )
        : null;
      return {
        status: result.status,
        mode: "internalservererrorinfindinguser",
      };
    }
    if (result.data.data[0].code === "DUPLICATE_DATA") {
      return {
        status: result.status,
        mode: "duplicateuser",
      };
    }
    let oldDate1 = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.dailyLogs?.push({
      email: email,
      description: `Contact Added to Zoho ${referralId}`,
      date: new Date().toDateString(),
      time: new Date(oldDate1).toLocaleTimeString("en-US"),
    });
    logsData.dailyLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;

    return {
      status: 200,
      mode: "useradded",
    };
  } catch (error) {
    console.log(error);
    return error;
  }
};

app.post("/user/add", async (req, res) => {
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

app.post("/user/feedback", async (req, res) => {
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

app.post("/payment_links", async (req, res) => {
  try {
    const { email, amount } = req.body;
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.paymentLogs?.push({
      email: email,
      description: `EnteredEmail 200`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.paymentLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
    const credits = {
      119: 4,
      499: 20,
      1999: 200,
    };
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });
    const expiryDate = Math.floor(
      new Date().setMinutes(new Date().getMinutes() + 60) / 1000
    );
    const data = await instance.paymentLink.create({
      amount: amount * 100,
      currency: "INR",
      description: `Live Quiz Payment for ${credits[amount]} Quiz Balance`,
      customer: {
        email,
      },
      callback_url: `https://zoom.wisechamps.com?email=${email}`,
      callback_method: "get",
      expire_by: expiryDate,
    });
    let oldDate1 = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.paymentLogs?.push({
      email: email,
      description: `PyamentLinkCreated 200`,
      date: new Date().toDateString(),
      time: new Date(oldDate1).toLocaleTimeString("en-US"),
    });
    logsData.paymentLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
    return res.status(200).send(data);
  } catch (error) {
    return res.status(500).send(error);
  }
});

app.post("/payment/capture", async (req, res) => {
  try {
    const plans = {
      1: 1,
      119: 4,
      499: 20,
      1999: 200,
    };
    const id = req.body.payload.payment_link.entity.id;
    const amount = Number(req.body.payload.payment_link.entity.amount) / 100;
    const email = req.body.payload.payment_link.entity.customer.email;
    const payId = req.body.payload.payment.entity.id;
    const credits = plans[amount];
    const createdPayment = await createPaymentEntry({
      amount: amount,
      id: id,
      email: email,
      credits: credits,
      payId: payId,
    });
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.paymentLogs?.push({
      email: email,
      description: `PaymentCaptured 200`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.paymentLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
    return res.status(200).send({ status: "success", data: createdPayment });
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

app.get("/updateLogs", (req, res) => {
  try {
    fs.readFile("./logs.json", async (err, data) => {
      if (err) throw err;
      if (data) {
        const logsDataFinal = JSON.parse(data);
        const zoomLogs = logsDataFinal.zoomLogs;
        const quizLogs = logsDataFinal.quizLogs;
        const paymentLogs = logsDataFinal.paymentLogs;
        const dailyLogs = logsDataFinal.dailyLogs;
        const reportLogs = logsDataFinal.reportLogs;
        const referralLogs = logsDataFinal.referralLogs;
        const urlZoom =
          "https://script.google.com/macros/s/AKfycbzfelbwgNpG1v4zY8t-avVggcgH3K_7yE-r7B7eTWF45lt1q_guT4qaQTaEiYccHy-b/exec?type=zoom";
        const responseZoom =
          zoomLogs?.length > 0 ? await axios.post(urlZoom, zoomLogs) : null;
        const urlQuiz =
          "https://script.google.com/macros/s/AKfycbzfelbwgNpG1v4zY8t-avVggcgH3K_7yE-r7B7eTWF45lt1q_guT4qaQTaEiYccHy-b/exec?type=quiz";
        const responseQuiz =
          quizLogs?.length > 0 ? await axios.post(urlQuiz, quizLogs) : null;
        const urlPayment =
          "https://script.google.com/macros/s/AKfycbzfelbwgNpG1v4zY8t-avVggcgH3K_7yE-r7B7eTWF45lt1q_guT4qaQTaEiYccHy-b/exec?type=payment";
        const responsePayment =
          paymentLogs?.length > 0
            ? await axios.post(urlPayment, paymentLogs)
            : null;
        const urlDaily =
          "https://script.google.com/macros/s/AKfycbzfelbwgNpG1v4zY8t-avVggcgH3K_7yE-r7B7eTWF45lt1q_guT4qaQTaEiYccHy-b/exec?type=daily";
        const responseDaily =
          dailyLogs?.length > 0 ? await axios.post(urlDaily, dailyLogs) : null;
        const urlReport =
          "https://script.google.com/macros/s/AKfycbzfelbwgNpG1v4zY8t-avVggcgH3K_7yE-r7B7eTWF45lt1q_guT4qaQTaEiYccHy-b/exec?type=report";
        const responseReport =
          reportLogs?.length > 0
            ? await axios.post(urlReport, reportLogs)
            : null;
        const urlReferral =
          "https://script.google.com/macros/s/AKfycbzfelbwgNpG1v4zY8t-avVggcgH3K_7yE-r7B7eTWF45lt1q_guT4qaQTaEiYccHy-b/exec?type=referral";
        const responseReferral =
          referralLogs?.length > 0
            ? await axios.post(urlReferral, referralLogs)
            : null;
        logsData = {};
        const newLogsData = {
          zoomLogs: [],
          quizLogs: [],
          paymentLogs: [],
          dailyLogs: [],
          reportLogs: [],
          referralLogs: [],
        };

        fs.writeFile(
          "./logs.json",
          JSON.stringify(newLogsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        );

        return res.status(200).send({
          zoom: responseZoom?.data,
          quiz: responseQuiz?.data,
          payment: responsePayment?.data,
          daily: responseDaily?.data,
          report: responseReport?.data,
        });
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

const dailyQuizQuestions = async (email) => {
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
  const contactid = contact.data.data[0].id;
  const name = contact.data.data[0].Student_Name;
  const phone = contact.data.data[0].Phone;
  const grade = contact.data.data[0].Student_Grade;
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;
  // console.log("Start", formattedDateStart);

  const questionAttemptBody = {
    select_query: `select Contact_Name from Questions_Attempt where Attempt_Date = '${formattedDate}' and Contact_Name = '${contactid}'`,
  };

  const questionAttempt = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    questionAttemptBody,
    zohoConfig
  );

  if (questionAttempt.status === 200) {
    return {
      mode: "alreadyAttempted",
    };
  }

  const questionBody = {
    select_query: `select Correct_Answer,Question,Question_Image_URL,Question_Grade,Option_1,Option_2,Option_3,Option_4 from Questions where Question_Date = '${formattedDate}'`,
  };

  const question = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    questionBody,
    zohoConfig
  );

  if (question.status >= 400) {
    return {
      status: question.status,
      mode: "internalservererrorinfindingquestion",
    };
  }

  if (question.status === 204) {
    return {
      status: question.status,
      mode: "noquestion",
    };
  }

  const totalQuestionAttemptsBody = {
    select_query: `select Correct_Answer, Attempt_Date from Questions_Attempt where Contact_Name = '${contactid}'`,
  };

  const totalQuestionAttempt = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    totalQuestionAttemptsBody,
    zohoConfig
  );

  let currstreak = 1;
  let finalstreak = 1;
  let minPercentage = 15;
  let maxPercentage = 92;
  let finalPercentage = minPercentage;
  let totalcorrect = 0;
  let finalData = [];

  if (totalQuestionAttempt.data.data) {
    const sortedAttemptData = totalQuestionAttempt.data?.data?.sort(
      (a, b) =>
        new Date(b.Attempt_Date).getTime() - new Date(a.Attempt_Date).getTime()
    );

    finalData =
      sortedAttemptData.length > 5
        ? sortedAttemptData.slice(0, 5)
        : sortedAttemptData;

    for (let i = 1; i < sortedAttemptData.length; i++) {
      let currDate = new Date(sortedAttemptData[i].Attempt_Date);
      let prevDate = new Date(sortedAttemptData[i - 1].Attempt_Date);
      const timeDiff = Math.abs(prevDate - currDate);
      const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
      if (diffDays === 1) {
        currstreak++;
      } else {
        finalstreak = Math.max(currstreak, finalstreak);
        currstreak = 1;
      }
    }

    finalstreak = Math.max(currstreak, finalstreak);

    const totalAttempts = totalQuestionAttempt.data.data;
    for (let i = 0; i < totalAttempts.length; i++) {
      if (totalAttempts[i].Correct_Answer) {
        totalcorrect++;
      }
    }
    const currPercentage = Math.round(
      (totalcorrect / totalAttempts.length) * 100
    );

    finalPercentage = Math.max(minPercentage, currPercentage);
    finalPercentage = Math.min(maxPercentage, finalPercentage);
  }

  for (let i = 0; i < question.data.data.length; i++) {
    const questionGrade = question.data.data[i].Question_Grade;
    const correctQuestion = questionGrade.find((res) => res === grade);
    if (correctQuestion) {
      return {
        status: 200,
        mode: "question",
        id: contactid,
        name,
        phone,
        grade,
        attempts: finalData,
        streak: finalstreak,
        percentage: finalPercentage,
        question: question.data.data[i],
      };
    }
  }
  return {
    status: 204,
    mode: "noquestion",
  };
};

app.post("/dailyQuiz", async (req, res) => {
  try {
    const { email } = req.body;
    const data = await dailyQuizQuestions(email);
    return res.status(200).send(data);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

const dailyQuizQuestionsWithGrade = async (grade) => {
  let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
  logsData.dailyLogs?.push({
    email: "NA",
    description: `Grade ${grade}`,
    date: new Date().toDateString(),
    time: new Date(oldDate).toLocaleTimeString("en-US"),
  });
  logsData.dailyLogs
    ? fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
        if (err) throw err;
      })
    : null;

  const accessToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${accessToken}`,
    },
  };
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;
  // console.log("Start", formattedDateStart);
  const questionBody = {
    select_query: `select Correct_Answer,Question,Question_Image_URL,Question_Grade,Option_1,Option_2,Option_3,Option_4 from Questions where Question_Date = '${formattedDate}'`,
  };

  const question = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    questionBody,
    zohoConfig
  );

  if (question.status >= 400) {
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.dailyLogs?.push({
      email: "NA",
      description: `internalservererrorinfindingquestion`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.dailyLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;

    return {
      status: question.status,
      mode: "internalservererrorinfindingquestion",
    };
  }

  if (question.status === 204) {
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.dailyLogs?.push({
      email: "NA",
      description: `No Question Found 204`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.dailyLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
    return {
      status: question.status,
      mode: "noquestion",
    };
  }
  for (let i = 0; i < question.data.data.length; i++) {
    const questionGrade = question.data.data[i].Question_Grade;
    const correctQuestion = questionGrade.find((res) => res === grade);
    if (correctQuestion) {
      let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
      logsData.dailyLogs?.push({
        email: "NA",
        description: `Question Found 200`,
        date: new Date().toDateString(),
        time: new Date(oldDate).toLocaleTimeString("en-US"),
      });
      logsData.dailyLogs
        ? fs.writeFile(
            "./logs.json",
            JSON.stringify(logsData, null, 2),
            (err) => {
              if (err) throw err;
            }
          )
        : null;
      return {
        status: 200,
        mode: "question",
        question: question.data.data[i],
      };
    }
  }
};

app.post("/quizgrade", async (req, res) => {
  try {
    const { grade } = req.body;
    const data = await dailyQuizQuestionsWithGrade(grade);
    return res.status(200).send(data);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

const createQuestionAttemptEntry = async ({
  contactId,
  questionId,
  optionSelected,
  correctAnswer,
}) => {
  const accessToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${accessToken}`,
    },
  };
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;
  const body = {
    data: [
      {
        Attempt_Date: formattedDate,
        Contact_Name: contactId,
        Correct_Answer: correctAnswer,
        Option_Selected: optionSelected,
        Question: questionId,
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
    `https://www.zohoapis.com/crm/v2/Questions_Attempt`,
    body,
    zohoConfig
  );
  return result.data.data;
};

app.post("/question/attempt", async (req, res) => {
  try {
    const { contactId, questionId, optionSelected, correctAnswer } = req.body;
    const data = await createQuestionAttemptEntry({
      contactId,
      questionId,
      optionSelected,
      correctAnswer,
    });
    return res.status(200).send(data);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

const getWeeklyUserAttempts = async (email) => {
  let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
  logsData.reportLogs?.push({
    email: email,
    description: `EnteredEmail 200`,
    date: new Date().toDateString(),
    time: new Date(oldDate).toLocaleTimeString("en-US"),
  });
  logsData.reportLogs
    ? fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
        if (err) throw err;
      })
    : null;
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
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.reportLogs?.push({
      email: email,
      description: `NoUser 204`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.reportLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
    return {
      status: contact.status,
      mode: "nouser",
    };
  }

  const contactid = contact.data.data[0].id;
  const grade = contact.data.data[0].Student_Grade;
  let gradeGroup;
  if (grade == 1 || grade == 2) {
    gradeGroup = "1;2";
  } else if (grade == 7 || grade == 8) {
    gradeGroup = "7;8";
  } else gradeGroup = grade;
  const name = contact.data.data[0].Student_Name;
  const credits = contact.data.data[0].Credits
    ? contact.data.data[0].Credits
    : 0;
  const today = moment();
  const currDay = today.day();
  let previousMonday, previousSunday;
  if (currDay !== 0) {
    const diff = today.date() - currDay + (currDay === 0 ? -6 : 1);
    const monday = moment(new Date(today.date(diff)));
    previousMonday = monday.clone().subtract(monday.day() + 6, "days");
    previousSunday = previousMonday.clone().add(6, "days");
  } else {
    previousMonday = today.clone().subtract(today.day() + 6, "days");
    previousSunday = today.clone();
  }

  const formattedDateStart = `${previousMonday.format(
    "YYYY-MM-DD"
  )}T00:00:00+05:30`;
  const formattedDateEnd = `${previousSunday.format(
    "YYYY-MM-DD"
  )}T23:59:59+05:30`;

  const sessionBody = {
    select_query: `select Name as Session_Name, Subject, Number_of_Questions as Total_Questions, Session_Date_Time from Sessions where Session_Grade = '${gradeGroup}' and Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}'`,
  };

  const session = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    sessionBody,
    zohoConfig
  );

  const sessionData = session.data.data;

  const attemptBody = {
    select_query: `select Session.id as Session_id, Session.Name as Session_Name,Session.Subject as Subject, Session.Number_of_Questions	as Total_Questions, Session_Date_Time, Quiz_Score from Attempts where Contact_Name = '${contactid}' and Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}'`,
  };

  const attempt = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    attemptBody,
    zohoConfig
  );

  if (attempt.status >= 400) {
    return {
      status: attempt.status,
      mode: "internalservererrorinfindingattempt",
    };
  }

  if (session.status === 204) {
    let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    logsData.reportLogs?.push({
      email: email,
      description: `NoSessions 204`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.reportLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        )
      : null;
    return {
      status: session.status,
      mode: "nosession",
      name,
      credits: credits,
    };
  }

  let minPercentage = 15;
  let maxPercentage = 92;
  let finalPercentage = minPercentage;
  let totalAnswer = 0;
  let totalQuestion = 0;

  const finalAttempts = [];
  const totalAttempts = attempt?.data.data;
  let wordsToRemove = [
    "Final",
    "&",
    "Math",
    "Science",
    "English",
    "GK",
    "Grade",
    "Live",
    "Quiz",
    "for",
    "Nov",
    "Dec",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
  ];

  if (totalAttempts) {
    for (let i = 0; i < totalAttempts.length; i++) {
      finalAttempts.push({ ...totalAttempts[i] });
    }
  }

  const sortedSessionData = sessionData.sort(
    (a, b) => new Date(a.Session_Date_Time) - new Date(b.Session_Date_Time)
  );

  const sortedFinalData = [];

  for (let i = 0; i < sortedSessionData.length; i++) {
    const attemptFound = finalAttempts?.filter(
      (attempt) => attempt.Session_id == sortedSessionData[i].id
    );
    const sessionName = sortedSessionData[i].Session_Name;
    let newString = sessionName;
    let regexString = wordsToRemove.join("|");
    let regex = new RegExp("\\b(" + regexString + ")\\b|\\d+|&", "gi");
    newString = newString.replace(regex, "");
    if (attemptFound?.length > 0) {
      sortedFinalData.push({
        ...sortedSessionData[i],
        Quiz_Score: attemptFound[0].Quiz_Score,
        Session_Name: newString.trim(),
        attempted: true,
      });
    } else {
      sortedFinalData.push({
        ...sortedSessionData[i],
        Session_Name: newString.trim(),
        attempted: false,
      });
    }
  }

  for (let i = 0; i < sortedFinalData.length; i++) {
    totalAnswer += sortedFinalData[i].Quiz_Score
      ? Number(sortedFinalData[i].Quiz_Score)
      : 0;
    totalQuestion += Number(sortedFinalData[i].Total_Questions);
  }

  const currPercentage = Math.round((totalAnswer / totalQuestion) * 100);

  finalPercentage = Math.max(minPercentage, currPercentage);
  finalPercentage = Math.min(maxPercentage, finalPercentage);

  return {
    mode: "user",
    name,
    grade,
    credits,
    percentage: finalPercentage,
    sessions: sortedFinalData,
  };
};

app.post("/quiz/report", async (req, res) => {
  try {
    const { email } = req.body;
    const data = await getWeeklyUserAttempts(email);
    return res.status(200).send(data);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

app.get("/", (req, res) => {
  res.status(200).send({
    message: "Server Started 🐱‍👤",
  });
});

app.post("/quiz/test", async (req, res) => {
  const { word } = req.body;
  const accessToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${accessToken}`,
    },
  };

  const contact = await axios.get(
    `https://www.zohoapis.com/crm/v6/Contacts/search?word=${word}`,
    zohoConfig
  );

  if (contact.status >= 400) {
    return {
      status: contact.status,
      mode: "internalservererrorinfindinguser",
    };
  }

  if (contact.status === 204) {
    return {
      status: contact.status,
      mode: "nouser",
    };
  }

  return res.status(200).send({ contact: contact.data.data });
  // return res.send({
  //   credits: 123,
  //   grade: "2",
  //   mode: "user",
  //   name: "Akash",
  //   percentage: 88,
  //   sessions: [
  //     {
  //       Session_Date_Time: "2023-11-23T19:00:00+05:30 ",
  //       Session_Name: "Logical Reasoning 1",
  //       Subject: "Science",
  //       Total_Questions: 10,
  //       attempted: true,
  //       id: "4878003000011641066",
  //       Quiz_Score: 9,
  //     },
  //     {
  //       Session_Date_Time: "2023-11-24T19:00:00+05:30",
  //       Session_Name: "Logical Reasoning 2",
  //       Subject: "Math",
  //       Total_Questions: 10,
  //       attempted: true,
  //       id: "4878003000011641066",
  //       Quiz_Score: 10,
  //     },
  //     {
  //       Session_Date_Time: "2023-11-25T19:00:00+05:30",
  //       Session_Name: "Logical Reasoning 3",
  //       Subject: "Math",
  //       Total_Questions: 10,
  //       attempted: true,
  //       id: "4878003000011641066",
  //       Quiz_Score: 7,
  //     },
  //     {
  //       Session_Date_Time: "2023-11-26T19:00:00+05:30",
  //       Session_Name: "Logical Reasoning 4",
  //       Subject: "Math",
  //       Total_Questions: 10,
  //       attempted: true,
  //       id: "4878003000011641066",
  //       Quiz_Score: 9,
  //     },
  //   ],
  // });
});

app.post("/quiz/team", async (req, res) => {
  try {
    const { email, team, grade } = req.body;
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
    const alreadyInTeam = contact.data.data[0].Team;
    const phone = contact.data.data[0].Phone;
    const student_name = contact.data.data[0].Student_Name;
    const address = contact.data.data[0].Address;

    if ((alreadyInTeam === "North" || alreadyInTeam === "South") && !grade) {
      return res.status(200).send({
        team: alreadyInTeam,
        mode: "alreadyInTeam",
      });
    }
    let body;
    if (grade) {
      body = {
        data: [
          {
            Email: email,
            Student_Grade: grade,
            Grade_Updated: true,
            $append_values: {
              Student_Grade: true,
              Grade_Updated: true,
            },
          },
        ],
        duplicate_check_fields: ["Email"],
        apply_feature_execution: [
          {
            name: "layout_rules",
          },
        ],
        trigger: ["workflow"],
      };
    } else {
      body = {
        data: [
          {
            Email: email,
            Team: team,
            $append_values: {
              Team: true,
            },
          },
        ],
        duplicate_check_fields: ["Email"],
        apply_feature_execution: [
          {
            name: "layout_rules",
          },
        ],
        trigger: ["workflow"],
      };
    }
    const data = await axios.post(
      `https://www.zohoapis.com/crm/v3/Contacts/upsert`,
      body,
      zohoConfig
    );
    const updatedZoomData = await getMeetingLink(email);
    const newLink = updatedZoomData.link;
    return res.status(200).send({
      status: data.data.data[0].code,
      mode: grade ? "gradeUpdated" : "teamAdded",
      team: alreadyInTeam,
      phone: phone,
      student_name: student_name,
      newLink: newLink,
      address,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

const getTeacherDetailsWithEmail = async (email) => {
  const accessToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${accessToken}`,
    },
  };
  const contact = await axios.get(
    `https://www.zohoapis.com/crm/v2/Teachers/search?email=${email}`,
    zohoConfig
  );

  if (contact.status >= 400) {
    return {
      status: contact.status,
      mode: "internalservererrorinfindinguser",
    };
  }

  if (contact.status === 204) {
    return {
      status: contact.status,
      mode: "nouser",
    };
  }

  const name = contact.data.data[0].Name;
  const grade = contact.data.data[0].Teacher_Grade;
  const phone = contact.data.data[0].Phone;
  const id = contact.data.data[0].id;

  return {
    status: 200,
    mode: "user",
    email,
    user: {
      name: name,
      grade: grade,
      phone: phone,
      id: id,
    },
  };
};

app.post("/teachers", async (req, res) => {
  const { email } = req.body;
  const data = await getTeacherDetailsWithEmail(email);
  return res.status(200).send({
    ...data,
  });
});

const updateAddress = async (email, address, pincode) => {
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
        Email: email,
        Address: address,
        Pincode: pincode,
        $append_values: {
          Address: true,
          Pincode: true,
        },
      },
    ],
    duplicate_check_fields: ["Email"],
    apply_feature_execution: [
      {
        name: "layout_rules",
      },
    ],
    trigger: ["workflow"],
  };
  const data = await axios.post(
    `https://www.zohoapis.com/crm/v3/Contacts/upsert`,
    body,
    zohoConfig
  );
  return data.data;
};

app.post("/quiz/address", async (req, res) => {
  try {
    const { email, address, pincode } = req.body;
    const data = await updateAddress(email, address, pincode);
    res.status(200).send(data);
  } catch (error) {
    console.log("error---", error);
    return res.status(500).send(error);
  }
});

const getDailyReports = async (grade, team) => {
  const zohoToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${zohoToken}`,
    },
  };

  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const formattedDateStart = `${year}-${month}-${day}T00:00:00+05:30`;
  const formattedDateEnd = `${year}-${month}-${day}T23:59:59+05:30`;

  const reportBody = {
    select_query: `select Session.Session_Grade as Grade, Contact_Name.Email as Email, Contact_Name.Student_Name as Student_Name, Contact_Name.Team as Team,Contact_Name.id as Student_ID, Session_Date_Time, Quiz_Score from Attempts where (Session.Session_Grade = '${grade}' and Contact_Name.Team = ${team}) and Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}'`,
  };

  const report = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    reportBody,
    zohoConfig
  );
  if (report.status >= 400) {
    return {
      status: attempt.status,
      mode: "internalservererrorinfindingattempt",
    };
  }
  if (report.status == 204) {
    return {
      status: report.status,
      mode: "noreport",
    };
  }

  const winnerBody = {
    select_query: `select Contact_Name.Student_Name as Student_Name, Contact_Name.Team as Team,Contact_Name.id as Student_ID, Session_Date_Time, Quiz_Score, Quiz_Winner from Attempts where (Session.Session_Grade = '${grade}' and Contact_Name.Team = ${team}) and Quiz_Winner is not null`,
  };

  const winner = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    winnerBody,
    zohoConfig
  );

  const previousWinners = winner?.data?.data;
  const reports = report.data.data;
  let totalScore = 0;

  for (let i = 0; i < reports.length; i++) {
    totalScore += Number(reports[i].Quiz_Score);
  }

  const finalReports = [];
  for (let i = reports.length - 1; i >= 0; i--) {
    finalReports.push(reports[i]);
  }

  return {
    mode: "successReport",
    totalScore: totalScore,
    reports: finalReports,
    previousWinners: previousWinners,
  };
};

app.post("/teachers/report", async (req, res) => {
  try {
    const { grade, team } = req.body;
    const data = await getDailyReports(grade, team);
    res.status(200).send(data);
  } catch (error) {
    console.log("error---", error);
    return res.status(500).send(error);
  }
});

const updateTeachersAttendance = async (requestBody) => {
  const { sessionDate, zoom, grade, explanation, contactId, winner } =
    requestBody;
  const zohoToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${zohoToken}`,
    },
  };

  const date = moment(sessionDate);
  if (date.day() === 0) {
    date.add(11, "hours");
  } else {
    date.add(19, "hours");
  }
  const sessionDateTime = date.format("YYYY-MM-DDTHH:mm:ss+05:30");

  const sessionBody = {
    select_query: `select id as Session_ID, Session_Date_Time from Sessions where Session_Grade = '${grade}' and Session_Date_Time = '${sessionDateTime}'`,
  };

  const session = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    sessionBody,
    zohoConfig
  );

  if (session.status >= 400) {
    return {
      status: attempt.status,
      mode: "internalservererrorinfindingattempt",
    };
  }

  if (session.status == 204) {
    return {
      status: session.status,
      mode: "nosession",
    };
  }

  if (winner) {
    const attemptBody = {
      select_query: `select id as Attempt_id, Session_Date_Time from Attempts where Contact_Name = '${winner}' and Session_Date_Time = '${sessionDateTime}'`,
    };

    const attempt = await axios.post(
      `https://www.zohoapis.com/crm/v3/coql`,
      attemptBody,
      zohoConfig
    );

    if (attempt.status >= 400) {
      return {
        status: attempt.status,
        mode: "internalservererrorinfindingattempt",
      };
    }

    if (attempt.status == 204) {
      return {
        status: attempt.status,
        mode: "noattempt",
      };
    }

    const attemptId = attempt.data.data[0].Attempt_id;
    const updateAttemptBody = {
      data: [
        {
          id: attemptId,
          Quiz_Winner: sessionDate,
          $append_values: {
            Quiz_Winner: true,
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

    const updateAttempt = await axios.post(
      `https://www.zohoapis.com/crm/v3/Attempts/upsert`,
      updateAttemptBody,
      zohoConfig
    );

    if (updateAttempt.data.data[0].status !== "success") {
      return {
        mode: "errorInUpdating",
        attempt: updateAttempt.data.data[0],
      };
    }
  }

  const sessionId = session.data.data[0].Session_ID;
  const body = {
    data: [
      {
        Session: sessionId,
        Teacher: contactId,
        Session_Date_Time: sessionDateTime,
        Zoom_Meeting_Strength: zoom,
        Explanation_Meeting_Strength: explanation,
      },
    ],
    apply_feature_execution: [
      {
        name: "layout_rules",
      },
    ],
    trigger: ["workflow"],
  };
  const attendance = await axios.post(
    `https://www.zohoapis.com/crm/v2/Teachers_Attendance`,
    body,
    zohoConfig
  );
  return {
    mode: attendance.data.data[0].status,
    attendance: attendance.data,
  };
};

app.post("/teachers/attendance", async (req, res) => {
  try {
    const body = req.body;
    const data = await updateTeachersAttendance(body);
    res.status(200).send(data);
  } catch (error) {
    console.log("error---", error);
    return res.status(500).send(error);
  }
});

app.post("/tution/create/student", async (req, res) => {
  try {
    const { teacherEmail, students } = req.body;
    const zohoToken = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${zohoToken}`,
      },
    };

    const teacher = await axios.get(
      `https://www.zohoapis.com/crm/v2/Contacts/search?email=${teacherEmail}`,
      zohoConfig
    );

    if (teacher.status >= 400) {
      return {
        status: teacher.status,
        mode: "internalservererrorinfindinguser",
      };
    }

    if (teacher.status === 204) {
      return {
        status: teacher.status,
        mode: "nouser",
      };
    }

    const teacherId = teacher.data.data[0].id;
    const teacherFullName = teacher.data.data[0].Full_Name;
    const teacherName =
      teacher.data.data[0].Full_Name.split(" ")[0].toLowerCase();

    const result = [];
    for (let i = 0; i < students.length; i++) {
      const studentFullName = students[i].name;
      const studentName = students[i].name.split(" ")[0].toLowerCase();
      const studentGrade = students[i].grade;
      const randomNumber = (1000 + Math.random() * 9000).toFixed(0);
      const studentEmail = `${teacherName}${studentName}${randomNumber}@wisechamps.com`;
      const studentPhone = `${teacherName}${studentName}`;

      const body = {
        data: [
          {
            Email: studentEmail,
            Phone: studentPhone,
            Last_Name: "Parent",
            Student_Name: studentFullName,
            Student_Grade: studentGrade,
            Source_Campaign: "Tution Community",
            Contact_Teacher: teacherId,
          },
        ],
        apply_feature_execution: [
          {
            name: "layout_rules",
          },
        ],
        trigger: ["workflow"],
      };
      const student = await axios.post(
        `https://www.zohoapis.com/crm/v2/Contacts`,
        body,
        zohoConfig
      );

      if (student.status >= 400) {
        result.push({
          status: student.status,
          mode: "internalservererrorinfindinguser",
          email: studentEmail,
        });
        continue;
      }
      if (student.data.data[0].code === "DUPLICATE_DATA") {
        result.push({
          status: student.status,
          mode: "duplicateuser",
          email: studentEmail,
        });
        continue;
      }
      result.push({
        status: student.status,
        mode: "userAdded",
        email: studentEmail,
      });
    }
    res.status(200).send({
      status: 200,
      mode: "useradded",
      result: result,
      teacher: teacherFullName,
      teacherEmail: teacherEmail,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

const formatDateWithTimezone = (date, time) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}${time}`;
};

const getAnalysisData = async (query, zohoConfig) => {
  try {
    const response = await axios.post(
      `https://www.zohoapis.com/crm/v3/coql`,
      { select_query: query },
      zohoConfig
    );
    if (response.status >= 400) {
      throw new Error("Internal Server Error");
    }
    return response;
  } catch (error) {
    throw error;
  }
};

const getNumberOfDays = (start) => {
  const date1 = new Date(start);
  const date2 = new Date();
  const oneDay = 1000 * 60 * 60 * 24;
  const differenceMs = Math.abs(date2 - date1);
  const daysBetween = Math.round(differenceMs / oneDay);
  return daysBetween;
};

const getWeeklyDates = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const weeklyDates = [];
  let current = new Date(startDate);
  current.setDate(current.getDate() + ((4 + 7 - current.getDay()) % 7));
  while (current < endDate) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 3);
    weeklyDates.push({ start: weekStart, end: weekEnd });
    current.setDate(current.getDate() + 7);
  }
  return weeklyDates;
};

const limit = pLimit(20);

const getWeeklyQuizAnalysis = async (startDate, endDate) => {
  try {
    const timezoneOffset = "T00:00:00+05:30";
    const oneDayMS = 24 * 60 * 60 * 1000;
    const threeWeeksMS = 21 * oneDayMS;
    const sixWeeksMS = 42 * oneDayMS;
    const zohoToken = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${zohoToken}`,
      },
    };
    const totalWeeks = getWeeklyDates(startDate, endDate);
    const totalData = [];
    const totalTags = [];
    for (let i = 0; i < totalWeeks.length; i++) {
      const formattedDateStart = formatDateWithTimezone(
        new Date(totalWeeks[i].start),
        "T00:00:00+05:30"
      );
      const formattedDateEnd = formatDateWithTimezone(
        new Date(totalWeeks[i].end),
        "T23:59:59+05:30"
      );

      console.log(formattedDateStart, formattedDateEnd);

      let currentPage = 0;
      const attempts = [];
      const attemptsBefore = [];
      while (true) {
        const attemptsQuery = `select Contact_Name.id as contactId, Contact_Name.Email as Email, Contact_Name.Credits as Credits, Contact_Name.Phone as Phone from Attempts where Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}' group by Contact_Name.Email,Contact_Name.Credits,Contact_Name.Phone,Contact_Name.id limit ${
          currentPage * 200
        }, 200`;
        const attemptsResponse = await getAnalysisData(
          attemptsQuery,
          zohoConfig
        );
        if (attemptsResponse.status === 204) {
          return { status: "noattempts" };
        }
        attempts.push(...attemptsResponse.data.data);
        if (!attemptsResponse.data.info.more_records) {
          break;
        }
        currentPage++;
      }

      currentPage = 0;
      while (true) {
        const attemptBeforeQuery = `select Contact_Name.Email as Email from Attempts where Session_Date_Time < '${formattedDateStart}' group by Contact_Name.Email limit ${
          currentPage * 200
        }, 200`;
        const attemptsBeforeResponse = await getAnalysisData(
          attemptBeforeQuery,
          zohoConfig
        );
        if (attemptsBeforeResponse.status === 204) {
          return { status: "noattempts" };
        }
        attemptsBefore.push(...attemptsBeforeResponse.data.data);
        if (!attemptsBeforeResponse.data.info.more_records) {
          break;
        }
        currentPage++;
      }

      const finalUsers = attempts.filter(
        (attempt) =>
          !attemptsBefore.find((before) => before.Email === attempt.Email)
      );

      const currentDate = new Date();
      const lastThreeWeeksDate = new Date(currentDate.getTime() - threeWeeksMS);
      const lastSixWeeksDate = new Date(currentDate.getTime() - sixWeeksMS);
      const currDateStart = formatDateWithTimezone(
        lastThreeWeeksDate,
        timezoneOffset
      );
      const prevThreeWeekDateEnd = formatDateWithTimezone(
        currentDate,
        "T23:59:59+05:30"
      );
      const prevSixWeekDateEnd = formatDateWithTimezone(
        lastSixWeeksDate,
        "T23:59:59+05:30"
      );

      const userStatuses = {
        activeUsers: [],
        inactiveUsers: [],
        regularUsers: [],
        atRiskUsers: [],
        dropoutUsers: [],
        revivalUsers: [],
        totalCreditExostedUsers: [],
      };

      const addtags = {
        activeUsers: [],
        inactiveUsers: [],
        regularUsers: [],
        atRiskUsers: [],
        dropoutUsers: [],
        revivalUsers: [],
      };
      const removeTagsBody = {
        tags: [
          {
            name: "Dropouts",
          },
          {
            name: "AtRisk",
          },
          {
            name: "Revival",
          },
          {
            name: "Regular",
          },
          {
            name: "Active",
          },
          {
            name: "Inactive",
          },
        ],
        ids: [],
      };

      for (let i = 0; i < finalUsers.length; i++) {
        removeTagsBody.ids.push(finalUsers[i].contactId);
      }
      const removeTags = await axios.post(
        `https://www.zohoapis.com/crm/v3/Contacts/actions/remove_tags`,
        removeTagsBody,
        zohoConfig
      );

      const numberOfDays = getNumberOfDays(totalWeeks[i].end);
      const userStatusPromises = finalUsers.map(async (user) => {
        const lastThreeWeeksQuery = `select Contact_Name.Email as Email, Contact_Name.Credits as Credits from Attempts where (Session_Date_Time between '${currDateStart}' and '${prevThreeWeekDateEnd}') and Contact_Name.Email = '${user.Email}'`;
        const lastSixWeeksQuery = `select Contact_Name.Email as Email, Contact_Name.Credits as Credits from Attempts where (Session_Date_Time between '${prevSixWeekDateEnd}' and '${prevThreeWeekDateEnd}') and Contact_Name.Email = '${user.Email}'`;
        const lastThreeWeeksWithExostedCreditsQuery = `select Contact_Name.Email as Email, Contact_Name.Credits as Credits, Session_Date_Time from Attempts where (Session_Date_Time between '${currDateStart}' and '${prevThreeWeekDateEnd}') and (Contact_Name.Email = '${user.Email}' and Remaining_Credits = 0)`;

        if (numberOfDays < 42) {
          const [lastThreeAttempt, lastThreeWithExotedCredits] =
            await Promise.all([
              limit(() => getAnalysisData(lastThreeWeeksQuery, zohoConfig)),
              limit(() =>
                getAnalysisData(
                  lastThreeWeeksWithExostedCreditsQuery,
                  zohoConfig
                )
              ),
            ]);
          let flag = false;
          if (lastThreeWithExotedCredits.status === 200) {
            const session_date_time =
              lastThreeWithExotedCredits.data.data[0].Session_Date_Time;
            const attemptAfterExostedCreditsQuery = `select Contact_Name.Email as Email, Contact_Name.Credits as Credits from Attempts where Session_Date_Time > '${session_date_time}' and Contact_Name.Email = '${user.Email}'`;
            const [attemptAfterExostedCredits] = await Promise.all([
              limit(() =>
                getAnalysisData(attemptAfterExostedCreditsQuery, zohoConfig)
              ),
            ]);
            if (attemptAfterExostedCredits.status === 200) {
              userStatuses.revivalUsers.push(user);
              addtags.revivalUsers.push(user);
              flag = true;
            }
          }

          if (lastThreeAttempt.status === 204 && user.Credits === 0) {
            userStatuses.dropoutUsers.push(user);
          }

          if (lastThreeAttempt.status === 204) {
            userStatuses.inactiveUsers.push(user);
          } else {
            userStatuses.activeUsers.push(user);
          }

          if (lastThreeAttempt.status === 204 && user.Credits === 0) {
            addtags.dropoutUsers.push(user);
          } else if (lastThreeAttempt.status === 204 && !flag) {
            addtags.inactiveUsers.push(user);
          } else if (lastThreeAttempt.status === 200 && !flag) {
            addtags.activeUsers.push(user);
          }
        } else {
          const [lastThreeAttempt, lastSixAttempt, lastThreeWithExotedCredits] =
            await Promise.all([
              limit(() => getAnalysisData(lastThreeWeeksQuery, zohoConfig)),
              limit(() => getAnalysisData(lastSixWeeksQuery, zohoConfig)),
              limit(() =>
                getAnalysisData(
                  lastThreeWeeksWithExostedCreditsQuery,
                  zohoConfig
                )
              ),
            ]);

          if (lastThreeAttempt.status === 204) {
            userStatuses.inactiveUsers.push(user);
          } else {
            userStatuses.activeUsers.push(user);
          }
          let flag = false;
          if (lastThreeWithExotedCredits.status === 200) {
            const session_date_time =
              lastThreeWithExotedCredits.data.data[0].Session_Date_Time;
            const attemptAfterExostedCreditsQuery = `select Contact_Name.Email as Email, Contact_Name.Credits as Credits from Attempts where Session_Date_Time > '${session_date_time}' and Contact_Name.Email = '${user.Email}'`;
            const [attemptAfterExostedCredits] = await Promise.all([
              limit(() =>
                getAnalysisData(attemptAfterExostedCreditsQuery, zohoConfig)
              ),
            ]);
            if (attemptAfterExostedCredits.status === 200) {
              userStatuses.revivalUsers.push(user);
              addtags.revivalUsers.push(user);
              flag = true;
            }
          }

          if (
            lastSixAttempt.status === 200 &&
            Number(lastSixAttempt.data.info.count) >= 6
          ) {
            if (lastThreeAttempt.status === 204 && user.Credits != 0) {
              userStatuses.atRiskUsers.push(user);
              addtags.atRiskUsers.push(user);
            } else if (lastThreeAttempt.status === 204 && user.Credits == 0) {
              userStatuses.dropoutUsers.push(user);
              addtags.dropoutUsers.push(user);
            } else {
              userStatuses.regularUsers.push(user);
              addtags.regularUsers.push(user);
            }
          } else if (lastThreeAttempt.status === 204 && user.Credits == 0) {
            userStatuses.dropoutUsers.push(user);
            addtags.dropoutUsers.push(user);
          } else if (lastThreeAttempt.status === 204 && !flag) {
            addtags.inactiveUsers.push(user);
          } else if (lastThreeAttempt.status === 200 && !flag) {
            addtags.activeUsers.push(user);
          }
        }
      });
      await Promise.all(userStatusPromises);
      totalData.push({
        startDate: new Date(formattedDateStart).toDateString(),
        startEnd: new Date(formattedDateEnd).toDateString(),
        firstTimer: finalUsers.length,
        activeUsers: userStatuses.activeUsers.length,
        inactiveUsers: userStatuses.inactiveUsers.length,
        regularUsers: userStatuses.regularUsers.length,
        atRiskUsers: userStatuses.atRiskUsers.length,
        dropoutUsers: userStatuses.dropoutUsers.length,
        revivalUsers: userStatuses.revivalUsers.length,
        totalCreditExostedUsers:
          userStatuses.dropoutUsers.length + userStatuses.revivalUsers.length,
      });

      totalTags.push({
        startDate: new Date(formattedDateStart).toDateString(),
        startEnd: new Date(formattedDateEnd).toDateString(),
        activeUsers: addtags.activeUsers,
        inactiveUsers: addtags.inactiveUsers,
        regularUsers: addtags.regularUsers,
        atRiskUsers: addtags.atRiskUsers,
        dropoutUsers: addtags.dropoutUsers,
        revivalUsers: addtags.revivalUsers,
      });

      if (addtags.dropoutUsers.length > 0) {
        const body = {
          tags: [
            {
              name: "Dropouts",
              id: "4878003000016184001",
              color_code: "#F17574",
            },
          ],
          ids: [],
        };
        for (let i = 0; i < addtags.dropoutUsers.length; i++) {
          body.ids.push(addtags.dropoutUsers[i].contactId);
        }
        const updateTag = await axios.post(
          `https://www.zohoapis.com/crm/v3/Contacts/actions/add_tags`,
          body,
          zohoConfig
        );
      }
      if (addtags.atRiskUsers.length > 0) {
        const body = {
          tags: [
            {
              name: "AtRisk",
              id: "4878003000016184002",
              color_code: "#E7A826",
            },
          ],
          ids: [],
        };
        for (let i = 0; i < addtags.atRiskUsers.length; i++) {
          body.ids.push(addtags.atRiskUsers[i].contactId);
        }
        const updateTag = await axios.post(
          `https://www.zohoapis.com/crm/v3/Contacts/actions/add_tags`,
          body,
          zohoConfig
        );
      }
      if (addtags.revivalUsers.length > 0) {
        const body = {
          tags: [
            {
              name: "Revival",
              id: "4878003000016184003",
              color_code: "#63C57E",
            },
          ],
          ids: [],
        };
        for (let i = 0; i < addtags.revivalUsers.length; i++) {
          body.ids.push(addtags.revivalUsers[i].contactId);
        }
        const updateTag = await axios.post(
          `https://www.zohoapis.com/crm/v3/Contacts/actions/add_tags`,
          body,
          zohoConfig
        );
      }

      if (addtags.regularUsers.length > 0) {
        const body = {
          tags: [
            {
              name: "Regular",
              id: "4878003000016184013",
              color_code: "#63C57E",
            },
          ],
          ids: [],
        };
        for (let i = 0; i < addtags.regularUsers.length; i++) {
          body.ids.push(addtags.regularUsers[i].contactId);
        }
        const updateTag = await axios.post(
          `https://www.zohoapis.com/crm/v3/Contacts/actions/add_tags`,
          body,
          zohoConfig
        );
      }

      if (addtags.activeUsers.length > 0) {
        const body = {
          tags: [
            {
              name: "Active",
              id: "4878003000016184004",
              color_code: "#57B1FD",
            },
          ],
          ids: [],
        };
        for (let i = 0; i < addtags.activeUsers.length; i++) {
          body.ids.push(addtags.activeUsers[i].contactId);
        }
        const updateTag = await axios.post(
          `https://www.zohoapis.com/crm/v3/Contacts/actions/add_tags`,
          body,
          zohoConfig
        );
      }

      if (addtags.inactiveUsers.length > 0) {
        const body = {
          tags: [
            {
              name: "Inactive",
              id: "4878003000016184005",
              color_code: "#969696",
            },
          ],
          ids: [],
        };
        for (let i = 0; i < addtags.inactiveUsers.length; i++) {
          body.ids.push(addtags.inactiveUsers[i].contactId);
        }
        const updateTag = await axios.post(
          `https://www.zohoapis.com/crm/v3/Contacts/actions/add_tags`,
          body,
          zohoConfig
        );
      }
    }
    return {
      status: "success",
      totalData: totalData,
      totalTags: totalTags,
    };
  } catch (error) {
    return {
      status: "error",
      message: error.message,
      code: error.status || 500,
    };
  }
};

app.post("/quiz/analysis/weekly", async (req, res) => {
  try {
    let { startDate, endDate } = req.body;
    const data = await getWeeklyQuizAnalysis(startDate, endDate);
    return res.status(200).send(data);
  } catch (error) {
    return res.status(error.status || 500).send({
      status: "error",
      message: error.message,
      code: error.status || 500,
    });
  }
});

app.post("/pointagram/hash", async (req, res) => {
  try {
    const { email } = req.body;
    const timestamp = Math.floor(Date.now() / 1000);
    const api_key = process.env.POINTAGRAM_API_KEY;
    const api_user = process.env.POINTAGRAM_API_USER;
    const appSecret = process.env.POINTAGRAM_APP_SECRET;
    const appId = process.env.POINTAGRAM_APP_ID;
    const config = {
      headers: {
        api_key: api_key,
        "Content-Type": "application/json",
        api_user: api_user,
      },
    };
    const findPlayer = await axios.get(
      `https://app.pointagram.com/server/externalapi.php/list_players?search_by=Email&filter=${email}`,
      config
    );
    if (findPlayer.data?.length > 0) {
      const playerId = findPlayer.data[0].id;
      const msg = `${playerId} ${appId} ${timestamp}`;
      const hmac = crypto
        .createHmac("sha256", appSecret)
        .update(msg)
        .digest("hex");
      return res.status(200).send({
        status: 200,
        hmac: hmac,
        playerId,
        appId,
        timestamp,
      });
    }
  } catch (error) {
    return res.status(error.status || 500).send({
      status: "error",
      message: error.message,
      code: error.status || 500,
    });
  }
});

const getStudentDetails = async (email) => {
  try {
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

    if (contact.status === 204) {
      return {
        status: contact.status,
        mode: "nouser",
      };
    }

    const studentName = contact.data.data[0].Student_Name;
    const name = contact.data.data[0].Full_Name;
    const credits = contact.data.data[0].Credits;
    const coins = contact.data.data[0].Coins;
    const phone = contact.data.data[0].Phone;
    const contactId = contact.data.data[0].id;
    const grade = contact.data.data[0].Student_Grade;
    const createdTime = contact.data.data[0].Created_Time;
    const tags = contact.data.data[0].Tag;
    const category = tags.filter(
      ({ name }) =>
        name === "Regular" ||
        name === "Active" ||
        name === "Inactive" ||
        name === "AtRisk" ||
        name === "Revival" ||
        name === "Dropouts"
    );

    const age = getNumberOfDays(createdTime);

    const referralsQuery = `select Email, Student_Name, Student_Grade, Phone, Credits from Contacts where Referee = '${contactId}'`;

    const attemptsQuery = `select Contact_Name.id as contactId from Attempts where Contact_Name = '${contactId}'`;

    const [referrals, attempts] = await Promise.all([
      limit(() => getAnalysisData(referralsQuery, zohoConfig)),
      limit(() => getAnalysisData(attemptsQuery, zohoConfig)),
    ]);

    if (referrals.status === 204) {
      return {
        status: 200,
        mode: "user",
        contactId: contactId,
        studentName,
        credits,
        coins,
        email: email,
        phone: phone,
        name,
        referrals: 0,
        quizzes: attempts.status === 200 ? attempts.data.info.count : 0,
        age: age,
        category: category[0]?.name,
      };
    }

    const referralsAttempted = await Promise.all(
      referrals.data.data.map(async (user) => {
        const attemptsQuery = `select Contact_Name.id as ContactId from Attempts where Contact_Name = '${user.id}'`;
        const [attempts] = await Promise.all([
          limit(() => getAnalysisData(attemptsQuery, zohoConfig)),
        ]);

        if (attempts.status === 204) {
          return {
            ...user,
            quizAttempted: 0,
          };
        }
        return {
          ...user,
          quizAttempted: attempts.data.info.count,
        };
      })
    );

    referralsAttempted.sort((a, b) => b.quizAttempted - a.quizAttempted);

    return {
      status: 200,
      mode: "user",
      contactId: contactId,
      studentName,
      credits,
      coins,
      email: email,
      phone: phone,
      name,
      referrals: referralsAttempted,
      quizzes: attempts.status === 200 ? attempts.data.info.count : 0,
      age: age,
      category: category[0]?.name,
    };
  } catch (error) {
    throw new Error(error);
  }
};

app.post("/student", async (req, res) => {
  try {
    const { email } = req.body;
    const data = await getStudentDetails(email);
    return res.status(200).send(data);
  } catch (error) {
    return res.status(error.status || 500).send({
      status: "error",
      message: error.message,
      code: error.status || 500,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server Started 🎈 http://localhost:${PORT}`);
});
