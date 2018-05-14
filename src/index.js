const bearychat = require('bearychat');
const RTMClient = require('bearychat-rtm-client');
const RTMClientEvents = RTMClient.RTMClientEvents;
const WebSocket = require('ws');

const hubotToken = process.env.XIAO_X_TOKEN;

const client = new RTMClient({
  url: function() {
    return bearychat.rtm.start({token: hubotToken })
      .then(function (resp) {return resp.json()})
      .then(function (data) {return data.ws_host});
  },
  WebSocket: WebSocket
});

client.on(RTMClientEvents.ONLINE, function() {
  console.log('RTM online');
});

client.on(RTMClientEvents.OFFLINE, function() {
  console.log('RTM offline');
});

client.on(RTMClientEvents.EVENT, function(message) {
  console.log('event message received: ', message);
});

client.send({
  // your message body
});
