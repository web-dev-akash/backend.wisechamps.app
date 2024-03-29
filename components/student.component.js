const { default: axios } = require("axios");
const {
  getZohoTokenOptimized,
  getNumberOfDays,
  getAnalysisData,
} = require("./common.component");
const moment = require("moment");
const pLimit = require("p-limit");
const limit = pLimit(20);

const getStudentDetails = async (email) => {
  try {
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

    const studentName =
      contact.data.data[0].Student_Name.toLowerCase().split(" ")[0];
    const name = contact.data.data[0].Full_Name;
    const credits = contact.data.data[0].Credits || 0;
    const coins = contact.data.data[0].Coins || 0;
    const phone = contact.data.data[0].Phone;
    const contactId = contact.data.data[0].id;
    const grade = contact.data.data[0].Student_Grade;
    const address = contact.data.data[0].Address || null;
    const createdTime = contact.data.data[0].Created_Time;
    const tags = contact.data.data[0].Tag;
    const category = tags.filter(
      ({ name }) =>
        name === "Regular" ||
        name === "Active" ||
        name === "Inactive" ||
        name === "AtRisk" ||
        name === "Revival" ||
        name === "Dropouts"
    );
    let gradeGroup;
    if (grade == 1 || grade == 2) {
      gradeGroup = "1;2";
    } else if (grade == 7 || grade == 8) {
      gradeGroup = "7;8";
    } else gradeGroup = grade;
    const age = getNumberOfDays(createdTime);
    const today = moment();
    const currDay = today.day();
    const diff = today.date() - currDay + (currDay === 0 ? -6 : 1);
    const monday = moment(new Date(today.date(diff)));
    const sunday = monday.clone().add(6, "days");
    const formattedDateStart = `${monday.format("YYYY-MM-DD")}T00:00:00+05:30`;
    const formattedDateEnd = `${sunday.format("YYYY-MM-DD")}T23:59:59+05:30`;

    const referralsQuery = `select Email, Student_Name, Student_Grade, Phone, Credits from Contacts where Referee = '${contactId}'`;

    const attemptsQuery = `select Contact_Name.id as contactId from Attempts where Contact_Name = '${contactId}'`;

    const sessionQuery = `select Name as Session_Name, Subject, Number_of_Questions as Total_Questions, Session_Date_Time from Sessions where Session_Grade = '${gradeGroup}' and Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}'`;

    const coinsQuery = `select Coins, Updated_Date, Action_Type, Description from Coins where Contact = '${contactId}' order by Updated_Date desc`;

    const [referrals, attempts, sessions, coinsHistory] = await Promise.all([
      limit(() => getAnalysisData(referralsQuery, zohoConfig)),
      limit(() => getAnalysisData(attemptsQuery, zohoConfig)),
      limit(() => getAnalysisData(sessionQuery, zohoConfig)),
      limit(() => getAnalysisData(coinsQuery, zohoConfig)),
    ]);

    const finalSessions = [];
    if (sessions.status === 200) {
      const sessionData = sessions.data.data;
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

      const sortedSessionData = sessionData.sort(
        (a, b) => new Date(a.Session_Date_Time) - new Date(b.Session_Date_Time)
      );

      for (let i = 0; i < sortedSessionData.length; i++) {
        const sessionName = sortedSessionData[i].Session_Name;
        let newString = sessionName;
        let regexString = wordsToRemove.join("|");
        let regex = new RegExp("\\b(" + regexString + ")\\b|\\d+|&", "gi");
        newString = newString.replace(regex, "");
        finalSessions.push({
          ...sortedSessionData[i],
          Session_Name: newString.trim(),
        });
      }
    } else {
      finalSessions.push(
        {
          Session_Name: "Science Live Quiz",
        },
        {
          Session_Name: "Maths Live Quiz",
        },
        {
          Session_Name: "Maths Live Quiz",
        },
        {
          Session_Name: "Maths Live Quiz",
        }
      );
    }

    if (referrals.status === 204) {
      return {
        status: 200,
        mode: "user",
        contactId: contactId,
        studentName,
        credits,
        coins,
        email: email,
        phone: phone,
        name,
        address,
        referrals: 0,
        quizzes: attempts.status === 200 ? attempts.data.info.count : 0,
        age: age,
        category: category[0]?.name,
        session: finalSessions,
        coinsHistory: coinsHistory.status === 200 ? coinsHistory.data.data : 0,
      };
    }

    const referralsAttempted = await Promise.all(
      referrals.data.data.map(async (user) => {
        const attemptsQuery = `select Contact_Name.id as ContactId from Attempts where Contact_Name = '${user.id}'`;
        const [attempts] = await Promise.all([
          limit(() => getAnalysisData(attemptsQuery, zohoConfig)),
        ]);

        if (attempts.status === 204) {
          return {
            ...user,
            quizAttempted: 0,
          };
        }
        return {
          ...user,
          quizAttempted: attempts.data.info.count,
        };
      })
    );

    referralsAttempted.sort((a, b) => b.quizAttempted - a.quizAttempted);

    return {
      status: 200,
      mode: "user",
      contactId: contactId,
      studentName,
      credits,
      coins,
      email: email,
      phone: phone,
      name,
      address,
      referrals: referralsAttempted,
      quizzes: attempts.status === 200 ? attempts.data.info.count : 0,
      age: age,
      category: category[0]?.name,
      session: finalSessions,
      coinsHistory: coinsHistory.status === 200 ? coinsHistory.data.data : 0,
    };
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = { getStudentDetails };
