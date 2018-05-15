const bearychat = require('bearychat');
const RTMClient = require('bearychat-rtm-client');
const RTMClientEvents = RTMClient.RTMClientEvents;
const WebSocket = require('ws');
const R = require('ramda');

const hubotToken = process.env.XIAO_X_TOKEN;

const http = new bearychat.HTTPClient(hubotToken);

const client = new RTMClient({
  url: async function() {
    const data = await http.rtm.start();
    return data.ws_host;
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



async function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function start() {
  let me = await http.user.me();
  let {data} = await listen('join_channel');

  async function reply(text, vchannelId) {
    await sendMessage(client, {
      vchannel_id: vchannelId || data.vchannel_id,
      text,
    });
  }

  async function replyPic(text, attachments, vchannelId) {
    await sendWithAttachment({
      vchannel_id: vchannelId || data.vchannel_id,
      text,
      attachments
    })
  }

  async function getChoice(choices, vchannelId) {
    let vid = vchannelId || data.vchannel_id;
    const condition = message => {
      return message.uid !== me.id && message.vchannel_id === vid && ((!choices || !choices.length) || choices.includes(message.text));
    };

    let {text} = await listen('channel_message', condition);

    await delay(1000);
    
    return text;
  }

  function getAnswer(answer){
    answer = R.trim(answer)
    if(R.contains(answer, ['yes', '是', '1'])){
      return true
    } else if (R.contains(answer, ['no', '否', '2'])) {
      return false
    }
    return false
  }

  async function a0() {
    await reply('现在有一个小 X 书的出版发行事业需要你来拯救！\n1. 不，我没有这个打算\n2. 好的，包在我身上');
    const text = await getChoice(['1', '2']);

    if (getAnswer(text)) {
      reply('Game over!');
      await a0();
    } else {
      await a1();
    }
  }

  async function a1() {
    await reply('1. 你需要一个团队来共同完成这项承载人类精神灵魂的伟大事业吗？(yes/no)');
    const text = await getChoice();

    if (getAnswer(text)) {
      await a2();
    } else {
      reply('对不起，没有这个选项');
      await a1();
    }
  }

  async function a2() {
    await reply('为避免全员牢底坐穿的尴尬场面，现在是否创建阅后即焚讨论空间? \n1. 私密讨论组\n2. 临时讨论组');

    const text = await getChoice();

    if (getAnswer(text)) {
      await a3();
    } else {
      // await a3();
    }
  }

  async function a3() {
    const suffix = Math.floor(Math.random() * 10000);
    const { name, vchannel_id: vchannelId, id: channelId } = await createChannel({ name: `小XBook_${suffix}` });
    const { member_uids: memberList } = await http.vchannel.info({ vchannel_id: data.vchannel_id });
    try {
      await Promise.all(memberList.map(uid => {
        return http.channel.invite({ channel_id: channelId, invite_uid: uid });
      }));
    } catch (e) {
      console.log(e);
    }
    await reply(`我们创建了 #${name}`);
    await a4(vchannelId);
  }

  async function a4(vchannelId) {
    await reply('现在有一本《熊瓶梅》需要完成，添加几位机器人同伴吗朋友？ \n1.  不，我们不需要\n2. 开始添（战）加（斗）', vchannelId);

    const text = await getChoice(void 0, vchannelId);

    if (getAnswer(text)) {
      await replyPic('小唐冷漠脸', [{
        title: 'title',
        text: 'text',
        color: '#ffa500',
        images: [
          {
            url: 'https://static.bearychat.com/Fk_k7cpJAw0ndzupUqfHO9a61BbW'
          }
        ],
      }], vchannelId);
      await a4(vchannelId);
    } else {
      await replyPic('小唐笑脸', [{
        title: 'title',
        text: 'text',
        color: '#ffa500',
        images: [
          {
            url: 'https://static.bearychat.com/FnByTujflbQ68lWmCW05pIWNci-R'
          }
        ],
      }], vchannelId);
      // await a4();
    }
  }

  await a0();
}

function createChannel({ name }) {
  return http.channel.create({ name, private: true });
}

function sendMessage(rtm, { vchannel_id, refer_key, text }) {
  return rtm.send({
    type: 'message',
    text,
    vchannel_id: vchannel_id,
    refer_key
  });
}

function sendWithAttachment({ vchannel_id, text, attachments }) {
  return http.message.create({ vchannel_id, text, attachments });
}
