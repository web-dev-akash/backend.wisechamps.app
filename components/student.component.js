const { default: axios } = require("axios");
const {
  getZohoTokenOptimized,
  getNumberOfDays,
  getAnalysisData,
} = require("./common.component");
const moment = require("moment");
const nodemailer = require("nodemailer");
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
    const joinedWisechamps = contact.data.data[0].Joined_Wisechampions
      ? true
      : false;
    const numOfIntoMeetJoined =
      contact.data.data[0].Number_of_Intro_Meeting_Joined || 0;
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

    const currentDate = moment();
    const sevenDaysBefore = `${currentDate
      .clone()
      .subtract(7, "days")
      .format("YYYY-MM-DD")}T00:00:00+05:30`;

    const sevenDaysAfter = `${currentDate
      .clone()
      .add(7, "days")
      .format("YYYY-MM-DD")}T23:59:59+05:30`;

    const referralsQuery = `select Email, Student_Name, Student_Grade, Phone, Credits from Contacts where Referee = '${contactId}' limit 2000`;

    const attemptsQuery = `select Session_Date_Time, Quiz_Score, Session.Name as Session_Name from Attempts where Contact_Name = '${contactId}' order by Session_Date_Time desc limit 2000`;

    const weeklyQuizzesQuery = `select Name as Session_Name, Subject, Session_Date_Time, Session_Image_Link, Session_Video_Link, Session_Video_Link_2, Vevox_Survey_Link from Sessions where Session_Grade = '${gradeGroup}' and Session_Date_Time between '${sevenDaysBefore}' and '${sevenDaysAfter}' order by Session_Date_Time desc`;

    const coinsQuery = `select Coins, Updated_Date, Action_Type, Description from Coins where Contact = '${contactId}' order by Updated_Date desc limit 2000`;

    const [referrals, attempts, coinsHistory, weeklyQuizzes] =
      await Promise.all([
        limit(() => getAnalysisData(referralsQuery, zohoConfig)),
        limit(() => getAnalysisData(attemptsQuery, zohoConfig)),
        limit(() => getAnalysisData(coinsQuery, zohoConfig)),
        limit(() => getAnalysisData(weeklyQuizzesQuery, zohoConfig)),
      ]);

    const finalWeeklyQuizzes = [];
    if (weeklyQuizzes.status === 200) {
      const sessionData = weeklyQuizzes.data.data;
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
        "November",
        "December",
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
      ];

      for (let i = 0; i < sessionData.length; i++) {
        const sessionName = sessionData[i].Session_Name;
        let newString = sessionName;
        let regexString = wordsToRemove.join("|");
        let regex = new RegExp("\\b(" + regexString + ")\\b|\\d+|&", "gi");
        newString = newString.replace(regex, "");
        finalWeeklyQuizzes.push({
          ...sessionData[i],
          Session_Name: newString.trim(),
        });
      }
    }
    let newUser = numOfIntoMeetJoined < 5 ? true : false;

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
        grade: grade,
        name,
        address,
        referrals: 0,
        quizzes: attempts.status === 200 ? attempts.data.data : 0,
        age: age,
        category: category[0]?.name,
        coinsHistory: coinsHistory.status === 200 ? coinsHistory.data.data : 0,
        joinedWisechamps,
        weeklyQuizzes: finalWeeklyQuizzes,
        newUser,
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
      grade: grade,
      name,
      address,
      referrals: referralsAttempted,
      quizzes: attempts.status === 200 ? attempts.data.data : 0,
      age: age,
      category: category[0]?.name,
      coinsHistory: coinsHistory.status === 200 ? coinsHistory.data.data : 0,
      joinedWisechamps,
      weeklyQuizzes: finalWeeklyQuizzes,
      newUser,
    };
  } catch (error) {
    throw new Error(error);
  }
};

const getStudentOrders = async (contactId) => {
  try {
    const accessToken = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const ordersQuery = `select id as Order_Id, Product.Product_Name as Product_Name, Product.Unit_Price as Unit_Price, Product.Product_Image_URL as Product_Image_URL, Expected_Delivery_Date, Order_Status, Order_Date from Orders where Contact = '${contactId}' order by Order_Date desc`;
    const [orders] = await Promise.all([
      limit(() => getAnalysisData(ordersQuery, zohoConfig)),
    ]);
    if (orders.status >= 400) {
      return {
        status: orders.status,
        mode: "error",
      };
    }
    if (orders.status === 204) {
      return {
        status: orders.status,
        mode: "noorders",
      };
    }
    return {
      status: 200,
      orders: orders.data.data,
    };
  } catch (error) {
    throw new Error(error);
  }
};

