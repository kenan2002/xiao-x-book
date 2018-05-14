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

  async function reply(text) {
    await sendMessage(client, {
      vchannel_id: data.vchannel_id,
      text
    });
  }

  async function getChoice() {
    let {text} = await listen('channel_message', message => message.text === '1' || message.text === '2' || message.text === '3');
    return text;
  }

  async function a0() {
    await reply('现在有一个小 X 书的出版发行事业需要你来拯救！\n1. 不，我没有这个打算\n2. 好的，包在我身上');
    const text = await getChoice();

    if (text === '1') {
      reply('Game over!');
      await a0();
    } else {
      await a1();
    }
  }

  async function a3() {
  }

  async function a4() {
  }

  async function a1() {
    reply('1. 我是一个独来独往的小 X 书创建者\n2. 我需要一个团队来共同完成这项承载人类精神灵魂的伟大事业');
    const text = await getChoice();

    if (text === '1') {
      await a3();
    } else {
      await a4();
    }
  }

  await a0();
}

function sendMessage(rtm, { vchannel_id, refer_key, text }) {
  return rtm.send({
    type: 'message',
    text,
    vchannel_id: vchannel_id,
    refer_key
  });
}
