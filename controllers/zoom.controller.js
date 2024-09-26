const express = require("express");
const zoomRouter = express.Router();
const crypto = require("crypto");
const { Dropbox } = require("dropbox");
const stream = require("stream");
const moment = require("moment");
const { default: axios } = require("axios");
const fs = require("fs/promises");
const {
  initializeQueue,
  getZohoTokenOptimized,
} = require("../components/common.component");

const zoomIdToken = {
  1: "ZOOM_WEBHOOK_SECRET_TOKEN_1_2",
  3: "ZOOM_WEBHOOK_SECRET_TOKEN_3",
  4: "ZOOM_WEBHOOK_SECRET_TOKEN_4",
  5: "ZOOM_WEBHOOK_SECRET_TOKEN_5",
  6: "ZOOM_WEBHOOK_SECRET_TOKEN_6",
  7: "ZOOM_WEBHOOK_SECRET_TOKEN_7_8",
  "001": "ZOOM_WEBHOOK_SECRET_TOKEN_001",
};

const dropboxPath = {
  1: "wclqgrade1@gmail.com",
  3: "wclqgrade3@gmail.com",
  4: "wclqgrade4@gmail.com",
  5: "wclqgrade5@gmail.com",
  6: "wclqgrade6@gmail.com",
  7: "wclqgrade7@gmail.com",
  "001": "wisechampteacher001@gmail.com",
};

const getDropboxAccessToken = async () => {
  const dropboxRefreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  const dropboxAppKey = process.env.DROPBOX_APP_KEY;
  const dropboxAppSecret = process.env.DROPBOX_APP_SECRET;
  const res = await axios.post(`https://api.dropbox.com/oauth2/token`, null, {
    params: {
      grant_type: "refresh_token",
      refresh_token: dropboxRefreshToken,
      client_id: dropboxAppKey,
      client_secret: dropboxAppSecret,
    },
  });
  return res.data;
};

