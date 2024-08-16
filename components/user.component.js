const { default: axios } = require("axios");
const {
  getZohoTokenOptimized,
  getAnalysisData,
} = require("./common.component");
const optGenerator = require("otp-generator");
const pLimit = require("p-limit");
const { google } = require("googleapis");

const limit = pLimit(20);

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
  // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
  // if (referral) {
  //   logsData.referralLogs?.push({
  //     email: "NA",
  //     description: `Referee Captured ${phone}`,
  //     date: new Date().toDateString(),
  //     time: new Date(oldDate).toLocaleTimeString("en-US"),
  //   });
  //   logsData.referralLogs
  //     ? fs.writeFile(
  //         "./logs.json",
  //         JSON.stringify(logsData, null, 2),
  //         (err) => {
  //           if (err) throw err;
  //         }
  //       )
  // : null;
  // } else {
  //   logsData.dailyLogs?.push({
  //     email: "NA",
  //     description: `Referee Captured ${phone}`,
  //     date: new Date().toDateString(),
  //     time: new Date(oldDate).toLocaleTimeString("en-US"),
  //   });
  //   logsData.dailyLogs
  //     ? fs.writeFile(
  //         "./logs.json",
  //         JSON.stringify(logsData, null, 2),
  //         (err) => {
  //           if (err) throw err;
  //         }
  //       )
  //     : null;
  // }
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
    // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    // logsData.dailyLogs?.push({
    //   email: "NA",
    //   description: `internalservererrorinfindinguser ${contact.status}`,
    //   date: new Date().toDateString(),
    //   time: new Date(oldDate).toLocaleTimeString("en-US"),
    // });
    // logsData.dailyLogs
    //   ? fs.writeFile(
    //       "./logs.json",
    //       JSON.stringify(logsData, null, 2),
    //       (err) => {
    //         if (err) throw err;
    //       }
    //     )
    //   : null;
    return {
      status: contact.status,
      mode: "internalservererrorinfindinguser",
    };
  }
  // return { contact };
  if (contact.status === 204) {
    //   let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    //   if (referral) {
    //     logsData.referralLogs?.push({
    //       email: "NA",
    //       description: `No Referee Found ${phone}`,
    //       date: new Date().toDateString(),
    //       time: new Date(oldDate).toLocaleTimeString("en-US"),
    //     });
    //     logsData.referralLogs
    //       ? fs.writeFile(
    //           "./logs.json",
    //           JSON.stringify(logsData, null, 2),
    //           (err) => {
    //             if (err) throw err;
    //           }
    //         )
    //       : null;
    //   } else {
    //     logsData.dailyLogs?.push({
    //       email: "NA",
    //       description: `No Referee Found ${phone}`,
    //       date: new Date().toDateString(),
    //       time: new Date(oldDate).toLocaleTimeString("en-US"),
    //     });
    //     logsData.dailyLogs
    //       ? fs.writeFile(
    //           "./logs.json",
    //           JSON.stringify(logsData, null, 2),
    //           (err) => {
    //             if (err) throw err;
    //           }
    //         )
    //       : null;
    //   }
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

  // if (referral) {
  // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
  // logsData.referralLogs?.push({
  //   email: "NA",
  //   description: `Referee Found ${phone}`,
  //   date: new Date().toDateString(),
  //   time: new Date(oldDate).toLocaleTimeString("en-US"),
  // });
  // logsData.referralLogs
  //   ? fs.writeFile(
  //       "./logs.json",
  //       JSON.stringify(logsData, null, 2),
  //       (err) => {
  //         if (err) throw err;
  //       }
  //     )
  //   : null;
  // } else {
  // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
  // logsData.dailyLogs?.push({
  //   email: "NA",
  //   description: `Referee Found ${phone}`,
  //   date: new Date().toDateString(),
  //   time: new Date(oldDate).toLocaleTimeString("en-US"),
  // });
  // logsData.dailyLogs
  //   ? fs.writeFile(
  //       "./logs.json",
  //       JSON.stringify(logsData, null, 2),
  //       (err) => {
  //         if (err) throw err;
  //       }
  //     )
  //   : null;
  // }

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

const addUserToZoho = async ({
  email,
  phone,
  parent_name,
  student_name,
  student_grade,
  referralId,
  source_campaign,
  relation,
  lead_source,
}) => {
  try {
    const zohoToken = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${zohoToken}`,
      },
    };
    const newphone = `91${phone
      .toString()
      .substring(phone.length - 10, phone.length)}`;
    const body = {
      data: [
        {
          Email: email,
          Phone: newphone,
          Last_Name: parent_name,
          Student_Name: student_name,
          Student_Grade: student_grade,
          Referee_Relation: relation || "",
          Lead_Source: lead_source || "External Referral",
          Source_Campaign: source_campaign || "Join Community",
          Referral_Contact_Id: referralId || "",
          Grade_Updated: true,
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
      return {
        status: result.status,
        mode: "error",
      };
    }

    if (result.data.data[0].code === "DUPLICATE_DATA") {
      return {
        status: result.status,
        mode: "duplicateuser",
      };
    }
    return {
      status: 200,
      mode: "useradded",
    };
  } catch (error) {
    console.log(error);
    return error;
  }
};

const generateAndSendOtp = async (
  phone,
  email,
  lead_source,
  source_campaign
) => {
  try {
    const newphone = `91${phone
      .toString()
      .substring(phone.length - 10, phone.length)}`;
    const accessToken = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${accessToken}`,
      },
    };
    const phoneQuery = `select id from Contacts where Phone = '${newphone}'`;
    const emailQuery = `select id from Contacts where Email = '${email}'`;
    const [contactWithPhone, contactWithEmail] = await Promise.all([
      limit(() => getAnalysisData(phoneQuery, zohoConfig)),
      limit(() => getAnalysisData(emailQuery, zohoConfig)),
    ]);

    if (contactWithPhone.status === 200 || contactWithEmail.status === 200) {
      const contactId =
        contactWithPhone.status === 200
          ? contactWithPhone.data.data[0].id
          : contactWithEmail.data.data[0].id;
      if (
        source_campaign &&
        !source_campaign.toLowerCase().includes("community") &&
        lead_source
      ) {
        const updateCampaignBody = {
          data: [
            {
              id: contactId,
              Source_Campaign: source_campaign,
              Lead_Source: lead_source,
            },
          ],
          duplicate_check_fields: ["id"],
          apply_feature_execution: [
            {
              name: "layout_rules",
            },
          ],
          trigger: [],
        };

        const updateCampaign = await axios.post(
          `https://www.zohoapis.com/crm/v6/Contacts/upsert`,
          updateCampaignBody,
          zohoConfig
        );

        if (updateCampaign.status >= 400 || updateCampaign.status === 204) {
          return {
            status: 200,
            mode: "duplicateuser",
            updateStatus: updateCampaign.status,
          };
        }
        return {
          status: 200,
          mode: "duplicateuser",
          updateStatus: updateCampaign.status,
        };
      }

      return {
        status: 200,
        mode: "duplicateuser",
      };
    }

    const otp = optGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      specialChars: false,
      upperCaseAlphabets: false,
    });

    const smsUri = process.env.SMS_URI;
    const templateId = process.env.SMS_TEMPLATE_ID;
    const authKey = process.env.SMS_AUTH_KEY;
    const otpConfig = {
      params: {
        template_id: templateId,
        mobile: newphone,
        authkey: authKey,
      },
      headers: { "Content-Type": "application/JSON" },
    };
    const otpResponse = await axios.post(smsUri, { OTP: otp }, otpConfig);
    if (otpResponse.data.type === "error") {
      return {
        mode: "error",
        status: 400,
      };
    }
    return {
      response: otpResponse.data.type,
      status: 201,
      otp: otp,
    };
  } catch (error) {
    throw new Error(error);
  }
};

