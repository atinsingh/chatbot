"use strict";
/**
 * This section should include all the dependencies for bot
 */

var restify = require('restify'); // restify is needed for endpoint, alternatively express.js can also be used
var builder = require('botbuilder'); //botbuilder sdk - Mandatory lib
var config = require('./config/appConfig.json'); // chatbot configuration ex - LUIS url, Bing URL etc
var users = require("./data/data.json"); // Demo Data , can be removed when bot is fully integrated
var msgs = require("./config/messages.json"); //Message array bot requires in demo.
var UTILS = require("./utility"); // utlity function and api call 
var _ = require("lodash"); // lodash is required for quick object & array utils.
var moment = require("moment");
var path = require('path');
var LOG = require("./log");

//LUIS Model to get the intents
var model = config.luisURL + config.luisPath + "?subscription-key=" + config.luisSubcriptionKey + "&verbose=true+&spellCheck=true&q=";

/*
 * This section will create a simple restify server to listen to messages recived by bot
 * Port will be taken from env variable.
 *
 */
var app = 'thsi is good'

var server = restify.createServer();
var port = process.env.port || process.env.PORT || 3978;
server.listen(port, function () {
    //console.info(Date() +"-"+ path.basename(__filename)+":"+"Bot Server Started  at port %d ", port);
    LOG.info(path.basename(__filename), "server.listen", "Bot Server Started port " + port);
});

/*
 * This section is create a Universal chatbot using Microsoft Bot Builder framework Node JS SDK
 * Bot need an Microsoft APP ID and App Password.
 * App ID and password will be part of App Config
 */

var connectionConfiguration = new builder.ChatConnector({
    appId: config.appId,
    appPassword: config.appPassword,
    autoBatchDelay: 200
});

//Create a new bot instance 
var bot = new builder.UniversalBot(connectionConfiguration);

//create a new rest end point to listen the messages . 
server.post("/api/messages", connectionConfiguration.listen());

/*
 * Set Up recongizer using Microsoft BotFramework,
 * Set up all the waterfall dialog routers that matches the intents defined in LUIS
 *
 */

var recognizer = new builder.LuisRecognizer(model);

//create intent dialog
var dialog = new builder.IntentDialog({
    recognizers: [recognizer]
});

bot.dialog('/', dialog);

// Match all Routes

dialog.matches('BeginConversation', '/start');
dialog.matches('MissedTechnician', '/missedtechnician');
dialog.matches('ScheduleTechnician', '/schedule');
dialog.matches('CancelOperation', '/cancelme');
dialog.onDefault(builder.DialogAction.send(msgs.notmatched));

/*
 *  This should be called before, we begin our conversation
 *  This function will will build a profile.
 * 
 * 
 */
//
dialog.onBegin(function (session, args, next) {
    if (!session.userData.accountNo) {
        session.beginDialog("/profile");
    } else {
        next();
    }
});

/*
 * Dialog should be called when user return back  and profile is already stored in the
 * session data of conversation.
 * It should be called whenever LUIS is returning intent as "BeginConversation"
 */
bot.dialog("/start", [function (session, args, next) {
    session.sendTyping();
    if (!session.userData.user) {
        session.beginDialog("/profile");
    } else {
        session.send(msgs.welcomeBack, session.userData.user.accountName);
        session.cancelDialog();
    }
}]);

/*
 * Dialoag simulates the waterfall conversation for TM Forum catalyst Scenario 5
 * Dialog should
 *
 *
 */