const readTokenFile = async () => {
  try {
    const data = await fs.readFile("./dropbox.json", "utf8");
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
};

const writeTokenFile = async (tokenData) => {
  await fs.writeFile(
    "./dropbox.json",
    JSON.stringify(tokenData, null, 2),
    "utf8"
  );
};

const getOptimizedAccessToken = async () => {
  const tokenData = await readTokenFile();
  const currentTime = Math.floor(Date.now() / 1000);

  if (tokenData && currentTime < tokenData.expire_by) {
    return tokenData.access_token;
  } else {
    const newTokenData = await getDropboxAccessToken();
    const expireBy = currentTime + newTokenData.expires_in - 1800;
    const updatedTokenData = {
      access_token: newTokenData.access_token,
      expire_by: expireBy,
    };
    await writeTokenFile(updatedTokenData);
    return updatedTokenData.access_token;
  }
};

const updateRecordingLinkInZoho = async (recordingLink, grade) => {
  try {
    const accessToken = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const today = moment();
    const formattedDateStart = `${today
      .clone()
      .format("YYYY-MM-DD")}T00:00:00+05:30`;

    const formattedDateEnd = `${today
      .clone()
      .format("YYYY-MM-DD")}T23:59:59+05:30`;

    const doubtSessionBody = {
      select_query: `select id from Mock_Doubt_Sessions where Grade like '%${grade}%' and Session_Date_Time between '${formattedDateStart}' and '${formattedDateEnd}'`,
    };

    const doubtSession = await axios.post(
      `https://www.zohoapis.com/crm/v6/coql`,
      doubtSessionBody,
      zohoConfig
    );

    if (doubtSession.status >= 204) {
      return {
        status: doubtSession.status,
      };
    }

    const id = doubtSession.data.data[0].id;

    const body = {
      data: [
        {
          id: id,
          Recording_Link: recordingLink,
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
      `https://www.zohoapis.com/crm/v6/Mock_Doubt_Sessions
/upsert`,
      body,
      zohoConfig
    );

    return {
      status: 200,
    };
  } catch (error) {
    return {
      status: error.status || 500,
      message: error.message,
    };
  }
};

const streamToDropbox = async (
  recordingUrl,
  dropboxPath,
  fileSize,
  dropboxAccessToken,
  downloadToken,
  grade
) => {
  const dbx = new Dropbox({ accessToken: dropboxAccessToken });
  const response = await axios({
    url: recordingUrl,
    method: "GET",
    responseType: "stream",
    headers: {
      Authorization: `Bearer ${downloadToken}`,
    },
  });

  if (fileSize < 150 * 1024 * 1024) {
    const uploadStream = new stream.PassThrough();
    response.data.pipe(uploadStream);
    const buffers = [];
    for await (const chunk of uploadStream) {
      buffers.push(chunk);
    }
    const fileBuffer = Buffer.concat(buffers);
    dbx
      .filesUpload({
        path: dropboxPath,
        contents: fileBuffer,
      })
      .then(() => {
        console.log("------File Uploaded------");
        dbx
          .sharingCreateSharedLinkWithSettings({
            path: dropboxPath,
          })
          .then(async (res) => {
            if (res.status === 200) {
              const recordingLink = res.result.url;
              await updateRecordingLinkInZoho(recordingLink, grade);
            }
          })
          .catch((error) => {
            console.log("------Error Generating Link------", error.error);
          });
      })
      .catch((error) => {
        console.log("------Error Uploading File------", error.error);
      });

    return {
      status: 200,
    };
  } else {
    const maxBlob = 40 * 1024 * 1024; // 40 MB
    let buffer = [];
    let bufferLength = 0;
    let sessionId = null;
    let offset = 0;

    for await (const chunk of response.data) {
      buffer.push(chunk);
      bufferLength += chunk.length;

      if (bufferLength >= maxBlob) {
        const content = Buffer.concat(buffer);
        buffer = [];
        bufferLength = 0;

        if (!sessionId) {
          const sessionStartRes = await dbx.filesUploadSessionStart({
            close: false,
            contents: content,
          });
          sessionId = sessionStartRes.result.session_id;
        } else {
          await dbx.filesUploadSessionAppendV2({
            cursor: { session_id: sessionId, offset: offset },
            contents: content,
            close: false,
          });
        }

        offset += content.length;
      }
    }

    if (bufferLength > 0) {
      const content = Buffer.concat(buffer);

      if (!sessionId) {
        await dbx.filesUploadSessionStart({
          close: true,
          contents: content,
        });
      } else {
        await dbx.filesUploadSessionFinish({
          cursor: { session_id: sessionId, offset: offset },
          commit: {
            path: dropboxPath,
            mode: "add",
            autorename: true,
            mute: false,
          },
          contents: content,
        });
      }
    }

    console.log(`Large file Uploaded ${dropboxPath}`);
    return {
      status: 200,
    };
  }
};

zoomRouter.post("/recording/:id", async (req, res) => {
  try {
    const data = req.body;
    const id = req.params.id;
    const token = zoomIdToken[id];
    const zoomSecretToken = process.env[token];

    if (data.event === "endpoint.url_validation") {
      const hashForValidate = crypto
        .createHmac("sha256", zoomSecretToken)
        .update(data.payload.plainToken)
        .digest("hex");
      return res.status(200).send({
        plainToken: data.payload.plainToken,
        encryptedToken: hashForValidate,
      });
    } else if (data.event === "recording.completed") {
      res.status(200).send({ message: "success" });
      const files = data.payload.object.recording_files;
      const recording = files.find(
        (file) => file.recording_type === "shared_screen_with_speaker_view"
      );
      if (!recording || !recording.recording_start) {
        return;
      }
      const recordingDate = moment(recording.recording_start)
        .add(5, "hours")
        .add(30, "minutes")
        .format("Do MMM h:mm A");
      const recordingName = data.payload.object.topic;
      const fileSize = recording.file_size;

      if (fileSize < 30 * 1024 * 1024 || !recordingName.includes("Mock Test")) {
        console.log("Recording Not Required");
        return;
      }

      const fileExtension = recording.file_extension;
      const recordingPath = `/Zoom Recording Math Olympiad/${dropboxPath[id]}/${recordingName} ${recordingDate}.${fileExtension}`;
      const recordingLink = recording.download_url;
      const downloadToken = data.download_token;
      const dropboxAccessToken = await getOptimizedAccessToken();
      const uploadQueue = await initializeQueue();

      uploadQueue
        .add(() =>
          streamToDropbox(
            recordingLink,
            recordingPath,
            fileSize,
            dropboxAccessToken,
            downloadToken,
            id
          )
        )
        .catch((error) => {
          console.error(`Failed to upload to Dropbox: ${error.error}`);
        });
      return;
    } else {
      return res.status(200).send({ message: "success" });
    }
  } catch (error) {
    console.log({
      status: error.status || 500,
      message: error.message,
    });
    return res.status(error.status || 500).send({
      status: error.status || 500,
      message: error.message,
    });
  }
});

module.exports = zoomRouter;
