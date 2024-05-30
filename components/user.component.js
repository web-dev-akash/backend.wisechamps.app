const { default: axios } = require("axios");
const {
  getZohoTokenOptimized,
  getAnalysisData,
} = require("./common.component");
const optGenerator = require("otp-generator");
const pLimit = require("p-limit");

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
          Lead_Source: "External Referral",
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
        mode: "internalservererrorinfindinguser",
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

const generateAndSendOtp = async (phone, email) => {
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

module.exports = {
  getZohoUserDetailsWithPhone,
  getZohoUserDetailsWithEmail,
  addUserToZoho,
  generateAndSendOtp,
  resendOTP,
};