bot.dialog("/missedtechnician", [function (session, args, next) {
    /**
     * Session already have intent set by LUIS Recogniser, so we have to now fetch sentiment
     * pull sentiment
     */

    if (!session.userData.user) {
        session.beginDialog("/profile");
    } else {

        //Get Sentiment what user is saying
        UTILS.getSentiment(session.message.text, function (data) {
            args.sentiment = data;
            next(args);
        });
    }
}, function (session, args, next) {
    console.log(args);
    session.userData.schduleDone = false;
    session.sendTyping();
    session.send(msgs.missedtechnicianDialog.step1Dialog);
    session.sendTyping();
    setTimeout(function () {
        var activeAccount = session.userData.user;
        if (activeAccount !== null) {
            // Call pointis to get the action;
            session.send(msgs.missedtechnicianDialog.step2Dialog, activeAccount.appointmentDate, activeAccount.appoitmentTime, activeAccount.issuetag);
            session.sendTyping();
            session.send(msgs.missedtechnicianDialog.step3DialogOffer);
            next(args);
        } else {
            session.send("Sorry I couldn't pull your records, please provide your details again");
            session.userData = {};
            session.beginDialog("/profile");
        }
    }, 5000);
}, function (session, args, next) {
    session.sendTyping();
    var msg = new builder.Message(session).addAttachment(createHeroCard(session, args));
    builder.Prompts.choice(session, msg, "Accept|Decline");
}, function (session, results, next) {
    if (!results.response) {
        session.sendTyping();
        session.send("Please provide your choice");
    }
    if (results.response.entity === "Accept") {

        session.sendTyping();
        session.send(msgs.missedtechnicianDialog.step5OfferAcceptance);
        session.sendTyping();
        session.sendTyping();
        session.sendTyping();
        session.send(msgs.missedtechnicianDialog.step6BeginSchedule);
        session.sendTyping();
        session.beginDialog("/schedule");
    } else {
        // Look for another offer for this guy.
        session.send(msgs.missedtechnicianDialog.step5OfferDecline);
        session.beginDialog("/schedule");
    }
}, function (session) {
    session.endDialog("Thank you for contacting Bell Canada");
}]).triggerAction({
    matches: 'MissedTechnician',
    onInterrupted: function onInterrupted(session) {
        session.send('How may I help you today ?');
        session.endDialog();
    }
}).cancelAction({
    matches: 'cancel',
    onDefault: function onDefault() {
        sessionStorage.send("Thanks, I'll cancel the details and will not proceed with scheduling");
        session.endDialog();
    }
});

/*
 * Handle the schedule new appoitment 
 * 
 * 
 * 
 */
