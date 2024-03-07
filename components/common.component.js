const { default: axios } = require("axios");
const fs = require("fs");
require("dotenv").config();

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const refreshToken = process.env.REFRESH_TOKEN;
let accessToken = "";
let tokenTime = 0;

fs.readFile("./token.json", function (err, data) {
  if (err) throw err;
  if (data) {
    const token = JSON.parse(data);
    accessToken = token.token;
    tokenTime = token.time;
  }
});

const getZohoToken = async () => {
  try {
    const res = await axios.post(
      `https://accounts.zoho.com/oauth/v2/token?client_id=${clientId}&grant_type=refresh_token&client_secret=${clientSecret}&refresh_token=${refreshToken}`
    );
    const token = res.data.access_token;
    return token;
  } catch (error) {
    return error;
  }
};

const getZohoTokenOptimized = async () => {
  if (!accessToken) {
    accessToken = await getZohoToken();
    tokenTime = Math.floor(new Date() / 1000);
    const tokenData = {
      token: accessToken,
      time: tokenTime,
    };
    fs.writeFile("./token.json", JSON.stringify(tokenData, null, 2), (err) => {
      if (err) throw err;
    });
  } else {
    if (Math.floor(new Date() / 1000) - tokenTime > 2400) {
      accessToken = await getZohoToken();
      tokenTime = Math.floor(new Date() / 1000);
      const tokenData = {
        token: accessToken,
        time: tokenTime,
      };
      fs.writeFile(
        "../token.json",
        JSON.stringify(tokenData, null, 2),
        (err) => {
          if (err) throw err;
        }
      );
    }
  }
  return accessToken;
};

const getAnalysisData = async (query, zohoConfig) => {
  try {
    const response = await axios.post(
      `https://www.zohoapis.com/crm/v3/coql`,
      { select_query: query },
      zohoConfig
    );
    if (response.status >= 400) {
      throw new Error("Internal Server Error");
    }
    return response;
  } catch (error) {
    throw error;
  }
};

const getNumberOfDays = (start) => {
  const date1 = new Date(start);
  const date2 = new Date();
  const oneDay = 1000 * 60 * 60 * 24;
  const differenceMs = Math.abs(date2 - date1);
  const daysBetween = Math.round(differenceMs / oneDay);
  return daysBetween;
};

const formatDateWithTimezone = (date, time) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}${time}`;
};

module.exports = {
  getZohoTokenOptimized,
  getAnalysisData,
  getNumberOfDays,
  formatDateWithTimezone,
};
