const { default: axios } = require("axios");
const { getZohoTokenOptimized } = require("./common.component");

const freeMeetLink = `https://us06web.zoom.us/j/87300068676?pwd=4mj1Nck0plfYDJle9YcfX1MJYrcLbu.1`;

const getMeetingLink = async (emailParam) => {
  // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
  // logsData.zoomLogs?.push({
  //   email: emailParam,
  //   description: "EnteredEmail",
  //   date: new Date().toDateString(),
  //   time: new Date(oldDate).toLocaleTimeString("en-US"),
  // });
  // logsData.zoomLogs
  //   ? fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
  //       if (err) throw err;
  //     })
  //     : null;
  // // return "success";
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
    // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    // logsData.zoomLogs?.push({
    //   email: emailParam,
    //   description: `internalservererrorinfindinguser ${contact.status}`,
    //   date: new Date().toDateString(),
    //   time: new Date(oldDate).toLocaleTimeString("en-US"),
    // });
    // logsData.zoomLogs
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
  // // return { contact };
  if (contact.status === 204) {
    // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    // logsData.zoomLogs?.push({
    //   email: emailParam,
    //   description: `nouser 204`,
    //   date: new Date().toDateString(),
    //   time: new Date(oldDate).toLocaleTimeString("en-US"),
    // });
    // logsData.zoomLogs
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
      mode: "nouser",
    };
  }

  const contactid = contact.data.data[0].id;
  const email = contact.data.data[0].Email;
  const grade = contact.data.data[0].Student_Grade;
  const name = contact.data.data[0].Student_Name;
  const credits = contact.data.data[0].Credits || 0;
  const team = contact.data.data[0].Team;
  const address = contact.data.data[0].Address;
  const pincode = contact.data.data[0].Pincode;
  const gradeUpdated = contact.data.data[0].Grade_Updated;
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
    // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    // logsData.zoomLogs?.push({
    //   email: emailParam,
    //   description: `internalservererrorinfindingsession ${session.status}`,
    //   date: new Date().toDateString(),
    //   time: new Date(oldDate).toLocaleTimeString("en-US"),
    // });
    // logsData.zoomLogs
    //   ? fs.writeFile(
    //       "./logs.json",
    //       JSON.stringify(logsData, null, 2),
    //       (err) => {
    //         if (err) throw err;
    //       }
    //     )
    //   : null;
    return {
      status: session.status,
      mode: "internalservererrorinfindingsession",
    };
  }

  if (session.status === 204) {
    // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    // logsData.zoomLogs?.push({
    //   email: emailParam,
    //   description: `nosession ${session.status}`,
    //   date: new Date().toDateString(),
    //   time: new Date(oldDate).toLocaleTimeString("en-US"),
    // });
    // logsData.zoomLogs
    //   ? fs.writeFile(
    //       "./logs.json",
    //       JSON.stringify(logsData, null, 2),
    //       (err) => {
    //         if (err) throw err;
    //       }
    //     )
    //   : null;
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
  } else if (attempt.status === 200) {
    finalAddress = Number(attempt.data.info.count) <= 3 ? "Temp address" : null;
  } else {
    finalAddress = "Temp address";
  }

  for (let i = 0; i < session.data.data.length; i++) {
    const sessionGrade = session.data.data[i].Session_Grade;
    const paidMeetLink = session.data.data[i].Explanation_Meeting_Link;
    const link = !credits || credits == 0 ? freeMeetLink : paidMeetLink;
    const correctSession = sessionGrade.find((res) => res === grade);
    if (correctSession || Number(grade) === 0) {
      // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
      // logsData.zoomLogs?.push({
      //   email: emailParam,
      //   description: `LinkGenerated 200`,
      //   date: new Date().toDateString(),
      //   time: new Date(oldDate).toLocaleTimeString("en-US"),
      // });
      // logsData.zoomLogs
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
        mode: !gradeUpdated ? "oldData" : "zoomlink",
        email,
        link,
        name,
        credits: credits,
        grade: grade,
        team: team === "Boys" || team === "Girls" ? null : team,
        address: finalAddress,
        pincode,
      };
    }
  }

  // let oldDate1 = new Date().setMinutes(new Date().getMinutes() + 330);
  // logsData.zoomLogs?.push({
  //   email: emailParam,
  //   description: `nosession 204`,
  //   date: new Date().toDateString(),
  //   time: new Date(oldDate1).toLocaleTimeString("en-US"),
  // });
  // logsData.zoomLogs
  //   ? fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
  //       if (err) throw err;
  //     })
  //   : null;
  return {
    status: session.status,
    mode: "nosession",
  };
};

module.exports = { getMeetingLink };
