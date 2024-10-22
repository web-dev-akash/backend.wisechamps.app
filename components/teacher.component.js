const { default: axios } = require("axios");
const {
  getZohoTokenOptimized,
  getAnalysisData,
} = require("./common.component");
const moment = require("moment");
const pLimit = require("p-limit");
const limit = pLimit(20);

// find and login teachers
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
    `https://www.zohoapis.com/crm/v6/Teachers/search?criteria=((Email:equals:${email})and(Password:equals:${pass}))`,
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

// get students reports based on grade and date
const getDailyReports = async (grade, currDate) => {
  const zohoToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${zohoToken}`,
    },
  };

  const date = new Date(currDate);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const formattedDateStart = `${year}-${month}-${day}T00:00:00+05:30`;
  const formattedDateEnd = `${year}-${month}-${day}T23:59:59+05:30`;

  const reportBody = {
    select_query: `select Session.Session_Grade as Grade, Contact_Name.Email as Email, Contact_Name.Student_Name as Student_Name, Contact_Name.Team as Team,Contact_Name.id as Student_ID, Session_Date_Time, Quiz_Score from Attempts where (Session.Session_Grade = '${grade}') and Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}'`,
  };

  const report = await axios.post(
    `https://www.zohoapis.com/crm/v6/coql`,
    reportBody,
    zohoConfig
  );
  if (report.status >= 400) {
    return {
      status: report.status,
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
    select_query: `select Contact_Name.Student_Name as Student_Name, Contact_Name.Team as Team,Contact_Name.id as Student_ID, Session_Date_Time, Quiz_Score, Quiz_Winner from Attempts where Session.Session_Grade = '${grade}' and Quiz_Winner is not null order by Session_Date_Time desc limit 100`,
  };

  const winner = await axios.post(
    `https://www.zohoapis.com/crm/v6/coql`,
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
    status: 200,
    mode: "successReport",
    totalScore: totalScore,
    reports: finalReports,
    previousWinners: previousWinners,
  };
};

// add teachers attendance in zoho
const updateTeachersAttendance = async (requestBody) => {
  const {
    sessionDate,
    zoom,
    grade,
    explanation,
    contactId,
    winners,
    criteria,
  } = requestBody;
  const zohoToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${zohoToken}`,
    },
  };
  const date = moment(sessionDate);
  const formattedDateStart = `${date.format("YYYY-MM-DD")}T00:00:00+05:30`;
  const formattedDateEnd = `${date.format("YYYY-MM-DD")}T23:59:59+05:30`;

  const sessionBody = {
    select_query: `select id as Session_ID, Session_Date_Time from Sessions where Session_Grade = '${grade}' and Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}'`,
  };

  const session = await axios.post(
    `https://www.zohoapis.com/crm/v6/coql`,
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

  const sessionId = session.data.data[0].Session_ID;
  const sessionDateTime = session.data.data[0].Session_Date_Time;

  const attendanceQuery = `select Session, Session_Date_Time from Teachers_Attendance
 where (Session = '${sessionId}' and Session_Date_Time = '${sessionDateTime}') and Teacher = '${contactId}'`;

  const attendanceAlreadyExists = await getAnalysisData(
    attendanceQuery,
    zohoConfig
  );
  if (attendanceAlreadyExists.status === 200) {
    return {
      status: 409,
      mode: "duplicateAttendance",
    };
  }

  // mark winners for the day if ids are available
  if (winners && winners.length > 0) {
    winners.forEach(async (winner) => {
      const attemptBody = {
        select_query: `select id as Attempt_id, Session_Date_Time from Attempts where Contact_Name = '${winner}' and Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}'`,
      };

      const attempt = await axios.post(
        `https://www.zohoapis.com/crm/v6/coql`,
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
            Quiz_Winner: date.format("YYYY-MM-DD"),
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
        `https://www.zohoapis.com/crm/v6/Attempts/upsert`,
        updateAttemptBody,
        zohoConfig
      );

      if (updateAttempt.data.data[0].status !== "success") {
        return {
          status: 400,
          mode: "errorInUpdating",
          attempt: updateAttempt.data.data[0],
        };
      }
    });
  }

  const body = {
    data: [
      {
        Session: sessionId,
        Teacher: contactId,
        Session_Date_Time: sessionDateTime,
        Zoom_Meeting_Strength: zoom,
        Explanation_Meeting_Strength: explanation,
        Lucky_Draw_Criteria: criteria,
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
    `https://www.zohoapis.com/crm/v6/Teachers_Attendance`,
    body,
    zohoConfig
  );

  return {
    status: 200,
    mode: attendance.data.data[0].status,
  };
};

// get students having only 1 or 2 credits and have joined the quiz in last 15 days
const getLastSessionReport = async (grade) => {
  const zohoToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${zohoToken}`,
    },
  };

  const newgrade = grade.split(";");
  const gradeFilter =
    newgrade.length === 2
      ? `((Student_Grade = '${newgrade[0]}') or (Student_Grade = '${newgrade[1]}'))`
      : `(Student_Grade = '${grade}')`;

  const reportBody = {
    select_query: `select Email, Student_Name, id as Student_ID, Phone, Last_Name, Student_Grade, Credits from Contacts where (((Credits = 1) or (Credits = 2)) and ${gradeFilter})`,
  };

  const report = await axios.post(
    `https://www.zohoapis.com/crm/v6/coql`,
    reportBody,
    zohoConfig
  );

  if (report.status >= 400) {
    return {
      status: report.status,
      mode: "error",
    };
  }

  if (report.status === 204) {
    return {
      status: report.status,
      mode: "noreport",
    };
  }

  const date = moment();
  const formattedDateStart = `${date
    .clone()
    .subtract(15, "days")
    .format("YYYY-MM-DD")}T00:00:00+05:30`;
  const formattedDateEnd = `${date
    .clone()
    .format("YYYY-MM-DD")}T23:59:59+05:30`;

  const users = report.data.data;
  const finalUsers = [];
  await Promise.all(
    users.map(async (user) => {
      const attemptsQuery = `select Session.id as Session_Id from Attempts where ((Contact_Name = '${user.Student_ID}') and (Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}'))`;

      const [attempt] = await Promise.all([
        limit(() => getAnalysisData(attemptsQuery, zohoConfig)),
      ]);

      if (attempt.status === 200) {
        finalUsers.push(user);
      }
    })
  );

  return {
    status: 200,
    reports: finalUsers,
  };
};

module.exports = {
  getTeacherDetailsWithEmail,
  getDailyReports,
  updateTeachersAttendance,
  getLastSessionReport,
};
