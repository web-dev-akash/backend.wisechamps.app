const { default: axios } = require("axios");
const { getZohoTokenOptimized } = require("./common.component");

const getZohoUserData = async (phone) => {
  const zohoToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${zohoToken}`,
    },
  };
  const contact = await axios.get(
    `https://www.zohoapis.com/crm/v2/Contacts/search?phone=${phone}`,
    zohoConfig
  );

  if (!contact || !contact.data || !contact.data.data) {
    return { phone, message: "No Contact Found" };
  }
  const contactid = contact.data.data[0].id;
  const name = contact.data.data[0].Full_Name;
  return { name, contactid };
};

module.exports = { getZohoUserData };
