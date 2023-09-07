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
  calendly: "https://calendly.com/marketing-2138/get-your-predicted-rank",
  orientation:
    "https://us06web.zoom.us/j/9387978938?pwd=NjdOTTZzNndPd1hWMEdYMi9zM2xGdz09",
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

const updateJobStatus = async (contactid, key, value) => {
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

const getLinkToRedirect = async (email) => {
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
  const name = contact.data.data[0].Last_Name.split(" ")[0];
  const phone = contact.data.data[0].Phone;
  const parentOrientationSlot = contact.data.data[0].Job_Orientation_Slot;
  const joinedParentOrientation = contact.data.data[0].Joined_Job_Orientation;
  const studentJobQuizSlot = contact.data.data[0].Student_Job_Quiz_Slot;
  const jobQuizAttendedDate = contact.data.data[0].Job_Quiz_Attended_Date;
  const jobAnnouncementSlot = contact.data.data[0].Job_Announcement_Slot;
  const joinedJobAnnouncement = contact.data.data[0].Joined_Job_Announcement;
  const currentDate = Math.floor(new Date() / 1000);
  if (!parentOrientationSlot) {
    return {
      link: `${links.calendly}?name=${name}&email=${email}&a1=${phone}`,
      mode: "calendly",
    };
  } else if (parentOrientationSlot && !joinedParentOrientation) {
    let status = "";
    const parentOrientationDate = Math.floor(
      new Date(parentOrientationSlot) / 1000
    );

    if (
      currentDate >= parentOrientationDate - 600 &&
      currentDate < parentOrientationDate + 1800
    ) {
      status = "approved";
      await updateJobStatus(contactid, "Joined_Job_Orientation", true);
    } else if (currentDate + 600 < parentOrientationDate) {
      status = "notstartedyet";
    } else if (currentDate >= parentOrientationDate + 1800) {
      status = "expired";
    }
    return {
      link: links.orientation,
      mode: "parentOrientation",
      status,
      date: parentOrientationDate,
    };
  } else if (!studentJobQuizSlot) {
    return {
      link: `${links.calendly}?name=${name}&email=${email}&a1=${phone}`,
      mode: "calendly",
    };
  } else if (studentJobQuizSlot && !jobQuizAttendedDate) {
    let status = "";
    const studentJobQuizDate = Math.floor(new Date(studentJobQuizSlot) / 1000);
    if (
      currentDate >= studentJobQuizDate - 600 &&
      currentDate < studentJobQuizDate + 1800
    ) {
      const date = new Date();
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;
      status = "approved";
      await updateJobStatus(contactid, "Job_Quiz_Attended_Date", formattedDate);
    } else if (currentDate + 600 < studentJobQuizDate) {
      status = "notstartedyet";
    } else if (currentDate >= studentJobQuizDate + 1800) {
      status = "expired";
    }
    return {
      link: links.orientation,
      mode: "studentJobQuiz",
      status,
      date: studentJobQuizDate,
    };
  } else if (!jobAnnouncementSlot) {
    return {
      link: `${links.calendly}?name=${name}&email=${email}&a1=${phone}`,
      mode: "calendly",
    };
  } else if (jobAnnouncementSlot && !joinedJobAnnouncement) {
    let status = "";
    const jobAnnouncementSlotDate = Math.floor(
      new Date(jobAnnouncementSlot) / 1000
    );
    if (
      currentDate >= jobAnnouncementSlotDate - 600 &&
      currentDate < jobAnnouncementSlotDate + 1800
    ) {
      status = "approved";
      await updateJobStatus(contactid, "Joined_Job_Announcement", true);
    } else if (currentDate + 600 < jobAnnouncementSlotDate) {
      status = "notstartedyet";
    } else if (currentDate >= jobAnnouncementSlotDate + 1800) {
      status = "expired";
    }
    return {
      link: links.orientation,
      mode: "jobAnnouncementSlot",
      status,
      date: jobAnnouncementSlotDate,
    };
  }
};

app.get("/getLink", async (req, res) => {
  const email = req.query.email;
  const data = await getLinkToRedirect(email);
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
