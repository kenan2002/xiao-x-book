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
  start();
});

client.on(RTMClientEvents.OFFLINE, function() {
  console.log('RTM offline');
});

client.on(RTMClientEvents.EVENT, function(message) {
  // console.log('event message received: ', message);
});

async function listen(type, condition) {
  return new Promise(resolve => {
    client.on(RTMClientEvents.EVENT, handler);

    function conditionMet(message) {
      return !condition || condition(message);
    }

    function handler(message) {
      if (message.type === type && conditionMet(message)) {
        resolve(message);
        client.removeListener(RTMClientEvents.EVENT, handler);
      }
    }
  });
}

async function start() {
  let {data} = await listen('channel_visible');
  await sendMessage(client, {
    vchannel_id: data.vchannel_id,
    text: '现在有一个小 X 书的出版发行事业需要你来拯救！\n1. 不，我没有这个打算\n2. 好的，包在我身上',
  });
  let {text} = await listen('channel_message', message => message.text === '1' || message.text === '2');
  console.log(text);
  if (text === '1') {
    await sendMessage(client, {
      vchannel_id: data.vchannel_id,
      text: 'Game over!',
    });
  } else {
    await sendMessage(client, {
      vchannel_id: data.vchannel_id,
      text: '还没有实现',
    });
  }
}

function sendMessage(rtm, { vchannel_id, refer_key, text }) {
  return rtm.send({
    type: 'message',
    text,
    vchannel_id: vchannel_id,
    refer_key
  });
}
