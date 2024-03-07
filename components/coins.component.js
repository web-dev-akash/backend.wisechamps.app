const {
  getZohoTokenOptimized,
  getAnalysisData,
} = require("./common.component");
const moment = require("moment");

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
    const today = moment("2024-03-01");
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
      const attemptsQuery = `select Contact_Name.id as contactId, Contact_Name.Email as Email, Contact_Name.Credits as Credits, Contact_Name.Phone as Phone,Session_Date_Time from Attempts where Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}' order by Session_Date_Time asc limit ${
        currentPage * 200
      }, 200`;
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
    return {
      size: attempts.length,
      attempts,
    };
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = { updateCoinsForWeeklyToppers };
