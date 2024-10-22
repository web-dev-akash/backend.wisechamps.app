const { default: axios } = require("axios");
const { getZohoTokenOptimized } = require("./common.component");

const freeMeetLink = process.env.FREE_MEETING_LINK;

const getMeetingLink = async (emailParam) => {
  const accessToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${accessToken}`,
    },
  };

  const contact = await axios.get(
    `https://www.zohoapis.com/crm/v6/Contacts/search?email=${emailParam}`,
    zohoConfig
  );

  if (contact.status >= 400) {
    return {
      status: contact.status,
      mode: "error",
    };
  }

  if (contact.status === 204) {
    return {
      status: contact.status,
      mode: "nouser",
    };
  }

  const contactid = contact.data.data[0].id;
  const email = contact.data.data[0].Email;
  const grade = contact.data.data[0].Student_Grade;
  const difficultyLevel = contact.data.data[0].Difficulty;

  // combined grade as per zoho query syntax
  let gradeGroup;
  if (grade == 1 || grade == 2) {
    gradeGroup = "1;2";
  } else if (grade == 7 || grade == 8) {
    gradeGroup = "7;8";
  } else gradeGroup = grade;

  const name = contact.data.data[0].Student_Name;
  const credits = Number(contact.data.data[0].Credits) || 0;
  const source_campaign = contact.data.data[0].Source_Campaign;
  const address = contact.data.data[0].Address;
  const pincode = contact.data.data[0].Pincode;
  const gradeUpdated = contact.data.data[0].Grade_Updated;
  const date = new Date();
  const start = new Date();
  // convert to IST timezone when deployed on AWS server.
  // +5:30 will be 330 minutes but added 260 so that user can access the meeting till 70 minutes from the start time
  start.setMinutes(start.getMinutes() + 260);
  // start.setMinutes(start.getMinutes() + 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const startHours = start.getHours().toString().padStart(2, "0");
  const endHours = end.getHours().toString().padStart(2, "0");
  const startMinutes = start.getMinutes().toString().padStart(2, "0");
  const endMinutes = end.getMinutes().toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const formattedDateStart = `${year}-${month}-${day}T${startHours}:${startMinutes}:00+05:30`;
  const formattedDateEnd = `${year}-${month}-${day}T${endHours}:${endMinutes}:00+05:30`;

  const updateGrade =
    source_campaign === "old olympiad data" && !gradeUpdated ? true : false;

  // return to free meet if the user has 0 credits
  if (!credits || credits === 0) {
    return {
      status: 200,
      mode: !gradeUpdated || updateGrade ? "oldData" : "zoomlink",
      email,
      link: freeMeetLink,
      name,
      credits: credits,
      grade: grade,
      team: "not required",
      address: "Temp Address",
      pincode,
    };
  }

  // find session based on the user difficulty
  const sessionBody = {
    select_query:
      !difficultyLevel || difficultyLevel === "School"
        ? `select Session_Grade, LMS_Activity_ID,Explanation_Meeting_Link from Sessions where (((Session_Grade = '${gradeGroup}') and (Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}')) and (Difficulty != 'Olympiad'))`
        : `select Session_Grade, LMS_Activity_ID,Explanation_Meeting_Link from Sessions where (((Session_Grade = '${gradeGroup}') and (Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}')) and (Difficulty = 'Olympiad'))`,
  };

  const session = await axios.post(
    `https://www.zohoapis.com/crm/v6/coql`,
    sessionBody,
    zohoConfig
  );

  if (session.status >= 400) {
    return {
      status: session.status,
      mode: "internalservererrorinfindingsession",
    };
  }

  const meetLink =
    session.status === 200
      ? session.data.data[0].Explanation_Meeting_Link
      : null;

  return {
    status: 200,
    mode: !gradeUpdated || updateGrade ? "oldData" : "zoomlink",
    email,
    link: meetLink,
    name,
    credits: credits,
    grade: grade,
    team: "not required",
    address: "Temp Address",
    pincode,
  };
};

module.exports = { getMeetingLink };
