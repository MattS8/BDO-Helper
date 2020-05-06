require('dotenv').config();
const csv = require('csv-parser');
const fs = require('fs');
const Discord = require('discord.js');
const bot = new Discord.Client();
const TOKEN = process.env.TOKEN;

var Members = new Map()

fs.createReadStream('Members.csv')
  .pipe(csv())
  .on('data', (row) => {
    console.log(row);
    Members.set(row.DiscordName, row)
  })
  .on('end', () => {
    console.log('CSV file successfully processed');
  });

bot.login(TOKEN);

bot.on('ready', () => {
  console.info(`Logged in as ${bot.user.tag}!`);
});

function getMemberFromName(name) {
  Members.forEach(member => {
    if (member.FamilyName == name | member.CharacterName == name)
      return member
  })

  return undefined
}

bot.on('message', message => {
    // Ignore other bot messages
    if (message.author.bot) return

    // Ignore non-command messages
    if (!message.content.startsWith(Config.identifier)) return

    // Splice command message
    const args = message.content.slice(1).trim().split(/ +/g)
    const command = args.shift().toLowerCase()

    if (command == "complete") {
      let character = args[0]
      if (character == undefined) {
        return message.channel.send("Invalid command. Please use the following format: ```" + Config.identifier + "completed <character/family name> <amount of silver from quest (can be written as '12mill')>```")
      }
      
      let memberData = getMemberFromName(character)
      if (memberData == undefined) {
        return message.channel.send("Couldn't find member with a Family Name or Character Name of '" + character + "'")
      }
      return undefined
    }
});
