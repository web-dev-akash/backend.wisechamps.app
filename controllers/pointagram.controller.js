const express = require("express");
const crypto = require("crypto");
const { default: axios } = require("axios");
const {
  getZohoTokenOptimized,
  authMiddleware,
  getAnalysisData,
} = require("../components/common.component");
require("dotenv").config();
const pointagramRouter = express.Router();

pointagramRouter.post("/hash", async (req, res) => {
  try {
    const { email } = req.body;
    const timestamp = Math.floor(Date.now() / 1000);
    const api_key = process.env.POINTAGRAM_API_KEY;
    const api_user = process.env.POINTAGRAM_API_USER;
    const appSecret = process.env.POINTAGRAM_APP_SECRET;
    const appId = process.env.POINTAGRAM_APP_ID;
    const config = {
      headers: {
        api_key: api_key,
        "Content-Type": "application/json",
        api_user: api_user,
      },
    };
    const findPlayer = await axios.get(
      `https://app.pointagram.com/server/externalapi.php/list_players?search_by=Email&filter=${email}`,
      config
    );
    if (findPlayer.data?.length > 0) {
      const playerId = findPlayer.data[0].id;
      const msg = `${playerId} ${appId} ${timestamp}`;
      const hmac = crypto
        .createHmac("sha256", appSecret)
        .update(msg)
        .digest("hex");
      return res.status(200).send({
        status: 200,
        hmac: hmac,
        playerId,
        appId,
        timestamp,
      });
    }

    // create new user if not exists
    const token = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
    };
    const contact = await axios.get(
      `https://www.zohoapis.com/crm/v2/Contacts/search?email=${email}`,
      zohoConfig
    );
    if (contact.status >= 400 || contact.status === 204) {
      return res.status(contact.status).send({
        status: contact.status,
        message: "User Not Found",
      });
    }

    const contactId = contact.data.data[0].id;
    const name = contact.data.data[0].Student_Name;
    const pointagramBody = {
      player_name: name,
      player_email: email,
      player_external_id: contactId,
      offline: "1",
    };
    const response = await axios.post(
      `https://app.pointagram.com/server/externalapi.php/create_player`,
      pointagramBody,
      config
    );
    const playerId = response.data.profile_id;
    const msg = `${playerId} ${appId} ${timestamp}`;
    const hmac = crypto
      .createHmac("sha256", appSecret)
      .update(msg)
      .digest("hex");
    return res.status(200).send({
      status: 200,
      hmac: hmac,
      playerId,
      appId,
      timestamp,
    });
  } catch (error) {
    return res.status(error.status || 500).send({
      status: "error",
      message: error.message,
      code: error.status || 500,
    });
  }
});

pointagramRouter.get("/add/coins", authMiddleware, async (req, res) => {
  try {
    const token = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
    };
    const users = [];
    let currentPage = 0;
    while (true) {
      const userQuery = `select Email, Phone, Coins, Student_Name from Contacts where Coins is not null limit ${
        currentPage * 200
      }, 200`;
      const response = await getAnalysisData(userQuery, zohoConfig);
      if (response.status === 204) {
        return res.status(204).json({
          status: response.status,
          message: "No users were found",
        });
      }
      users.push(...response.data.data);
      if (!response.data.info.more_records) {
        break;
      }
      currentPage++;
    }

    const api_key = process.env.POINTAGRAM_API_KEY;
    const api_user = process.env.POINTAGRAM_API_USER;
    const config = {
      headers: {
        api_key: api_key,
        "Content-Type": "application/json",
        api_user: api_user,
      },
    };

    const updateCoins = users.map(async (user) => {
      const contactId = user.id;
      const name = user.Student_Name;
      const email = user.Email;
      const data = await axios.post(
        "https://app.pointagram.com/server/externalapi.php/add_score",
        {
          player_name: name,
          player_email: email,
          player_external_id: contactId,
          offline: "1",
          points: user.Coins,
          scoreseries_name: "Wise Coins",
          create_player: 1,
          source_score_id: contactId,
        },
        config
      );
      return data.data;
    });
    const result = await Promise.all(updateCoins);
    return res.status(200).send({ status: "Success", result });
  } catch (error) {
    return res.status(error.status || 500).send({
      status: "error",
      message: error.message,
      code: error.status || 500,
    });
  }
});

module.exports = pointagramRouter;