const resendOTP = async (phone) => {
  try {
    const newphone = `91${phone
      .toString()
      .substring(phone.length - 10, phone.length)}`;
    const smsUri = "https://control.msg91.com/api/v5/otp/retry";
    const authKey = process.env.SMS_AUTH_KEY;
    const otpConfig = {
      params: {
        retrytype: "text",
        mobile: newphone,
        authkey: authKey,
      },
      headers: { "Content-Type": "application/JSON" },
    };
    const otpResponse = await axios.post(smsUri, null, otpConfig);
    if (otpResponse.data.type === "error") {
      return {
        mode: "error",
        status: 400,
      };
    }
    return {
      response: otpResponse.data.type,
      status: 201,
    };
  } catch (error) {
    throw new Error(error);
  }
};

const updateDataInSheet = async (data) => {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const auth = new google.auth.GoogleAuth({
    keyFile: "./key.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });
  const authClientObject = await auth.getClient();
  const sheet = google.sheets({
    version: "v4",
    auth: authClientObject,
  });
  const values = data.map((record) => {
    return [
      record.totalReferrals,
      record.furtherReferrals,
      record.noFurtherReferrals,
    ];
  });
  const writeData = await sheet.spreadsheets.values.batchUpdate({
    auth,
    spreadsheetId,
    resource: {
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: `Referral Level Analysis!B2:D`,
          values: values,
        },
      ],
      includeValuesInResponse: false,
      responseValueRenderOption: "FORMATTED_VALUE",
      responseDateTimeRenderOption: "SERIAL_NUMBER",
    },
  });
  return writeData.data;
};

