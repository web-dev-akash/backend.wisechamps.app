const fs = require("fs");
const moment = require("moment");
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

const freeMeetLink = `https://us06web.zoom.us/j/88576916260?pwd=8rmB9bab9SPTWam2wkOXmed6mDFava.1`;

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
        console.log("Done writing");
      })
    : null;
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
            console.log("Done writing");
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
            console.log("Done writing");
          }
        )
      : null;
    return {
      status: contact.status,
      mode: "nouser",
    };
  }

  const email = contact.data.data[0].Email;
  const grade = contact.data.data[0].Student_Grade;
  const credits = contact.data.data[0].Credits;
  const name = contact.data.data[0].Student_Name;
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
            console.log("Done writing");
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
            console.log("Done writing");
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

  for (let i = 0; i < session.data.data.length; i++) {
    const sessionGrade = session.data.data[i].Session_Grade;
    const paidMeetLink = session.data.data[i].Explanation_Meeting_Link;
    let link = !credits || credits == 0 ? freeMeetLink : paidMeetLink;
    link = payId ? paidMeetLink : link;
    const correctSession = sessionGrade.find((res) => res === grade);
    if (correctSession) {
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
              console.log("Done writing");
            }
          )
        : null;
      return {
        status: 200,
        formattedDateStart,
        formattedDateEnd,
        mode: "zoomlink",
        email,
        link,
        name,
        credits: credits ? credits : 0,
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
        console.log("Done writing");
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
        console.log("Done writing");
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
            console.log("Done writing");
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
            console.log("Done writing");
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
            console.log("Done writing");
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
            console.log("Done writing");
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
  // console.log(session.data.data);
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
              console.log("Done writing");
            }
          )
        : null;
      return {
        status: 200,
        formattedDateStart,
        formattedDateEnd,
        mode: "quizlink",
        email,
        credits: credits ? credits : 0,
        name,
        link: `https://wisechamps.app/mod/lti/view.php?id=${sessionid}`,
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
        console.log("Done writing");
      })
    : null;

  return {
    status: session.status,
    mode: "nosession",
  };
};

const getZohoUserDetailsWithEmail = async (email) => {
  let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
  logsData.referralLogs?.push({
    email: email,
    description: `Email Entered 200`,
    date: new Date().toDateString(),
    time: new Date(oldDate).toLocaleTimeString("en-US"),
  });
  logsData.referralLogs
    ? fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
        if (err) throw err;
        console.log("Done writing");
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
    logsData.referralLogs?.push({
      email: email,
      description: `No User Found 204`,
      date: new Date().toDateString(),
      time: new Date(oldDate).toLocaleTimeString("en-US"),
    });
    logsData.referralLogs
      ? fs.writeFile(
          "./logs.json",
          JSON.stringify(logsData, null, 2),
          (err) => {
            if (err) throw err;
            console.log("Done writing");
          }
        )
      : null;
    return {
      status: contact.status,
      mode: "nouser",
    };
  }

  const contactName = contact.data.data[0].Full_Name;
  const contactEmail = contact.data.data[0].Email;
  const contactPhone = contact.data.data[0].Phone;
  const contactId = contact.data.data[0].id;

  return {
    status: 200,
    mode: "user",
    email,
    user: {
      name: contactName,
      email: contactEmail,
      phone: contactPhone,
      id: contactId,
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
            console.log("Done writing");
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
            console.log("Done writing");
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
            console.log("Done writing");
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
              console.log("Done writing");
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
              console.log("Done writing");
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
            console.log("Done writing");
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
            console.log("Done writing");
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
    },
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
            console.log("Done writing");
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
          Lead_Source: "External Referral",
          Source_Campaign: "Join Community",
          Referral_Contact_Id: referralId,
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
              console.log("Done writing");
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
            console.log("Done writing");
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
    console.log(contactData);
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
    console.log(feedbackData);
    const url =
      "https://script.google.com/macros/s/AKfycbzfelbwgNpG1v4zY8t-avVggcgH3K_7yE-r7B7eTWF45lt1q_guT4qaQTaEiYccHy-b/exec?type=feedback";
    const response = await axios.post(url, feedbackData);
    console.log(response.data);
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
            console.log("Done writing");
          }
        )
      : null;
    const credits = {
      119: 4,
      499: 33,
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
      callback_url: `https://zoom.wisechamps.com?email=${email}&credits=${
        credits[amount]
      }&amount=${amount * 100}`,
      callback_method: "get",
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
            console.log("Done writing");
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
    const { linkId, payId, email, credits, amount } = req.body;
    const createdPayment = await createPaymentEntry({
      amount: amount,
      id: linkId,
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
            console.log("Done writing");
          }
        )
      : null;
    return res.status(200).send(createdPayment.data.data);
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
            console.log("Done writing");
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
        console.log("Done writing");
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
            console.log("Done writing");
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
            console.log("Done writing");
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
              console.log("Done writing");
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
        console.log("Done writing");
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
            console.log("Done writing");
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
            console.log("Done writing");
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

app.post("/quiz/test", (req, res) => {
  return res.send({
    credits: 123,
    grade: "2",
    mode: "user",
    name: "Akash",
    percentage: 88,
    sessions: [
      {
        Session_Date_Time: "2023-11-23T19:00:00+05:30 ",
        Session_Name: "Logical Reasoning 1",
        Subject: "Science",
        Total_Questions: 10,
        attempted: true,
        id: "4878003000011641066",
        Quiz_Score: 9,
      },
      {
        Session_Date_Time: "2023-11-24T19:00:00+05:30",
        Session_Name: "Logical Reasoning 2",
        Subject: "Math",
        Total_Questions: 10,
        attempted: true,
        id: "4878003000011641066",
        Quiz_Score: 10,
      },
      {
        Session_Date_Time: "2023-11-25T19:00:00+05:30",
        Session_Name: "Logical Reasoning 3",
        Subject: "Math",
        Total_Questions: 10,
        attempted: true,
        id: "4878003000011641066",
        Quiz_Score: 7,
      },
      {
        Session_Date_Time: "2023-11-26T19:00:00+05:30",
        Session_Name: "Logical Reasoning 4",
        Subject: "Math",
        Total_Questions: 10,
        attempted: true,
        id: "4878003000011641066",
        Quiz_Score: 9,
      },
    ],
  });
});

app.listen(PORT, () => {
  console.log(`Server Started 🎈 http://localhost:${PORT}`);
});
