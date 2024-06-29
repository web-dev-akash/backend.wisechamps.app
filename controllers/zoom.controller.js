const express = require("express");
const zoomRouter = express.Router();
const crypto = require("crypto");
const { Dropbox } = require("dropbox");
const stream = require("stream");
const moment = require("moment");
const { default: axios } = require("axios");
const fs = require("fs/promises");

const zoomIdToken = {
  1: "ZOOM_WEBHOOK_SECRET_TOKEN_1_2",
  3: "ZOOM_WEBHOOK_SECRET_TOKEN_3",
  4: "ZOOM_WEBHOOK_SECRET_TOKEN_4",
  5: "ZOOM_WEBHOOK_SECRET_TOKEN_5",
  6: "ZOOM_WEBHOOK_SECRET_TOKEN_6",
  7: "ZOOM_WEBHOOK_SECRET_TOKEN_7_8",
};

const dropboxPath = {
  1: "wclqgrade1@gmail.com",
  3: "wclqgrade3@gmail.com",
  4: "wclqgrade4@gmail.com",
  5: "wclqgrade5@gmail.com",
  6: "wclqgrade6@gmail.com",
  7: "wclqgrade7@gmail.com",
};

async function downloadChunk(recordingLink, start, end, downloadToken) {
  const response = await axios({
    url: recordingLink,
    method: "GET",
    responseType: "arraybuffer",
    headers: {
      Authorization: `Bearer ${downloadToken}`,
      Range: `bytes=${start}-${end}`,
    },
  });
  return response.data;
}

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

zoomRouter.post("/recording/notUsing", async (req, res) => {
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
    }

    if (data.event === "recording.completed") {
      const UPLOAD_FILE_SIZE_LIMIT = 150 * 1024 * 1024;
      const files = data.payload.object.recording_files;
      const recording = files.find(
        (file) => file.recording_type === "shared_screen_with_speaker_view"
      );
      const recordingDate = moment(recording.recording_start).format(
        "DD-MM-YYYY"
      );
      const fileSize = recording.file_size;
      const fileExtension = recording.file_extension;
      const recordingPath = `/Zoom Recording Math Olympiad/${dropboxPath[id]}/Grade ${id} ${recordingDate}.${fileExtension}`;
      const recordingLink = recording.download_url;
      const downloadToken = data.download_token;

      const dropboxAccessToken = await getOptimizedAccessToken();
      const dbx = new Dropbox({ accessToken: dropboxAccessToken });
      if (fileSize < UPLOAD_FILE_SIZE_LIMIT) {
        const fileBuffer = await downloadChunk(
          recordingLink,
          0,
          fileSize - 1,
          downloadToken
        );

        dbx
          .filesUpload({ path: recordingPath, contents: fileBuffer })
          .then(function (response) {
            console.log(response);
          })
          .catch(function (error) {
            console.log("Dropbox Error");
            console.error(error.error || error);
          });
      } else {
        const maxBlob = 150 * 1024 * 1024;
        let offset = 0;
        let sessionId = null;

        while (offset < fileSize) {
          const chunkSize = Math.min(maxBlob, fileSize - offset);
          const chunk = await downloadChunk(
            recordingLink,
            offset,
            offset + chunkSize - 1,
            downloadToken
          );

          if (offset === 0) {
            const response = await dbx.filesUploadSessionStart({
              close: false,
              contents: chunk,
            });
            sessionId = response.result.session_id;
          } else if (offset + chunkSize < fileSize) {
            const cursor = { session_id: sessionId, offset };
            await dbx.filesUploadSessionAppendV2({
              cursor,
              close: false,
              contents: chunk,
            });
          } else {
            const cursor = { session_id: sessionId, offset };
            const commit = {
              path: recordingPath,
              mode: "add",
              autorename: true,
              mute: false,
            };
            await dbx.filesUploadSessionFinish({
              cursor,
              commit,
              contents: chunk,
            });
          }
          offset += chunkSize;
        }
        console.log(`Large file Uploaded to Dropbox at ${recordingPath}`);
      }

      return res.status(200).send({
        status: "success",
        recording: recording,
      });
    }
    return res.status(200).send({
      message: "success",
    });
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