bot.dialog("/schedule", [function (session, args, next) {
    if (!session.userData.user) {
        session.beginDialog("/profile");
    } else {
        if (session.userData.schduleDone) {
            builder.Prompts.choice(session, " I have found that you recently booked an appoitment, would like to cancel previous one and start new ?", "YES|NO", { listStyle: 3 });
        } else {
            next();
        }
    }
}, function (session, results) {
    if (results.response) {
        if (results.response.entity == "YES") {
            session.userData.schduleDone = false;
            builder.Prompts.text(session, msgs.askAppoitment);
        } else {
            session.send("Good Bye");
            session.endDialog();
            session.cancelDialog();
            //session.beginDialog("/cancelme",{"response":results.response, "jumpstep":true});
        }
    } else {
        builder.Prompts.text(session, msgs.askAppoitment);
    }
}, function (session, results, next) {

    recognizer.recognize(session.toRecognizeContext(), function (err, data) {

        //check sentiment now
        UTILS.getSentiment(session.message.text, function (sentiment) {
            data.sentiment = sentiment;
            next(data);
        });
    });
}, function (session, args, next) {
    session.send("Let me analyse your response.");
    LOG.info(path.basename(__filename), "/schedule", "Intent and Emotion Got from LUIS and BING ---");
    LOG.info(path.basename(__filename), "schedule", JSON.stringify(args));
    if (args.intent === 'CancelOperation') {
        //builder.Prompts.confirm(session,"Are you sure to cancel the appointment process ?");
        session.beginDialog("/cancelme");
        session.cancelDialog("/schedule");
    } else {
        if (args.intent === 'None') {
            LOG.error("Matched with intent NONE");
            session.send("I am sorry, I didn't understand your message, please try again");
            session.cancelDialog().beginDialog("/schedule");
            return;
        }
    }
    console.log("Entities lengh is +++++++++ %d", args.entities.length);
    if (args.entities.length == 0) {
        session.send("Sorry I couldn't find a date in your response");
        session.send(msgs.askAppoitment);
    } else {
        var scheduleDate = builder.EntityRecognizer.findAllEntities(args.entities, 'builtin.datetime.date');
        var appointmentDate = void 0;
        if (_.isEmpty(scheduleDate)) {
            //the time from the entities returned by LUIS
            scheduleDate = builder.EntityRecognizer.findAllEntities(args.entities, 'builtin.datetime.time');
            //print entity for debug
            LOG.info("app.js", "schedule", "scheduleed date is" + scheduleDate);
            //parse this entity using custom function as utility may be in the form as XXX-XXX-TMO
            UTILS.dateTimeDateMoments(scheduleDate, 'builtin.datetime.time');
            appointmentDate = builder.EntityRecognizer.resolveTime(scheduleDate);
            //}
            LOG.debug("app.js", "schedule", "appoitment date is" + appointmentDate);
        } else {
            if (!appointmentDate) {
                //use custom parser
                LOG.debug("Parsing entity with custom parser as I need date now");
                UTILS.dateTimeDateMoments(scheduleDate);
                appointmentDate = builder.EntityRecognizer.resolveTime(scheduleDate, 'builtin.datetime.date');
                LOG.debug("app.js", "schedule", "appoitment date is" + appointmentDate);
            }
        }
        var scheduleTime = builder.EntityRecognizer.findAllEntities(args.entities, 'builtin.datetime.time');
        // console.log("Schedule time");
        LOG.debug("app.js", "schedule", "Schedule Time is " + scheduleTime);
        if (_.isEmpty(scheduleTime)) {
            scheduleTime = builder.EntityRecognizer.findAllEntities(args, 'builtin.datetime.date');
            UTILS.dateTimeDateMoments(scheduleTime, 'builtin.datetime.date');
        } else {
            UTILS.dateTimeDateMoments(scheduleTime, 'builtin.datetime.time');
        }

        var time = [];
        var fromTime = void 0;
        var toTime = void 0;
        if (scheduleTime.length > 1) {
            scheduleTime.forEach(function (entity) {
                var data = [entity];
                time.push(data);
            });
            fromTime = builder.EntityRecognizer.resolveTime(time[0]);
            toTime = builder.EntityRecognizer.resolveTime(time[1]);
        } else {
            fromTime = builder.EntityRecognizer.resolveTime(scheduleTime);
            toTime = fromTime;
        }
        //console.log("From time");
        //console.log(fromTime);
        //let slots = 
        session.dialogData.slots = UTILS.getFreeslots(appointmentDate, fromTime, toTime);;
        builder.Prompts.choice(session, "Below are list of slots available, kindly click a slot to fix appointment", session.dialogData.slots, { listStyle: 3 });
      
    }

    session.sendTyping();
}, function (session, results) {
    // Use this function to book a slot for the user.
    if (results.response) {
        session.send("Thank you, I have booked an appotment for your on %s, at %s ", session.dialogData.slots[results.response.entity].date, session.dialogData.slots[results.response.entity].starttime);

        /*
         * Temp code will be removed, update the data of new appointment;
         *
         */

        users.accounts.forEach(function (account) {
            if (account.accountNumber === session.userData.user.accountNumber) {
                account.appointmentDate = session.dialogData.slots[results.response.entity].date;
                account.appoitmentTime = session.dialogData.slots[results.response.entity].starttime;
            }
        });

        session.userData.schduleDone = true;
        session.send("Good bye");
        session.endDialog();
    } else {
        session.send("Sorry I didn't understand you, kindly retry");
    }
}]).cancelAction({
    matches: 'cancel',
    onDefault: function onDefault() {
        sessionStorage.send("Thanks, I'll cancel the details and will not proceed with scheduling");
        session.endDialog();
    }
});

