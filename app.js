const { App } = require("@slack/bolt");
const { OpenAIApi, Configuration } = require("openai");
const dotenv = require("dotenv").config();
const { createEventAdapter } = require("@slack/events-api")
const { default: axios } = require("axios");
const slackSigningSecret = "716b82045665d019c6b925463fa26a2b";
const slackEvents = createEventAdapter(slackSigningSecret);
const port = 4000;
const { WebClient, LogLevel } = require("@slack/web-api");
const app = new App({
  token: "xoxb-4888952385430-4894288620645-iuM1a6vrEwYUE2yesGHPhPrI",
  signingSecret: "716b82045665d019c6b925463fa26a2b",
});
const configuration = new Configuration({
  apiKey: process.env.open_ai_key,
});
const openai = new OpenAIApi(configuration);
const client = new WebClient(
  "xoxb-4888952385430-4894288620645-iuM1a6vrEwYUE2yesGHPhPrI",
  {
    logLevel: LogLevel.DEBUG,
  }
);

// publishMessage function is used to send message to the slack channel when required
async function publishMessage(id, text) {
  try {
    const result = await app.client.chat.postMessage({
      token: "xoxb-4888952385430-4894288620645-iuM1a6vrEwYUE2yesGHPhPrI",
      channel: id,
      text: text,
    });
  } catch (error) {
    console.error(error);
  }
}
//ChannelCreated function is used to publish the message that the channel us created bt the user
async function ChannelCreated(userId) {
  console.log(userId)
  const userProfile = await axios.get(
    `https://slack.com/api/users.profile.get?user=${userId}`,
    {
      headers: {
        Authorization:
          "Bearer " +
          "xoxb-4888952385430-4894288620645-iuM1a6vrEwYUE2yesGHPhPrI",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  publishMessage(
    "C04S4U406NA",
    `@${userProfile.data.profile.real_name} created channel`
  ).then((d) => {
    console.log("sent message successfully");
  });
}
/*CreateChannel function is used to create a new channel when someone instruct in the channel to do so using opnai to generate function name in the message */ 
async function CreateChannel(userId, text) {
  console.log("Channel Creation Function Enter");
  // console.log(text);
  const result = await client.conversations.create({
    token: "xoxb-4888952385430-4894288620645-iuM1a6vrEwYUE2yesGHPhPrI",
    name: text,
    is_private: false,
  });

}
/*this function will extract rhe channel name specified in the text using openAi */
async function getChannelName(text) {
  console.log("Entered the getChannelName");
  try {
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `Get only Channel name from ${text}`,
      max_tokens: 100,
      temperature: 0.5,
    });
    console.log("hello");
    const channelName = response.data.choices[0].text.split("#")[1];
    console.log(channelName);
    return channelName;
  } catch (err) {
    console.log(err);
  }
}
//this function will extract all the mentions in the message and store it in the mentions
function extractMentions(text) {
  const pattern = /<@([A-Z0-9]+)>/g;
  const matches = text.match(pattern);
  const mentions = matches.map((match) => match.slice(2, -1));
  return mentions;
}
/*this function triggers when someone mention our app in messages */
slackEvents.on("app_mention", async (event) => {
  //if anyone want to create a channel then this if block will execute
  if (event.text.includes("Create Channel")) {
    console.log("Chaneel");
    const text = await getChannelName(event.text);
    const channelId = await CreateChannel(event.user, text);
    await ChannelCreated(event.user)
  } else if (event.text.includes("invite")) {
    //if any one want to invte someone to the channel then this will execute
    const mentions = extractMentions(event.text);
    console.log(mentions);
    const channelId = "C04S4U406NA";
    const result = await client.conversations
      .invite({
        channel: channelId,
        users: mentions[1],
      })
      .then(() => {
        console.log("Added SuccessFully");
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    //if anyone want to get some information
    const text = event.text;
    const resposne = openai
      .createCompletion({
        model: "text-davinci-003",
        prompt: text,
        max_tokens: 500,
        temperature: 1,
      })
      .then((response) => {
        publishMessage("C04S4U406NA", response.data.choices[0].text);
      })
      .catch((err) => {
        console.log(err);
      });
  }
  // console.log("Entered");
});

slackEvents.on("member_joined_channel", async (event) => {
  const userProfile = await axios.get(
    `https://slack.com/api/users.profile.get?user=${event.user}`,
    {
      headers: {
        Authorization:
          "Bearer " +
          "xoxb-4888952385430-4894288620645-iuM1a6vrEwYUE2yesGHPhPrI",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  publishMessage(event.channel, `Hello! ${userProfile.data.profile.real_name} welcome to the Channel`).then((data) => {
    console.log("message sent");
  });
});

//event occured when someone shared the link with the domain we mentioned in slack account
slackEvents.on("link_shared", async (event) => {
  console.log("Entered");
  const userProfile = await axios.get(
    `https://slack.com/api/users.profile.get?user=${event.user}`,
    {
      headers: {
        Authorization:
          "Bearer " +
          "xoxb-4888952385430-4894288620645-e2KJh4a4BZa1Wv7xqgwdag8Y",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  publishMessage(
    "C04S4U406NA",
    `@${userProfile.data.profile.real_name} shared a link`
  ).then((d) => {
    console.log("sent message successfully");
  });
});
//event occured when mew channel is created
slackEvents.on("channel_created", async (event) => {
  console.log(event)
  await ChannelCreated(event.channel.creator)
});

// scheduling a message
async function sched() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate());
  tomorrow.setMinutes(tomorrow.getMinutes() + 1);

  const channelId = "C04S4U406NA";
  try {
    const result = await client.chat.scheduleMessage({
      channel: channelId,
      text: "Looking towards the future",
      post_at: tomorrow.getTime() / 1000,
    });

    console.log(result);
  } catch (error) {
    console.error(error);
  }
}
(async () => {
  const server = await slackEvents.start(port);
  console.log(process.env.open_ai_key);
  console.log(`Listening for events on ${server.address().port}`);
})();
