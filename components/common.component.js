const { default: axios } = require("axios");
const fs = require("fs");
const pLimit = require("p-limit");
require("dotenv").config();
const limit = pLimit(20);
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
      `https://www.zohoapis.com/crm/v6/coql`,
      { select_query: query },
      zohoConfig
    );
    if (response.status >= 400) {
      return {
        status: contact.status,
        mode: "internalservererrorinfindinguser",
      };
    }
    return response;
  } catch (error) {
    throw new Error(error);
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

const authMiddleware = async (req, res, next) => {
  try {
    if (
      !req.headers.authorization ||
      req.headers.authorization.split(" ")[0] !== "Bearer"
    ) {
      return res.status(401).send({
        status: "Error",
        message: "Invalid Authorization",
      });
    }
    const token = req.headers.authorization.split(" ")[1];
    const authToken = process.env.AUTH_TOKEN;
    if (token !== authToken) {
      return res.status(401).send({
        status: "Error",
        message: "Invalid Authorization Token",
      });
    }
    next();
  } catch (error) {
    throw new Error(error.message);
  }
};

const getProductsFromStore = async () => {
  try {
    const accessToken = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${accessToken}`,
      },
    };
    const productQuery = `select id as Product_Id, Product_Name, Unit_Price, Product_Image_URL, Product_Stock, Description from Products where Product_Active = 'true' order by Unit_Price asc`;
    const [products] = await Promise.all([
      limit(() => getAnalysisData(productQuery, zohoConfig)),
    ]);
    if (products.status >= 400) {
      return {
        status: products.status,
        mode: "error",
      };
    }
    if (products.status === 204) {
      return {
        status: products.status,
        mode: "noproducts",
      };
    }

    const quizBalanceProduct = products.data.data.find(
      (product) => product.Product_Name === "25 Quiz Balance"
    );

    if (!quizBalanceProduct) {
      console.log("No Quiz Balance Product");
      return {
        status: 200,
        products: products.data.data,
      };
    }

    const filteredProducts = products.data.data.filter(
      (product) => product.Product_Name !== "25 Quiz Balance"
    );

    filteredProducts.unshift(quizBalanceProduct);

    return {
      status: 200,
      products: filteredProducts,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

const pLimitFactory = async (limit) => {
  const p_limit = await import("p-limit");
  const pLimit = p_limit.default(limit);
  return pLimit;
};

const initializeQueue = async () => {
  const PQueue = (await import("p-queue")).default;
  const uploadQueue = new PQueue({ concurrency: 1 });
  return uploadQueue;
};

module.exports = {
  getProductsFromStore,
  getZohoTokenOptimized,
  getAnalysisData,
  getNumberOfDays,
  formatDateWithTimezone,
  authMiddleware,
  pLimitFactory,
  initializeQueue,
};
