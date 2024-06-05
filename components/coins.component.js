const pLimit = require("p-limit");
const {
  getZohoTokenOptimized,
  getAnalysisData,
} = require("./common.component");
const moment = require("moment");
const { default: axios } = require("axios");
const limit = pLimit(20);

const updateCoinsOnZoho = async (email, coins) => {
  try {
    const accessToken = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${accessToken}`,
      },
    };
    const updatedCoins = (coins || 0) + 300;
    const body = {
      data: [
        {
          Email: email,
          Coins: updatedCoins,
          $append_values: {
            Coins: true,
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
    return { status: data.data.data[0].status, email: email };
  } catch (error) {
    throw new Error(error.message);
  }
};

const createCoinsHistory = async (email, contactId) => {
  try {
    const accessToken = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${accessToken}`,
      },
    };
    const currentDate = moment().format("YYYY-MM-DD");
    const body = {
      data: [
        {
          Contact: contactId,
          Coins: 300,
          Action_Type: "Credit",
          Description: "Top 5 Highest Scorers Weekly",
          Updated_Date: currentDate,
        },
      ],
      apply_feature_execution: [
        {
          name: "layout_rules",
        },
      ],
      trigger: ["workflow"],
    };
    const data = await axios.post(
      `https://www.zohoapis.com/crm/v3/Coins`,
      body,
      zohoConfig
    );
    return { status: data.data.data[0].status, email: email };
  } catch (error) {
    throw new Error(error.message);
  }
};

const updateCoinsForWeeklyToppers = async () => {
  try {
    const accessToken = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${accessToken}`,
      },
    };
    const today = moment();
    const currDay = today.day();
    const diff = today.date() - currDay + (currDay === 0 ? -6 : 1);
    const monday = moment(new Date(today.date(diff)));
    const sunday = monday.clone().add(6, "days");
    const formattedDateStart = `${monday.format("YYYY-MM-DD")}T00:00:00+05:30`;
    const formattedDateEnd = `${sunday.format("YYYY-MM-DD")}T23:59:59+05:30`;

    console.log(formattedDateStart, formattedDateEnd);

    let currentPage = 0;
    const attempts = [];
    while (true) {
      const attemptsQuery = `select Contact_Name.id as contactId, Contact_Name.Email as Email,Contact_Name.Student_Grade as Student_Grade, Quiz_Score, Contact_Name.Coins as Coins from Attempts where Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}' order by Session_Date_Time asc limit ${
        currentPage * 2000
      }, 2000`;
      const attemptsResponse = await getAnalysisData(attemptsQuery, zohoConfig);
      if (attemptsResponse.status === 204) {
        return { status: "noattempts" };
      }
      attempts.push(...attemptsResponse.data.data);
      if (!attemptsResponse.data.info.more_records) {
        break;
      }
      currentPage++;
    }
    const uniqueUsers = {};
    attempts.forEach((attempt) => {
      if (uniqueUsers[attempt.Email]) {
        uniqueUsers[attempt.Email].Quiz_Score += attempt.Quiz_Score;
      } else {
        uniqueUsers[attempt.Email] = { ...attempt };
      }
    });
    const uniqueUsersArray = Object.values(uniqueUsers);

    const grade1And2 = [];
    const grade3 = [];
    const grade4 = [];
    const grade5 = [];
    const grade6 = [];
    const grade7And8 = [];

    uniqueUsersArray.forEach((attempt) => {
      switch (attempt.Student_Grade) {
        case "1":
        case "2":
          grade1And2.push(attempt);
          break;
        case "3":
          grade3.push(attempt);
          break;
        case "4":
          grade4.push(attempt);
          break;
        case "5":
          grade5.push(attempt);
          break;
        case "6":
          grade6.push(attempt);
          break;
        case "7":
        case "8":
          grade7And8.push(attempt);
          break;
        default:
          break;
      }
    });

    const topFiveUsers = [];
    const grades = [grade1And2, grade3, grade4, grade5, grade6, grade7And8];
    grades.forEach((grade) => {
      const topFive = grade
        .sort((a, b) => b.Quiz_Score - a.Quiz_Score)
        .slice(0, 5);
      topFiveUsers.push(...topFive);
    });

    const updateCoinsStatus = await Promise.all(
      topFiveUsers.map(async (user) => {
        const [updateCoinsResult, addCoinsHistoryResult] = await Promise.all([
          limit(() => updateCoinsOnZoho(user.Email, user.Coins)),
          limit(() => createCoinsHistory(user.Email, user.contactId)),
        ]);
        return {
          updateCoins: { ...updateCoinsResult },
          addCoins: { ...addCoinsHistoryResult },
        };
      })
    );

    return {
      status: "Success",
      updateCoinsStatus,
      topFiveUsers,
    };
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = { updateCoinsForWeeklyToppers };