const getReferralAnalysisData = async () => {
  try {
    const zohoToken = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${zohoToken}`,
      },
    };
    let currentPage = 0;
    const layer1Referrals = [];
    const referrals = [];

    while (true) {
      const layer1ReferralQuery = `select id, Email, Referral_Count from Contacts where Referee is not null and (Student_Grade != 0 and Blocked = false) limit ${
        currentPage * 200
      }, 200`;

      const layer1ReferralResponse = await getAnalysisData(
        layer1ReferralQuery,
        zohoConfig
      );
      if (layer1ReferralResponse.status === 204) {
        break;
      }
      layer1Referrals.push(...layer1ReferralResponse.data.data);
      if (!layer1ReferralResponse.data.info.more_records) {
        break;
      }
      currentPage++;
    }

    referrals.push(layer1Referrals);
    let currentLayerReferrals = layer1Referrals.filter(
      (user) => user.Referral_Count
    );

    while (currentLayerReferrals.length > 0) {
      const nextLayerReferrals = [];

      for (const user of currentLayerReferrals) {
        const url = `https://www.zohoapis.com/crm/v6/Contacts/${user.id}/Referral?fields=id,Email,Referral_Count,Student_Grade,Blocked`;
        const layerReferralResponse = await axios.get(url, zohoConfig);
        if (layerReferralResponse.data.data) {
          layerReferralResponse.data.data.forEach((item) => {
            if (item.Blocked === false && item.Student_Grade !== 0) {
              nextLayerReferrals.push(item);
            }
          });
        }
      }
      referrals.push(nextLayerReferrals);
      currentLayerReferrals = nextLayerReferrals.filter(
        (user) => user.Referral_Count
      );
    }

    const result = {
      status: 200,
      layers: referrals.map((layer, index) => ({
        layer: index + 1,
        totalReferrals: layer.length,
        furtherReferrals: layer.filter((user) => user.Referral_Count).length,
        noFurtherReferrals:
          layer.length - layer.filter((user) => user.Referral_Count).length,
      })),
    };

    const sheetResponse = await updateDataInSheet(result.layers);
    console.log("Sheet Updated Successfully!");

    return {
      status: 200,
      message: "success",
      result: result,
    };
  } catch (error) {
    throw new Error(error);
  }
};

const updateUserDifficulty = async ({ contactId, difficulty }) => {
  try {
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
          id: contactId,
          Difficulty: difficulty ? "Level 2" : "Level 1",
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

    const result = await axios.post(
      `https://www.zohoapis.com/crm/v6/Contacts/upsert`,
      body,
      zohoConfig
    );

    return {
      status: result.status,
      message: "Difficulty Updated",
    };
  } catch (error) {
    return {
      status: error.status || 500,
      message: "error",
    };
  }
};

