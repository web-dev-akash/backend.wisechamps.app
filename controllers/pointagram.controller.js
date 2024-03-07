const express = require("express");
const crypto = require("crypto");
const { default: axios } = require("axios");
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

    return res.status(404).send({
      status: 404,
      message: "User Not Found",
    });
  } catch (error) {
    return res.status(error.status || 500).send({
      status: "error",
      message: error.message,
      code: error.status || 500,
    });
  }
});

module.exports = pointagramRouter;
