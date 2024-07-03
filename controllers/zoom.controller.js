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

const streamToDropbox = async (
  recordingUrl,
  dropboxPath,
  fileSize,
  dropboxAccessToken,
  downloadToken
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
    const data = await dbx.filesUpload({
      path: dropboxPath,
      contents: fileBuffer,
    });
    return {
      status: 200,
      data: data,
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
    console.log(`Large file uploaded to Dropbox at ${dropboxPath}`);
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
    }

    if (data.event === "recording.completed") {
      res.status(200).send({ message: "success" });
      const files = data.payload.object.recording_files;
      const recording = files.find(
        (file) => file.recording_type === "shared_screen_with_speaker_view"
      );
      if (!recording || !recording.recording_start) {
        return;
      }
      const recordingDate = moment(recording.recording_start).format(
        "Do MMM h:mm A"
      );
      const fileSize = recording.file_size;
      const fileExtension = recording.file_extension;
      const recordingPath = `/Zoom Recording Math Olympiad/${dropboxPath[id]}/Grade ${id} ${recordingDate}.${fileExtension}`;
      const recordingLink = recording.download_url;
      const downloadToken = data.download_token;
      const dropboxAccessToken = await getOptimizedAccessToken();
      const uploadStatus = await streamToDropbox(
        recordingLink,
        recordingPath,
        fileSize,
        dropboxAccessToken,
        downloadToken
      );
      return;
    }
    return res.status(200).send({ message: "success" });
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