const updateIntroMeetData = async (contactId) => {
  try {
    const accessToken = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const userQuery = `select id, Email, Number_of_Intro_Meeting_Joined, Last_Intro_Meeting_Joined from Contacts where id = '${contactId}'`;
    const [user] = await Promise.all([
      limit(() => getAnalysisData(userQuery, zohoConfig)),
    ]);
    if (user.status >= 400) {
      return {
        status: user.status,
        mode: "error",
      };
    }
    if (user.status === 204) {
      return {
        status: user.status,
        mode: "nouser",
      };
    }

    if (
      user.data.data[0].Last_Intro_Meeting_Joined &&
      moment(user.data.data[0].Last_Intro_Meeting_Joined).format(
        "YYYY-MM-DD"
      ) === moment().format("YYYY-MM-DD")
    ) {
      return {
        status: 200,
        message: "AlreadyMarkedForToday",
      };
    }

    let numOfIntoMeetJoined =
      user.data.data[0].Number_of_Intro_Meeting_Joined || 0;
    numOfIntoMeetJoined = numOfIntoMeetJoined + 1;
    const lastIntroMeetJoined = moment().format("YYYY-MM-DD");

    const introMeetBody = {
      data: [
        {
          id: contactId,
          Number_of_Intro_Meeting_Joined: numOfIntoMeetJoined,
          Last_Intro_Meeting_Joined: lastIntroMeetJoined,
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

    const updateData = await axios.post(
      `https://www.zohoapis.com/crm/v6/Contacts/upsert`,
      introMeetBody,
      zohoConfig
    );

    return {
      status: updateData.status,
      message: "Done",
    };
  } catch (error) {
    throw new Error(error);
  }
};

const placeStudentOrder = async (contactId, productId) => {
  try {
    const accessToken = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${accessToken}`,
      },
    };
    const contactQuery = `select Coins from Contacts where id = '${contactId}'`;
    const productQuery = `select Unit_Price, Product_URL from Products where id = '${productId}'`;
    const [contact, product] = await Promise.all([
      limit(() => getAnalysisData(contactQuery, zohoConfig)),
      limit(() => getAnalysisData(productQuery, zohoConfig)),
    ]);

    if (
      contact.status === 204 ||
      contact.status >= 400 ||
      product.status === 204 ||
      product.status >= 400
    ) {
      return {
        status: contact.status === 200 ? product.status : contact.status,
        mode: "error",
      };
    }

    const coins = contact.data.data[0].Coins;
    const productPrice = product.data.data[0].Unit_Price;
    const productUrl = product.data.data[0].Product_URL;

    if (Number(coins) < Number(productPrice)) {
      return {
        status: 406,
        mode: "error",
      };
    }

    const currentDate = moment().format("YYYY-MM-DD");
    const body = {
      data: [
        {
          Contact: contactId,
          Product: productId,
          Order_Status: "Placed",
          Order_Date: currentDate,
          Order_Price: Number(productPrice),
          Product_URL: productUrl,
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
      `https://www.zohoapis.com/crm/v2/Orders`,
      body,
      zohoConfig
    );

    if (result.status >= 400) {
      return {
        status: result.status,
        mode: "internalservererror",
      };
    }
    if (result.data.data[0].code === "DUPLICATE_DATA") {
      return {
        status: result.status,
        mode: "duplicateorder",
      };
    }
    return {
      status: result.status,
      message: "Order Placed Successfully!",
    };
  } catch (error) {
    throw new Error(error);
  }
};

const getWeeklyWinners = async (grade) => {
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
    const diff = today.date() - currDay - 6;
    const monday = moment(new Date(today.date(diff)));
    const sunday = monday.clone().add(6, "days");

    const today2 = moment();
    const last16Days = today2.clone().subtract(16, "days");

    const formattedDateStart = `${monday.format("YYYY-MM-DD")}T00:00:00+05:30`;
    const formattedDateEnd = `${sunday.format("YYYY-MM-DD")}T23:59:59+05:30`;
    let gradeGroup;
    let gradeGroup2;
    let gradeGroup3;
    if (grade === "1" || grade === "2") {
      gradeGroup = "1;2";
      gradeGroup2 = "(Student_Grade = 1 or Student_Grade = 2)";
      gradeGroup3 = "(Contact.Student_Grade = 1 or Contact.Student_Grade = 2)";
    } else if (grade === "7" || grade === "8") {
      gradeGroup = "7;8";
      gradeGroup2 = "(Student_Grade = 7 or Student_Grade = 8)";
      gradeGroup3 = "(Contact.Student_Grade = 7 or Contact.Student_Grade = 8)";
    } else {
      gradeGroup = grade;
      gradeGroup2 = `Student_Grade = ${grade}`;
      gradeGroup3 = `Contact.Student_Grade = ${grade}`;
    }

    let currentPage = 0;
    const attempts = [];
    while (true) {
      const attemptsQuery = `select Contact_Name.id as contactId, Contact_Name.Email as Email,Contact_Name.Student_Name as Student_Name, Contact_Name.Student_Grade as Student_Grade, Quiz_Score, Contact_Name.Coins as Coins, Session.Number_of_Questions as Total_Questions from Attempts where Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}' and Session.Session_Grade = '${gradeGroup}' limit ${
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
        uniqueUsers[attempt.Email].Total_Questions += attempt.Total_Questions;
      } else {
        uniqueUsers[attempt.Email] = { ...attempt };
      }
    });
    const uniqueUsersArray = Object.values(uniqueUsers);

    const topFiveUsers = uniqueUsersArray
      .sort((a, b) => b.Quiz_Score - a.Quiz_Score)
      .slice(0, 5);

    const filteredGrades = uniqueUsersArray.filter(
      (user) => !topFiveUsers.some((topUser) => topUser.Email === user.Email)
    );

    filteredGrades.forEach((user) => {
      user.percentage = Math.floor(
        (user.Quiz_Score / user.Total_Questions) * 100
      );
    });

    const topFivePercentageUsers = filteredGrades
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    const contactQuery = `select Email, Student_Grade, Student_Name, Referral_Count from Contacts where ((Referral_Count is not null and Blocked = false) and ${gradeGroup2}) order by Referral_Count desc limit 2000`;
    const ordersQuery = `select Contact.Email as Email, Contact.Student_Grade as Student_Grade, Contact.Student_Name as Student_Name from Orders where (${gradeGroup3} and (Order_Date between '${monday.format(
      "YYYY-MM-DD"
    )}' and '${sunday.format("YYYY-MM-DD")}')) limit 2000`;

    const coinsQuery = `select Contact.Email as Email, Contact.Student_Grade as Student_Grade, Contact.Student_Name as Student_Name, Coins from Coins where (((Updated_Date between '${monday.format(
      "YYYY-MM-DD"
    )}' and '${sunday.format(
      "YYYY-MM-DD"
    )}') and (Action_Type = 'Credit')) and ${gradeGroup3}) limit 2000`;

    const megaLuckyDrawQuery = `select Contact.Email as Email, Contact.Student_Grade as Student_Grade, Contact.Student_Name as Student_Name, Coins, Updated_Date, Description from Coins where ((Updated_Date between '${last16Days.format(
      "YYYY-MM-DD"
    )}' and '${today2.format(
      "YYYY-MM-DD"
    )}') and (Description like '%winning refe%')) limit 2000`;

    const [contact, orders, coins, megaLuckyDrawReq] = await Promise.all([
      limit(() => getAnalysisData(contactQuery, zohoConfig)),
      limit(() => getAnalysisData(ordersQuery, zohoConfig)),
      limit(() => getAnalysisData(coinsQuery, zohoConfig)),
      limit(() => getAnalysisData(megaLuckyDrawQuery, zohoConfig)),
    ]);

    let maxReferrals = null;
    let maxOrders = null;
    let maxCoins = null;
    let megaLuckyDraw = null;

    if (contact.status === 200) {
      maxReferrals = contact.data.data.slice(0, 3);
    }

    if (orders.status === 200) {
      const ordersRes = orders.data.data;
      const uniqueOrders = {};
      ordersRes.forEach((order) => {
        if (uniqueOrders[order.Email]) {
          uniqueOrders[order.Email].Total_Orders += 1;
        } else {
          uniqueOrders[order.Email] = { ...order, Total_Orders: 1 };
        }
      });
      const uniqueOrdersArray = Object.values(uniqueOrders);
      maxOrders = uniqueOrdersArray;
    }

    if (coins.status === 200) {
      const coinsRes = coins.data.data;
      const uniqueCoins = {};

      coinsRes.forEach((coin) => {
        if (uniqueCoins[coin.Email]) {
          uniqueCoins[coin.Email].Coins += coin.Coins;
        } else {
          uniqueCoins[coin.Email] = { ...coin };
        }
      });
      const uniqueCoinsArray = Object.values(uniqueCoins);
      maxCoins = uniqueCoinsArray.sort((a, b) => b.Coins - a.Coins).slice(0, 3);
    }

    if (megaLuckyDrawReq.status === 200) {
      megaLuckyDraw = megaLuckyDrawReq.data.data;
    }

    const totalAttempts = [];
    currentPage = 0;
    while (true) {
      const attemptsQuery = `select Contact_Name.id as contactId, Contact_Name.Email as Email,Contact_Name.Student_Grade as Student_Grade, Contact_Name.Student_Name as Student_Name, Quiz_Score, Contact_Name.Coins as Coins, Session.Number_of_Questions as Total_Questions from Attempts where Session.Session_Grade = '${gradeGroup}' limit ${
        currentPage * 2000
      }, 2000`;
      const attemptsResponse = await getAnalysisData(attemptsQuery, zohoConfig);
      if (attemptsResponse.status === 204) {
        break;
      }
      totalAttempts.push(...attemptsResponse.data.data);
      if (!attemptsResponse.data.info.more_records) {
        break;
      }
      currentPage++;
    }
    const uniqueQuizTakers = {};
    totalAttempts.forEach((attempt) => {
      if (uniqueQuizTakers[attempt.Email]) {
        uniqueQuizTakers[attempt.Email].Total_Attempts += 1;
      } else {
        uniqueQuizTakers[attempt.Email] = { ...attempt, Total_Attempts: 1 };
      }
    });
    const uniqueQuizTakersArray = Object.values(uniqueQuizTakers);
    const maxQuizTaker = uniqueQuizTakersArray
      .sort((a, b) => b.Total_Attempts - a.Total_Attempts)
      .slice(0, 3);

    return {
      status: 200,
      topFiveUsers,
      topFivePercentageUsers,
      maxReferrals,
      maxOrders,
      maxCoins,
      maxQuizTaker,
      megaLuckyDraw,
    };
  } catch (error) {
    throw new Error(error);
  }
};

const getPaymentHistory = async (contactId) => {
  try {
    const accessToken = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const paymentQuery = `select Payment_Date, Amount, Credits from Payments where Conntact = '${contactId}' order by Payment_Date desc limit 2000`;

    const [payment] = await Promise.all([
      limit(() => getAnalysisData(paymentQuery, zohoConfig)),
    ]);

    if (payment.status === 200) {
      return {
        status: 200,
        paymentHistory: payment.data.data,
      };
    }

    return {
      status: 204,
      message: "No Purchases made yet",
    };
  } catch (error) {
    throw new Error(error);
  }
};

const sendStudentFeedback = async ({
  name,
  email,
  grade,
  subject,
  message,
}) => {
  try {
    const user = process.env.NODEMAILER_EMAIL;
    const pass = process.env.NODEMAILER_PASS;
    const sender = process.env.NODEMAILER_SENDER;
    const mailServerInfo = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: "465",
      ssl: true,
      auth: {
        user: user,
        pass: pass,
      },
    });

    const mailInfo = {
      from: `"${name}" <${user}>`,
      to: sender,
      subject: subject,
      html: `
        <div>
          <p>
            <b>Name - </b> ${name}
          </p>
          <p>
            <b>Email - </b> ${email}
          </p>
          <p>
            <b>Grade - </b> ${grade}
          </p>
          <p>
            <b>Subject - </b> ${subject}
          </p>
          <p>
            <b>Message - </b> ${message}
          </p>
        </div>`,
    };

    mailServerInfo.sendMail(mailInfo, async (error, info) => {
      if (error) {
        return {
          status: error.status || 500,
          message: error.message || "Something Went Wrong",
        };
      } else {
        return {
          status: 200,
          info: info.response,
          message: "Email Sent Successfully!",
        };
      }
    });

    return {
      status: 200,
      message: "Email Sent Successfully!",
    };
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  getStudentDetails,
  getStudentOrders,
  placeStudentOrder,
  updateIntroMeetData,
  getWeeklyWinners,
  getPaymentHistory,
  sendStudentFeedback,
};
