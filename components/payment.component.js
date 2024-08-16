const { default: axios } = require("axios");
const { getZohoTokenOptimized } = require("./common.component");

const createPaymentEntry = async ({ amount, id, email, credits, payId }) => {
  const zohoToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${zohoToken}`,
    },
  };

  const paymentData = await axios.get(
    `https://www.zohoapis.com/crm/v2/Payments/search?criteria=Payment_Link_ID:equals:${id}`,
    zohoConfig
  );

  const paymentAlreadyDone = paymentData.data?.data?.length >= 1 ? true : false;
  if (paymentAlreadyDone) {
    return { status: "Already Done" };
  }

  const attemptsCount = await axios.get(
    `https://www.zohoapis.com/crm/v6/Payments/actions/count`,
    zohoConfig
  );

  let attemptNumber = attemptsCount.data.count + 1;
  const contact = await axios.get(
    `https://www.zohoapis.com/crm/v6/Contacts/search?email=${email}`,
    zohoConfig
  );

  if (contact.status >= 400) {
    return {
      status: contact.status,
      mode: "internalservererrorinfindinguser",
    };
  }
  // return { contact };
  if (contact.status === 204) {
    return {
      status: contact.status,
      mode: "nouser",
    };
  }

  const contactid = contact.data.data[0].id;
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;
  const body = {
    data: [
      {
        Name: `${attemptNumber}`,
        Amount: amount,
        Payment_Link_ID: id,
        Conntact: contactid,
        Reference_ID: payId,
        Payment_Date: formattedDate,
        Credits: credits,
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
    `https://www.zohoapis.com/crm/v6/Payments`,
    body,
    zohoConfig
  );
  return result?.data?.data;
};

module.exports = { createPaymentEntry };
