const express = require("express");
const quizRouter = express.Router();
const {
  getZohoTokenOptimized,
  authMiddleware,
} = require("../components/common.component");
const {
  getQuizLink,
  getWeeklyUserAttempts,
  updateAddress,
  getWeeklyQuizAnalysis,
} = require("../components/quiz.component");
const { getMeetingLink } = require("../components/meeting.component");
const { default: axios } = require("axios");

// get quiz link
quizRouter.post("/", async (req, res) => {
  const { email } = req.body;
  const data = await getQuizLink(email);
  res.status(200).send({
    ...data,
  });
});

// get weekly report
quizRouter.post("/report", async (req, res) => {
  try {
    const { email } = req.body;
    const data = await getWeeklyUserAttempts(email);
    return res.status(200).send(data);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

// update user address
quizRouter.post("/address", async (req, res) => {
  try {
    const { email, address, pincode } = req.body;
    const data = await updateAddress(email, address, pincode);
    res.status(200).send(data);
  } catch (error) {
    console.log("error---", error);
    return res.status(500).send(error);
  }
});

// get weekly analysis data
quizRouter.post("/analysis/weekly", async (req, res) => {
  try {
    const { startDate, endDate, range } = req.body;
    await getWeeklyQuizAnalysis(startDate, endDate, range);
    return res.status(200).send({ status: "Success" });
  } catch (error) {
    return res.status(error.status || 500).send({
      status: "error",
      message: error.message,
      code: error.status || 500,
    });
  }
});

// not in use
quizRouter.post("/loginLink", authMiddleware, async (req, res) => {
  try {
    const { email, surveyId } = req.body;
    const wstoken = process.env.WS_TOKEN;
    const wsfunction = process.env.WS_FUNCTION;
    const loginURL = `https://wisechamps.app/webservice/rest/server.php?wstoken=${wstoken}&wsfunction=${wsfunction}&user[email]=${email}&moodlewsrestformat=json`;
    const loginRes = await axios.get(loginURL);
    const loginLink = loginRes.data.loginurl;
    const quizLink = `https://wisechamps.app/mod/lti/view.php?id=${surveyId}`;
    const finalLink = `${loginLink}&wantsurl=${quizLink}`;
    return res.status(200).send({
      finalLink: finalLink,
    });
  } catch (error) {
    return res.status(error.status || 500).send({
      status: "error",
      message: error.message,
      code: error.status || 500,
    });
  }
});

// not in use
quizRouter.post("/team", async (req, res) => {
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
      return res.status(contact.status).send({
        status: contact.status,
        mode: "internalservererrorinfindinguser",
      });
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

// for testing
quizRouter.post("/test", async (req, res) => {
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

module.exports = quizRouter;
