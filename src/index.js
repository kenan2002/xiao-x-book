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

  async function addRobot(index, vchannelId, text, imgUrl) {
    await reply(`[加第${index}个机器人](/dashboard/robots)`, vchannelId);

    await listen('new_robot');

    await reply(`添加成功`, vchannelId);

    await replyPic(text, [{
      color: '#ffa500',
      images: [{
          url: imgUrl
        }],
    }], vchannelId);
  }

  async function a0() {
    await replyPic('现在有一个小 X 书的出版发行事业需要你来拯救！', [{
      title: '1. 不，我没有这个打算',
      color: '#ffa500',
      images: [{
          url: 'https://static.bearychat.com/Fv1H48wKUD7iPmzdfaiebur3WVLy?imageView2/1/w/792/h/482'
        }],
    },{
      title: '2. 好的，包在我身上',
      color: '#ffa500',
      images: [{
          url: 'https://static.bearychat.com/FkVH_6YZeOru8Z3aFjZCPPLzd-Is?imageView2/1/w/792/h/482'
        }],
    }]);

    const text = await getChoice(['1', '2']);

    if (getAnswer(text)) {
      await replyPic('Game Over', [{
        color: '#ffa500',
        images: [{
            url: 'https://static.bearychat.com/FnByTujflbQ68lWmCW05pIWNci-R'
        }],
      }]);
      await a0();
    } else {
      await a1();
    }
  }

  async function a1() {
    await replyPic('你需要一个团队来共同完成这项承载人类精神灵魂的伟大事业吗？(yes/no)', [{
      color: '#ffa500',
      images: [{
          url: 'https://static.bearychat.com/FgRVeBE0xc9HI7CbJxXC0xUvZJN3?imageView2/1/w/792/h/482'
        }],
    }]);

    const text = await getChoice();

    if (getAnswer(text)) {
      await a2();
    } else {
      await replyPic('对不起，没有这个选项', [{
        color: '#ffa500',
        images: [{
          url: 'https://static.bearychat.com/FnByTujflbQ68lWmCW05pIWNci-R'
          }],
      }]);
      await a1();
    }
  }

  async function a2() {
    await replyPic('为避免全员牢底坐穿的尴尬场面，现在是否创建阅后即焚讨论空间?', [{
      title: '1. 私密讨论组',
      color: '#ffa500',
      images: [{
          url: 'https://static.bearychat.com/Fu91nzw0ovh5o2yMsYhWIHqBMC3S?imageView2/1/w/792/h/482'
        }],
    },{
      title: '2. 临时讨论组',
      color: '#ffa500',
      images: [{
          url: 'https://static.bearychat.com/Fog5DysIzBJrtsvaflke5ln_96ZS?imageView2/1/w/792/h/482'
        }],
    }]);

    const text = await getChoice(['1', '2']);

    if (getAnswer(text)) {
      await a3(false);
    } else {
      await a3(true);
    }
  }

  async function a3(isSession) {
    const suffix = Math.floor(Math.random() * 10000);
    const name = `小XBook_${suffix}`;
    const { member_uids: memberList } = await http.vchannel.info({ vchannel_id: data.vchannel_id });
    let vchannelId;
    if (isSession) {
      const { vchannel_id: vid } = await http.session_channel.create({ name, member_uids: memberList });
      vchannelId = vid;
    } else {
      const { vchannel_id: vid, id: channelId } = await createChannel({ name });
      try {
        await Promise.all(memberList.map(uid => {
          return http.channel.invite({ channel_id: channelId, invite_uid: uid });
        }));
      } catch (e) {
        console.log(e);
      }
      await reply(`我们创建了 #${name}`);
      vchannelId = vid;
    }

    await a4(vchannelId, memberList);
  }

  async function a4(vchannelId, memberList) {
    const mentions = memberList && memberList.map(id => `@<=${id}=>`).join(' ');

    let text = '现在有一本《熊瓶梅》需要完成，添加几位机器人同伴吗朋友？';
    if (mentions) {
      text = mentions + '\n' + text;
    }

    await replyPic(text, [{
      color: '#ffa500',
      images: [{
          url: 'https://static.bearychat.com/FmysW-JUhfK7CYU5M2XyOYLROHkz?imageView2/1/w/792/h/482'
        }],
    },{
      title: '1. 开始添（战）加（斗）',
      color: '#ffa500',
      images: [{
          url: 'https://static.bearychat.com/FlEWeHuvRq-ig8DciUNkejARZd9g?imageView2/1/w/792/h/482'
        }],
    },{
      title: '2.  不，我们不需要',
      color: '#ffa500',
      images: [{
          url: 'https://static.bearychat.com/Fv1H48wKUD7iPmzdfaiebur3WVLy?imageView2/1/w/792/h/482'
        }],
    }], vchannelId);
    const answer = await getChoice(void 0, vchannelId);

    if (!getAnswer(answer)) {
      await replyPic('小唐：冷漠.jpg', [{
        color: '#ffa500',
        images: [{
            url: 'https://static.bearychat.com/Fr0zWbm0F2axu21C2vrGr_XbYEjp'
          }],
      }], vchannelId);
      await a4(vchannelId);
    } else {
      
      await addRobot(1, vchannelId, `小唐：很好，继续.jpg`, 'https://static.bearychat.com/FiQfl5EKjzW9wQaTXnjP5O5QVF_J?imageView2/2/w/200');
      await addRobot(2, vchannelId, `小唐：不错，勇士你再来.jpg`, 'https://static.bearychat.com/FpCaD4DpkwZsiUugFtb9Y6QncZav?imageView2/2/w/200');
      await addRobot(3, vchannelId, `小唐：此处有通关音效.jpg`, 'https://static.bearychat.com/FiawOlqLo4s8mnSSC9Uu09JEuetl?imageView2/2/w/200');
      
      await replyPic('爸爸！', [{
        color: '#ffa500',
        images: [{
            url: 'https://static.bearychat.com/FnByTujflbQ68lWmCW05pIWNci-R'
          }],
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
