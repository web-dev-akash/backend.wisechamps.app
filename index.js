const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 8080;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const refreshToken = process.env.REFRESH_TOKEN;

const links = {
  workshop:
    "https://us06web.zoom.us/j/9387978938?pwd=NjdOTTZzNndPd1hWMEdYMi9zM2xGdz09",
  quizlink: "https://wisechamps.app/mod/lti/view.php?id=43490",
};

const getZohoToken = async () => {
  try {
    const res = await axios.post(
      `https://accounts.zoho.com/oauth/v2/token?client_id=${clientId}&grant_type=refresh_token&client_secret=${clientSecret}&refresh_token=${refreshToken}`
    );
    console.log(res.data);
    const token = res.data.access_token;
    return token;
  } catch (error) {
    return error;
  }
};

const updateStatus = async (contactid, key, value) => {
  const zohoToken = await getZohoToken();
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
        id: contactid,
        [key]: value,
        $append_values: {
          [key]: true,
        },
      },
    ],
    duplicate_check_fields: ["id"],
    apply_feature_execution: [
      {
        name: "layout_rules",
      },
    ],
    trigger: ["workflow"],
  };
  await axios.post(
    `https://www.zohoapis.com/crm/v3/Contacts/upsert`,
    body,
    zohoConfig
  );
};

const getMeetingLink = async (email) => {
  const zohoToken = await getZohoToken();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${zohoToken}`,
    },
  };
  const contact = await axios.get(
    `https://www.zohoapis.com/crm/v2/Contacts/search?email=${email}`,
    zohoConfig
  );
  const contactid = contact.data.data[0].id;
  const parentWorkshopSlot = contact.data.data[0].Parent_Workshop_Slot;
  const workshopAttendedDate = contact.data.data[0].Workshop_Attended_Date;
  const currentDate = Math.floor(new Date() / 1000);
  if (parentWorkshopSlot && !workshopAttendedDate) {
    let status = "";
    const parentWorkshopDate = Math.floor(new Date(parentWorkshopSlot) / 1000);
    if (
      currentDate >= parentWorkshopDate - 600 &&
      currentDate < parentWorkshopDate + 1800
    ) {
      const date = new Date();
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const time = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}T${time}:${minutes}:00`;
      status = "approved";
      await updateStatus(contactid, "Workshop_Attended_Date", formattedDate);
    } else if (currentDate + 600 < parentWorkshopDate) {
      status = "notstartedyet";
    } else if (currentDate >= parentWorkshopDate + 1800) {
      status = "expired";
    }
    return {
      link: links.workshop,
      mode: "parentWorkshop",
      status,
      date: parentWorkshopDate,
    };
  }
};

const getQuizLink = async (email) => {
  const zohoToken = await getZohoToken();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${zohoToken}`,
    },
  };
  const contact = await axios.get(
    `https://www.zohoapis.com/crm/v2/Contacts/search?email=${email}`,
    zohoConfig
  );
  const contactid = contact.data.data[0].id;
  const parentWorkshopSlot = contact.data.data[0].Parent_Workshop_Slot;
  const workshopAttendedDate = contact.data.data[0].Workshop_Attended_Date;
  if (parentWorkshopSlot && workshopAttendedDate) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const time = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}T${time}:${minutes}:00`;
    await updateStatus(contactid, "Workshop_Quiz_Attended_Date", formattedDate);
    return {
      link: links.quizlink,
      mode: "quizlink",
    };
  } else {
    return {
      mode: "noWorkshopDate",
    };
  }
};

app.get("/meeting", async (req, res) => {
  const email = req.query.email;
  const data = await getMeetingLink(email);
  res.status(200).send({
    ...data,
  });
});

app.get("/quiz", async (req, res) => {
  const email = req.query.email;
  const data = await getQuizLink(email);
  res.status(200).send({
    ...data,
  });
});

app.get("/", (req, res) => {
  res.status(200).send({
    message: "Server Started 👌🤳",
  });
});

app.listen(PORT, () => {
  console.log("Server Started 🎈🎈");
});