const updateRevenueDataInSheet = async (data) => {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const auth = new google.auth.GoogleAuth({
    keyFile: "./key.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });
  const authClientObject = await auth.getClient();
  const sheet = google.sheets({
    version: "v4",
    auth: authClientObject,
  });

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const values = data.map((record) => {
    const date = new Date(record.date);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are zero-based
    const year = date.getFullYear();
    const dayOfWeek = daysOfWeek[date.getDay()];
    const recordDate = `${day}/${month}/${year}`;
    return [recordDate, dayOfWeek, record.attemptCount * 10];
  });

  const range = `Revenue Realised Report (Day Wise)!A2:C`;

  const writeData = await sheet.spreadsheets.values.batchUpdate({
    auth,
    spreadsheetId,
    resource: {
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: range,
          values: values,
        },
      ],
      includeValuesInResponse: false,
      responseValueRenderOption: "FORMATTED_VALUE",
      responseDateTimeRenderOption: "SERIAL_NUMBER",
    },
  });
  return writeData.data;
};

const getDailyRevenueAnalysisData = async () => {
  try {
    const zohoToken = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${zohoToken}`,
      },
    };
    let currentPage = 0;
    const attempts = [];
    while (true) {
      const attemptsQuery = `select Contact_Name.id as contactId,
      Contact_Name.Email as Email, Session_Date_Time from Attempts where Session_Date_Time >= '2024-04-15T00:00:00+05:30' order by Session_Date_Time asc limit ${
        currentPage * 2000
      }, 2000`;

      const response = await getAnalysisData(attemptsQuery, zohoConfig);
      if (response.status === 204) {
        break;
      }
      attempts.push(...response.data.data);
      if (!response.data.info.more_records) {
        break;
      }
      currentPage++;
    }

    const uniqueUsers = {};
    attempts.forEach((attempt) => {
      if (attempt.Email) {
        if (uniqueUsers[attempt.Email]) {
          uniqueUsers[attempt.Email].Count += 1;
        } else {
          uniqueUsers[attempt.Email] = { ...attempt, Count: 1 };
        }
      }
    });
    const uniqueUsersArray = Object.values(uniqueUsers);

    const filteredUsers = uniqueUsersArray.filter((user) => user.Count > 5);

    const contactIds = new Set(filteredUsers.map((user) => user.contactId));

    const filteredAttempts = attempts.filter((attempt) =>
      contactIds.has(attempt.contactId)
    );

    const groupedAttempts = filteredAttempts.reduce((acc, attempt) => {
      if (!acc[attempt.contactId]) {
        acc[attempt.contactId] = [];
      }
      acc[attempt.contactId].push(attempt);
      return acc;
    }, {});

    const updatedAttempts = Object.values(groupedAttempts).map((attempts) => {
      if (attempts.length > 5) {
        return attempts.slice(5);
      }
      return [];
    });

    const finalAttempts = updatedAttempts.flat();

    const attemptsByDate = {};

    finalAttempts.forEach((attempt) => {
      const sessionDateTime = new Date(attempt.Session_Date_Time);
      const date = sessionDateTime.toISOString().split("T")[0];

      if (!attemptsByDate[date]) {
        attemptsByDate[date] = [];
      }

      attemptsByDate[date].push(attempt);
    });

    const resultArray = Object.keys(attemptsByDate).map((date) => ({
      date: new Date(date).toDateString(),
      attemptCount: attemptsByDate[date].length,
    }));

    resultArray.sort((a, b) => new Date(a.date) - new Date(b.date));

    const sheetRes = await updateRevenueDataInSheet(resultArray);

    return {
      status: "sucess",
      resultArray,
    };
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  getZohoUserDetailsWithPhone,
  getZohoUserDetailsWithEmail,
  addUserToZoho,
  generateAndSendOtp,
  resendOTP,
  getReferralAnalysisData,
  updateUserDifficulty,
  getDailyRevenueAnalysisData,
};
