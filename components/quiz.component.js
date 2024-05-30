const { default: axios } = require("axios");
const {
  getZohoTokenOptimized,
  getAnalysisData,
  getNumberOfDays,
  formatDateWithTimezone,
} = require("./common.component");
const moment = require("moment");
const pLimit = require("p-limit");
const { google } = require("googleapis");
const limit = pLimit(20);

const getQuizLink = async (emailParam) => {
  const wstoken = process.env.WS_TOKEN;
  const wsfunction = process.env.WS_FUNCTION;
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
    // logsData.quizLogs?.push({
    //   email: emailParam,
    //   description: `internalservererrorinfindinguser ${contact.status}`,
    //   date: new Date().toDateString(),
    //   time: new Date(oldDate).toLocaleTimeString("en-US"),
    // });
    // logsData.quizLogs
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
    // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    // logsData.quizLogs?.push({
    //   email: emailParam,
    //   description: `nouser ${contact.status}`,
    //   date: new Date().toDateString(),
    //   time: new Date(oldDate).toLocaleTimeString("en-US"),
    // });
    // logsData.quizLogs
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
  // return contact.data.data[0];

  const contactid = contact.data.data[0].id;
  const email = contact.data.data[0].Email;
  const grade = contact.data.data[0].Student_Grade;

  let gradeGroup;
  if (grade == 1 || grade == 2) {
    gradeGroup = "1;2";
  } else if (grade == 7 || grade == 8) {
    gradeGroup = "7;8";
  } else gradeGroup = grade;

  const name = contact.data.data[0].Student_Name;
  const credits = contact.data.data[0].Credits;
  const team = contact.data.data[0].Team;
  const address = contact.data.data[0].Address;
  const pincode = contact.data.data[0].Pincode;
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
  // console.log("Start", formattedDateStart);
  const sessionBody = {
    select_query: `select Session_Grade, LMS_Activity_ID from Sessions where Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}' and Session_Grade = '${gradeGroup}'`,
  };

  const session = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    sessionBody,
    zohoConfig
  );

  if (session.status >= 400) {
    // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    // logsData.quizLogs?.push({
    //   email: emailParam,
    //   description: `internalservererrorinfindingsession ${session.status}`,
    //   date: new Date().toDateString(),
    //   time: new Date(oldDate).toLocaleTimeString("en-US"),
    // });
    // logsData.quizLogs
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
    // logsData.quizLogs?.push({
    //   email: emailParam,
    //   description: `nosession ${session.status}`,
    //   date: new Date().toDateString(),
    //   time: new Date(oldDate).toLocaleTimeString("en-US"),
    // });
    // logsData.quizLogs
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
  if (!session.data.data[0].LMS_Activity_ID) {
    return {
      status: 500,
      mode: "noactivityid",
    };
  }
  const sessionid = session.data.data[0].LMS_Activity_ID.toString();
  const loginURL = `https://wisechamps.app/webservice/rest/server.php?wstoken=${wstoken}&wsfunction=${wsfunction}&user[email]=${emailParam}&moodlewsrestformat=json`;
  const loginRes = await axios.get(loginURL);
  const loginLink = loginRes.data.loginurl;
  const quizLink = `https://wisechamps.app/mod/lti/view.php?id=${sessionid}`;
  const finalLink = `${loginLink}&wantsurl=${quizLink}`;
  return {
    status: 200,
    mode: "quizlink",
    email,
    credits: credits ? credits : 0,
    name,
    link: finalLink,
    grade,
    team,
    address,
    pincode,
  };
};

const getWeeklyUserAttempts = async (email) => {
  // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
  // logsData.reportLogs?.push({
  //   email: email,
  //   description: `EnteredEmail 200`,
  //   date: new Date().toDateString(),
  //   time: new Date(oldDate).toLocaleTimeString("en-US"),
  // });
  // logsData.reportLogs
  //   ? fs.writeFile("./logs.json", JSON.stringify(logsData, null, 2), (err) => {
  //       if (err) throw err;
  //     })
  //   : null;
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
    // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    // logsData.reportLogs?.push({
    //   email: email,
    //   description: `NoUser 204`,
    //   date: new Date().toDateString(),
    //   time: new Date(oldDate).toLocaleTimeString("en-US"),
    // });
    // logsData.reportLogs
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
    // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    // logsData.reportLogs?.push({
    //   email: email,
    //   description: `NoSessions 204`,
    //   date: new Date().toDateString(),
    //   time: new Date(oldDate).toLocaleTimeString("en-US"),
    // });
    // logsData.reportLogs
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
      credits: credits,
    };
  }

  let minPercentage = 0;
  let maxPercentage = 100;
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

