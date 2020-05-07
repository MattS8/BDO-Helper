const auth = require('./auth.json')
const Discord = require('discord.js')
const Config = require('./config.json')
const bot = new Discord.Client();
const fs = require('fs')

var newAuth = undefined

var Members = new Map()

const version = 'v0.0.3'
console.log('-------- BDO Helper ' + version + ' --------')

function getMemberFromName(name) {
    Members.forEach(member => {
      if (member.FamilyName == name | member.CharacterName == name)
        return member
    })
  
    return undefined
  }

bot.login(auth.token);

bot.on('ready', () => {
    console.info(`Logged in as ${bot.user.tag}!`);

  });

bot.on('message', message => {
    // Ignore other bot messages
    if (message.author.bot) return

    // Ignore non-command messages
    if (!message.content.startsWith(Config.identifier)) return

    console.log("Recieved Message...")

    // Splice command message
    const args = message.content.slice(1).trim().split(/ +/g)
    const command = args.shift().toLowerCase()

    if (command == "complete" || command == "completed") {
        let silver = parseInt(args[0])
        if (Object.is(NaN, silver) || silver == undefined) {
            return message.channel.send("Invalid command. Please use the following format: ```" + Config.identifier + "completed <silver amount> <family name(s)> ```")
        }

        if (args[1] == undefined) {
            return message.channel.send("Invalid command. Please use the following format: ```" + Config.identifier + "completed <silver amount> <family name(s)> ```")
        }

        addCompletedQuest(message, [message.author.username].concat(args).join('|'))

        return undefined
    }

    if (command == "bing") {
        message.channel.send("bong!")
    }

    if (command == "bong") {
        message.channel.send("bing!")
    }
});

function fetchQuestLog(message, onComplete) {
    const sheets = google.sheets({ version: 'v4', auth: newAuth })
    sheets.spreadsheets.values.get(
        {
            spreadsheetId: Config.sheets.questLog.id,
            range: Config.sheets.questLog.name + "!A2:E",
        }, (err, res) => {
            if (err) {
                message.channel.send("Something went wrong. Please try again.")
                return console.log('    (fetchQuestLog) - The get request returned an error ' + err)
            }

            let rows = res.data.values
            if (rows == undefined) {
                console.log('    (fetchQuestLog) - No completed quests found!')
                rows = []
            }

            onComplete(rows)
        })

}

function addCompletedQuest(message, args) {
    let splitArgs = args.toString().split('|')
    let officer = splitArgs.shift().toString()
    let silverWithCommas = splitArgs.shift().toString()
    let silver = parseInt(silverWithCommas.replace(/,/g, ''))
    let characters = splitArgs

    console.log('    (addCompletedQuest) - Added a completed quest for ' + silver + ' silver by ' + characters.join(', ') + ' on ' + Date().toLocaleString('en-US', Config.dateFormat))

    let newCellValues = [characters.join(','), silver, officer, Date().toLocaleString('en-US', Config.dateFormat)]

    fetchQuestLog(message, (questLogs) => {
        let nextRowNumber = questLogs.length + 2
        const sheets = google.sheets({ version: 'v4', auth: newAuth })
        console.log("    (addCompletedQuest) - Next Row Number: " + nextRowNumber)
        sheets.spreadsheets.values.update(
            {
                spreadsheetId: Config.sheets.questLog.id,
                range: Config.sheets.questLog.name + "!A" + nextRowNumber + ":D" + nextRowNumber,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [newCellValues]
                }
            }, (err, res) => { 
                if (err) {
                    message.channel.send("Something went wrong. Please try again.")
                    return console.log('    (addCompletedQuest) - Failed to update sheets... ' + err)
                }

                message.channel.send({
                    embed: {
                        title: "Guild Quest Completed",
                        color: Config.questColor,
                        fields: [{
                            name: "" + characters + (splitArgs.length > 1 ? " have " : " has ") + "completed a quest." ,
                            value: "Guild has earned: **" + silverWithCommas + " silver**",
                            inline: true
                        }],
                        timestamp: new Date()
                    },
                })
            })
    })
}

// function fetchAllMemberInfo(message, onComplete, ... args) {
//     const sheets = google.sheets({ version: 'v4', auth: newAuth })
//     sheets.spreadsheets.values.get(
//         {
//             spreadsheetId: Config.sheets.members.id,
//             range: Config.sheets.members.name + "!A2:Y",
//         }, (err, res) => {
//             if (err) {
//                 return console.log('    (fetchAllMemberInfo) - The get request returned an error ' + err)
//             }

//             let rows = res.data.values
            
//             if (rows == undefined) {
//                 console.log("    (fetchAllMemberInfo) - Failed to fetch any member data...")
//                 onComplete(message, [], args)
//             }

//             console.log("    (fetchAllMemberInfo) - Fetched " + rows.length + " rows")

//             onComplete(message, rows, args)
            
//             return 
//         })
// }


const readline = require('readline')
const { google } = require('googleapis')

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const TOKEN_PATH = 'token.json'

function initializeBot(auth) {
    newAuth = auth
    bot.login(Config.token)
}

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err)
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), initializeBot)
})

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0])

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback)
        oAuth2Client.setCredentials(JSON.parse(token))
        callback(oAuth2Client)
    })
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    })
    console.log('Authorize this app by visiting this url:', authUrl)
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close()
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err)
            oAuth2Client.setCredentials(token)
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err)
                console.log('Token stored to', TOKEN_PATH)
            })
            callback(oAuth2Client)
        })
    })
}