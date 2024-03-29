const { default: axios } = require("axios");
const { getZohoTokenOptimized } = require("./common.component");

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
    // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    // logsData.dailyLogs?.push({
    //   email: email,
    //   description: `Filled Form ${referralId}`,
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
      // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
      // logsData.dailyLogs?.push({
      //   email: email,
      //   description: `Interal Server Error ${result.status}`,
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
    // let oldDate1 = new Date().setMinutes(new Date().getMinutes() + 330);
    // logsData.dailyLogs?.push({
    //   email: email,
    //   description: `Contact Added to Zoho ${referralId}`,
    //   date: new Date().toDateString(),
    //   time: new Date(oldDate1).toLocaleTimeString("en-US"),
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
      status: 200,
      mode: "useradded",
    };
  } catch (error) {
    console.log(error);
    return error;
  }
};

module.exports = {
  getZohoUserDetailsWithPhone,
  getZohoUserDetailsWithEmail,
  addUserToZoho,
};