const getWeeklyDates = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const weeklyDates = [];
  let current = new Date(startDate);
  current.setDate(current.getDate() + ((1 + 7 - current.getDay()) % 7));

  while (current <= endDate) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);

    if (weekEnd > endDate) {
      weekEnd.setTime(endDate.getTime());
    }

    weeklyDates.push({ start: weekStart, end: weekEnd });
    current.setDate(current.getDate() + 7);
  }

  return weeklyDates;
};

const addDataToSheet = async (data, columnRange) => {
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
      record.firstTimer,
      record.activeUsers,
      record.inactiveUsers,
      record.regularUsers,
      record.atRiskUsers,
      record.dropoutUsers,
      record.revivalUsers,
      record.totalCreditExostedUsers,
    ];
  });
  const writeData = await sheet.spreadsheets.values.batchUpdate({
    auth,
    spreadsheetId,
    resource: {
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: `Sheet1!${columnRange}`,
          majorDimension: "COLUMNS",
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

const getWeeklyQuizAnalysis = async (startDate, endDate, columnRange) => {
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
          currentPage * 2000
        }, 2000`;
        const attemptsResponse = await getAnalysisData(
          attemptsQuery,
          zohoConfig
        );
        if (attemptsResponse.status === 204) {
          break;
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
          currentPage * 2000
        }, 2000`;
        const attemptsBeforeResponse = await getAnalysisData(
          attemptBeforeQuery,
          zohoConfig
        );
        if (attemptsBeforeResponse.status === 204) {
          break;
        }
        attemptsBefore.push(...attemptsBeforeResponse.data.data);
        if (!attemptsBeforeResponse.data.info.more_records) {
          break;
        }
        currentPage++;
      }

      if (attempts.length === 0) {
        totalData.push({
          startDate: new Date(formattedDateStart).toDateString(),
          startEnd: new Date(formattedDateEnd).toDateString(),
          firstTimer: 0,
          activeUsers: 0,
          inactiveUsers: 0,
          regularUsers: 0,
          atRiskUsers: 0,
          dropoutUsers: 0,
          revivalUsers: 0,
          totalCreditExostedUsers: 0,
        });
        continue;
      }

      const finalUsers = attempts.filter(
        (attempt) =>
          !attemptsBefore.find((before) => before.Email === attempt.Email) &&
          attempt.Email !== null
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

          if (lastThreeAttempt.status === 204 && user.Credits === 0 && !flag) {
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

          // Add users data

          if (
            lastSixAttempt.status === 200 &&
            Number(lastSixAttempt.data.info.count) >= 6
          ) {
            if (lastThreeAttempt.status === 204 && user.Credits != 0) {
              userStatuses.atRiskUsers.push(user);
            } else if (lastThreeAttempt.status === 204 && user.Credits == 0) {
              userStatuses.dropoutUsers.push(user);
            } else {
              userStatuses.regularUsers.push(user);
            }
          } else if (lastThreeAttempt.status === 204 && user.Credits == 0) {
            userStatuses.dropoutUsers.push(user);
          }

          // Add User Tags

          if (
            lastSixAttempt.status === 200 &&
            Number(lastSixAttempt.data.info.count) >= 6 &&
            !flag
          ) {
            if (lastThreeAttempt.status === 204 && user.Credits != 0) {
              addtags.atRiskUsers.push(user);
            } else if (lastThreeAttempt.status === 204 && user.Credits == 0) {
              addtags.dropoutUsers.push(user);
            } else {
              addtags.regularUsers.push(user);
            }
          } else if (
            lastThreeAttempt.status === 204 &&
            user.Credits == 0 &&
            !flag
          ) {
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
    const updatedSheet = await addDataToSheet(totalData, columnRange);
    console.log("Sheet Updated Successfully!");
    return {
      status: "success",
      updatedSheet,
    };
  } catch (error) {
    return {
      status: "error",
      message: error.message,
      code: error.status || 500,
    };
  }
};

module.exports = {
  getQuizLink,
  getWeeklyQuizAnalysis,
  getWeeklyUserAttempts,
  updateAddress,
};
