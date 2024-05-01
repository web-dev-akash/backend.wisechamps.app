const { default: axios } = require("axios");
const { getZohoTokenOptimized } = require("./common.component");
const moment = require("moment");

const getTeacherDetailsWithEmail = async (email, pass) => {
  const accessToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${accessToken}`,
    },
  };
  const contact = await axios.get(
    `https://www.zohoapis.com/crm/v2/Teachers/search?criteria=((Email:equals:${email})and(Password:equals:${pass}))`,
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

const getDailyReports = async (grade) => {
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
    select_query: `select Session.Session_Grade as Grade, Contact_Name.Email as Email, Contact_Name.Student_Name as Student_Name, Contact_Name.Team as Team,Contact_Name.id as Student_ID, Session_Date_Time, Quiz_Score from Attempts where (Session.Session_Grade = '${grade}') and Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}'`,
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
    select_query: `select Contact_Name.Student_Name as Student_Name, Contact_Name.Team as Team,Contact_Name.id as Student_ID, Session_Date_Time, Quiz_Score, Quiz_Winner from Attempts where Session.Session_Grade = '${grade}' and Quiz_Winner is not null order by Session_Date_Time desc`,
  };

  const winner = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    winnerBody,
    zohoConfig
  );

  const previousWinners = winner.status === 200 ? winner.data.data : false;
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

module.exports = {
  getTeacherDetailsWithEmail,
  getDailyReports,
  updateTeachersAttendance,
};
