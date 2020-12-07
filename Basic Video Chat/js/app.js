/* global OT API_KEY TOKEN SESSION_ID SAMPLE_SERVER_BASE_URL */

var apiKey;
var sessionId;
var token;

const publisherOptions = {
  publishVideo: false,
  insertMode: 'append',
  width: '100%',
  height: '100%'
};

const videoSelector = document.querySelector('#video-source-select');
let publisher;
let session;

function populateDeviceSources(selector, kind) {
  OT.getDevices((err, devices) => {
    if (err) {
      alert('getDevices error ' + err.message);
      return;
    }
    let index = 0;
    selector.innerHTML = devices.reduce((innerHTML, device) => {
      if (device.kind === kind) {
        index += 1;
        return `${innerHTML}<option value="${device.deviceId}">${device.label || device.kind + index}</option>`;
      }
      return innerHTML;
    }, '');
  });
}

OT.getUserMedia().then((stream) => {
  populateDeviceSources(videoSelector, 'videoInput');
  stream.getTracks().forEach(track => track.stop());
});

videoSelector.addEventListener('change', () => {
  session.unpublish(publisher);
  const newPublisherOptions = { ...publisherOptions, videoSource: event.target.value };
  publisher = OT.initPublisher('publisher', newPublisherOptions, (error) => {
    if (error) {
      handleError(error);
      return;
    }

    session.publish(publisher, handleError);
    publisher.publishVideo(true);
  });
});

function handleError(error) {
  if (error) {
    console.error(error);
  }
}

function initializeSession() {
  session = OT.initSession(apiKey, sessionId);

  // Subscribe to a newly created stream
  session.on('streamCreated', function streamCreated(event) {
    var subscriberOptions = {
      insertMode: 'append',
      width: '100%',
      height: '100%'
    };
    session.subscribe(event.stream, 'subscriber', subscriberOptions, handleError);
  });

  session.on('sessionDisconnected', function sessionDisconnected(event) {
    console.log('You were disconnected from the session.', event.reason);
  });

  publisher = OT.initPublisher('publisher', publisherOptions, handleError);

  // Connect to the session
  session.connect(token, function callback(error) {
    if (error) {
      handleError(error);
    } else {
      // If the connection is successful, publish the publisher to the session
      session.publish(publisher, handleError);
      publisher.publishVideo(true);
    }
  });
}

// See the config.js file.
if (API_KEY && TOKEN && SESSION_ID) {
  apiKey = API_KEY;
  sessionId = SESSION_ID;
  token = TOKEN;
  initializeSession();
} else if (SAMPLE_SERVER_BASE_URL) {
  // Make an Ajax request to get the OpenTok API key, session ID, and token from the server
  fetch(SAMPLE_SERVER_BASE_URL + '/session').then(function fetch(res) {
    return res.json();
  }).then(function fetchJson(json) {
    apiKey = json.apiKey;
    sessionId = json.sessionId;
    token = json.token;

    initializeSession();
  }).catch(function catchErr(error) {
    handleError(error);
    alert('Failed to get opentok sessionId and token. Make sure you have updated the config.js file.');
  });
}