bot.dialog("/cancelme", [function (session) {

    builder.Prompts.confirm(session, msgs.cancelPrompt, { listStyle: builder.ListStyle["button"] });
}, function (session, results) {
    console.log("Going to cancell current operations");
    if (results.response) {
        //console.log(results.response);
        if (results.response) {
            //console.log("Cancelling it");
            session.send("Going to cancel current operations");
            session.clearDialogStack("Cancelled operation");
            session.endDialog();
        } else {
            console.log("Cancelling in else of results");
            session.send("Aborting cancellation process.");
            session.cancelDialog();
        }
    }
}]);

/*
 * This dialog will be used to gather the customer account number and pin
 * A call to rest end point should be made to validate the account number
 * 
 * 
 */

// Take the NXT account number and pin in this dialog and look up user account and authenticate user and set up his name in session;
bot.dialog("/profile", [function (session) {
    session.sendTyping();
    if (!session.userData.accountCheckfailed) {
        builder.Prompts.number(session, msgs.profileDialog.welcomeChkAccount);
    } else {
        builder.Prompts.number(session, msgs.profileDialog.revalidateAccount);
    }
}, function (session, results, next) {
    //Set User Account Number in memory
    session.userData.accountNo = results.response;
    //session.userData.name =  UTILS.pullAccountDetails(results.response).name;
    next();
}, function (session) {
    builder.Prompts.number(session, msgs.profileDialog.welcomPIN);
}, function (session, results) {
    session.sendTyping();
    session.userData.accountPin = results.response;
    session.send(msgs.waitValidate);
    //call validate account number
    session.userData.user = UTILS.pullAccountDetails(session.userData.accountNo, session.userData.accountPin);
    LOG.info(session.userData.user);
    session.sendTyping();
    if (session.userData.user == null) {
        session.userData.accountCheckfailed = true;
        session.send(msgs.profileDialog.validationFailed);
        session.cancelDialog().beginDialog("/profile");
    } else {
        session.send("Hi %s How may I help you today?", session.userData.user.accountName);
        session.endDialog();
    }
}]);

/*
 *  Create offer Card based on the input from Pointis/
 * 
 * 
 */

function createHeroCard(session, args) {

    var defaultCard = new builder.HeroCard(session).title('$20 VOD Coupon').text('Enjoy the VOD content').buttons([builder.CardAction.postBack(session, "Accept", "Accept"), builder.CardAction.postBack(session, "Decline", "Decline")]);
    if (!_.isEmpty(args)) {
        LOG.debug("Got following argulement ", JSON.stringify(args));
        var offer = UTILS.getNextBestOffer(session.userData.user.accountNumber, args.intent, args.sentiment.sentiment);
        LOG.debug("Offer Returned from Pointis", JSON.stringify(offer));
        if (!_.isEmpty(offer)) {
            defaultCard = new builder.HeroCard(session).title(offer[0].offer_tag).text(offer[0].offer_details).buttons([builder.CardAction.postBack(session, "Accept", "Accept"), builder.CardAction.postBack(session, "Decline", "Decline")]);
        }
    }
    return defaultCard;
}

/*
 *
 *
 */

/*
 * Have to call luis for intent and entities on each promt
 * 
 *
 */

// function routeMessages(session,intentObj) {
//     LOG.info("I am routing message for intent");
//     LOG.info(intentObj);
//     if (_.isMatch(intentObj.intent, "CancelOperation")) {
//         // session.cancelDialog();
//         session.beginDialog("/cancel");
//     } else if (_.isMatch(intentObj.intent, "ScheduleTechnician")) {
//         //session.cancelDialog();
//         session.beginDialog("/schedule", intentObj);
//     } else if (_.isMatch(intentObj.intent, "BeginConversation")) {
//         //session.cancelDialog();
//         session.beginDialog("/start");
//     } else if (_.isMatch(intentObj.intent, "MissedTechnician")) {
//         //session.cancelDialog();
//         session.beginDialog("/missedtechnician" , JSON.parse(intentObj));
//     } else {
//         session.beginDialog("/profile");
//     }

// }
