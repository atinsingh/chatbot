const restify =  require('restify');
const builder = require('botbuilder');
const querystring = require("querystring");
const config = require('./appConfig.json');
const users =  require("./data.json");
const msgs  =  require("./messages.json");
const utilites = require("./utility");
const _ = require("underscore");
const moment = require("moment");
const path = require('path');
const LOG = require("./log");

//Replace this with config soon.
let model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/899a5581-0c98-4e96-a389-13a6080eabf8?subscription-key=9c2eaf8becea42ef9a98c0d7e22ffa65&verbose=true&q=';



/*
 * This section will create a simple restify server to listen to messages recived by bot
 * Port will be taken from env variable.
 *
 */

let server = restify.createServer();
let port = process.env.port||process.env.PORT||3978;
server.listen(port,()=>{
     //console.info(Date() +"-"+ path.basename(__filename)+":"+"Bot Server Started  at port %d ", port);
    LOG.info(path.basename(__filename),"server.listen", "Bot Server Started port "+port);
});



/*
 * This section is create a Universal chatbot using Microsoft Bot Builder framework Node JS SDK
 * Bot need an Microsoft APP ID and App Password.
 * App ID and password will be part of App Config
 */


let connectionConfiguration = new builder.ChatConnector({
    appId:config.appId,
    appPassword:config.appPassword,
    autoBatchDelay:300
});

let bot =  new builder.UniversalBot(connectionConfiguration);

server.post("/api/messages",connectionConfiguration.listen());



/*
 * Set Up recongizer using Microsoft BotFramework,
 * Set up all the waterfall dialog routers that matches the intents defined in LUIS
 *
 */

let recognizer = new builder.LuisRecognizer(model);

let dialog = new builder.IntentDialog({
    recognizers :[recognizer]
});

bot.dialog('/',dialog);


// Match all Routes

dialog.matches('BeginConversation','/start');
dialog.matches('MissedTechnician','/missedtechnician');
dialog.matches('ScheduleTechnician','/schedule');
dialog.matches('CancelOperation','/cancelme');
dialog.onDefault(builder.DialogAction.send(msgs.notmatched));





/*
 *  This should be called before, we begin our conversation
 *  This function will will build a profile.
 * 
 * 
 */  

dialog.onBegin(
    (session, args, next) => {
     if(!session.userData.accountNo){
         session.beginDialog("/profile");
     }else{
         next();
     }
    }
);


/*
 * Dialog should be called when user return back  and profile is already stored in the
 * session data of conversation.
 * It should be called whenever LUIS is returning intent as "BeginConversation"
 */
bot.dialog("/start", [
    (session,args,next)=>{
        session.sendTyping();
        if(!session.userData.name){
            session.beginDialog("/profile");
        }else{
        session.send(msgs.welcomeBack, session.userData.name);
        session.cancelDialog();
        }
    }
]);



/*
 * Dialoag simulates the waterfall conversation for TM Forum catalyst Scenario 5
 * Dialog should
 *
 *
 */

bot.dialog("/missedtechnician",[
    (session,results,next)=>{
        if(!session.userData.user){
            session.beginDialog("/profile");
        }else{
            next();
        }
       },
    (session,results,next)=>{
        session.userData.schduleDone=false;
        session.sendTyping();
        session.send(msgs.missedtechnicianDialog.step1Dialog);
        session.sendTyping();
        setTimeout(()=> {
            let schedule = session.userData.user;
            if (schedule !== null) {
                // Call pointis to get the action;
                session.send(msgs.missedtechnicianDialog.step2Dialog, schedule.appointmentDate, schedule.appoitmentTime, schedule.issuetag);
                session.sendTyping();
                session.send(msgs.missedtechnicianDialog.step3DialogOffer);
                next();

            } else {
                session.send("Sorry I couldn't pull your records, please provide your details again");
                session.userData = {};
                session.beginDialog("/profile")
            }
        },5000);
    },
    (session,args,next)=>{
        session.sendTyping();
        var msg = new builder.Message(session).addAttachment(createHeroCard());
        builder.Prompts.choice(session, msg, "Accept|Decline");
     },
    (session,results, next)=>{
            if(!results.response){
                session.sendTyping();
                session.send("Please provide your choice");
            }
            if(results.response.entity==="Accept"){

                    session.sendTyping();
                    session.send(msgs.missedtechnicianDialog.step5OfferAcceptance);
                    session.sendTyping();
                    session.send(msgs.missedtechnicianDialog.step6BeginSchedule);

                session.beginDialog("/schedule");
            }else{
                // Look for another offer for this guy.
                session.send(msgs.missedtechnicianDialog.step5OfferDecline);
                session.beginDialog("/schedule");
            }
    },
    (session)=>{
        session.endDialog("Thank you for contacting NXT Telecom");
    }
    
]).triggerAction({
    matches: 'MissedTechnician',
    onInterrupted: function (session) {
        session.send('How may I help you today ?');
        session.endDialog();
    }   
}).cancelAction({
    matches : 'cancel',
    onDefault : function(){
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
bot.dialog("/schedule", [
    (session,results,next)=>{
        if(!session.userData.user){
            session.beginDialog("/profile");
        }else{
            if(session.userData.schduleDone){
                builder.Prompts.choice(session, " I have found that you recently booked an appoitment, would like to cancel previous one and start new ?","YES|NO",{listStyle:3});
            }else{
                next();
            }

        }
    },
    (session, results)=>{
        if(results.response){
            if(results.response.entity=="YES"){
                session.userData.schduleDone=false;
                builder.Prompts.text(session,msgs.askAppoitment);
            }else{
                session.send("Good Bye");
                session.endDialog();
                session.cancelDialog();
                //session.beginDialog("/cancelme",{"response":results.response, "jumpstep":true});
            }
        }else {
            builder.Prompts.text(session,msgs.askAppoitment);
        }

    },
    (session,results,next)=>{
           utilites.getIntentAndSentiment(results.response,(data)=>{
              console.log("Intent and Emotion Got from LUIS and BING ---");
               console.log(data);
           //});
          // utilites.getLuisIntent(querystring.escape(results.response),(data)=>{
          //    console.log(data);
              if(data.luis.topScoringIntent.intent==='CancelOperation'){
                    //builder.Prompts.confirm(session,"Are you sure to cancel the appointment process ?");
                    session.beginDialog("/cancelme");
                    session.cancelDialog("/schedule");
                 }else{
                     if(data.luis.topScoringIntent.intent==='None'){
                         console.log("Matched with intent NONE");
                         session.send("I am sorry, I didn't understand your message, please try again");
                         session.cancelDialog().beginDialog("/schedule");
                         return;
                     }
                }
                console.log("Entities lengh is +++++++++ %d", data.luis.entities.length);
                if(data.luis.entities.length==0){
                    session.send("Sorry I couldn't find a date in your response");
                    session.send(msgs.askAppoitment);
                }else{
                    let scheduleDate = builder.EntityRecognizer.findAllEntities(data.luis.entities,'builtin.datetime.date');
                    let appointmentDate;
                    if(_.isEmpty(scheduleDate)){
                        //the time from the entities returned by LUIS
                        scheduleDate = builder.EntityRecognizer.findAllEntities(data.luis.entities,'builtin.datetime.time');
                        //print entity for debug
                        console.info("scheduleed date is %j", scheduleDate);
                        //parse this entity using custom function as utility may be in the form as XXX-XXX-TMO
                        utilites.dateTimeDateMoments(scheduleDate,'builtin.datetime.time');
                        appointmentDate = builder.EntityRecognizer.resolveTime(scheduleDate);
                        //}
                        console.log(appointmentDate);
                    }else {
                        if (!appointmentDate) {
                            //use custom parser
                            console.log("Parsing entity with custom parser as I need date now");
                            utilites.dateTimeDateMoments(scheduleDate);
                            appointmentDate = builder.EntityRecognizer.resolveTime(scheduleDate,'builtin.datetime.date');
                            console.log(appointmentDate);
                        }
                    }
                    let scheduleTime = builder.EntityRecognizer.findAllEntities(data.luis.entities,'builtin.datetime.time');
                    console.log("Schedule time");
                    console.log(scheduleTime);
                    if(_.isEmpty(scheduleTime)){
                        scheduleTime = builder.EntityRecognizer.findAllEntities(data.luis.entities,'builtin.datetime.date');
                        utilites.dateTimeDateMoments(scheduleTime,'builtin.datetime.date')
                    }else{
                        utilites.dateTimeDateMoments(scheduleTime,'builtin.datetime.time')
                    }

                    let time =[];
                    let fromTime;
                    let toTime;
                    if(scheduleTime.length>1){
                        scheduleTime.forEach((entity)=>{
                            let data = [entity];
                            time.push(data);
                        });
                         fromTime = builder.EntityRecognizer.resolveTime(time[0]);
                         toTime =   builder.EntityRecognizer.resolveTime(time[1]);
                    }else{
                        fromTime = builder.EntityRecognizer.resolveTime(scheduleTime);
                        toTime = fromTime;
                    }
                    console.log("From time");
                    console.log(fromTime);
                    let slots = utilites.getFreeslots(moment.utc(appointmentDate).format('YYYY-MM-DD'),moment.utc(fromTime).format('HHmm'),moment.utc(toTime).format('HHmm'));
                    session.dialogData.slots = slots;
                    builder.Prompts.choice(session, "Below are list of slots available, kindly click a slot to fix appointment",slots,{listStyle:3});
                    console.log("---from time---");
                    console.log(fromTime);

                    console.log("---To time---");
                    console.log(toTime);
                    console.log(moment.utc(fromTime).format('HHmm'));
                }

            });


        
        /*builder.LuisRecognizer.recognize(results.response,model, (err,intents,entities)=>{
                if(err){
                    console.log("Some error occurred in calling LUIS");
                }
                console.log(intents);
                console.log("==================");
                console.log(entities);
                let dateofAppoitment = builder.EntityRecognizer.findAllEntities(entities,"builtin.datetime.date");
                let timeofAppoitment = builder.EntityRecognizer.findEntity(entities,"builtin.datetime.time");


                //console.log("##################### "+timeofAppoitment.length);
                let datetime;
                let time;
                if(dateofAppoitment){
                        dateime = builder.EntityRecognizer.resolveTime(timeofAppoitment);
                }
                if(timeofAppoitment){
                 time = builder.EntityRecognizer.parseTime(entities);
                }
                
                console.log("#####################");
                console.log(time);
               // if(time.length>1){
                    console.log("Your appoitment is fixed on %s at %s", dateime.toLocaleDateString(),dateime.toLocaleTimeString());
                //}
                
        });*/
        session.sendTyping();

        session.send("Let me analyse your response.");


        
        
    },
    (session,results)=>{
        // Use this function to book a slot for the user.
        if(results.response){
            session.send("Thank you, I have booked an appotment for your on %s, at %s ", session.dialogData.slots[results.response.entity].date,session.dialogData.slots[results.response.entity].starttime );

            /*
             * Temp code will be removed
             *
             */

            users.accounts.forEach((account)=>{
               if(account.accountNumber===session.userData.user.accountNumber){
                   account.appointmentDate = session.dialogData.slots[results.response.entity].date;
                   account.appoitmentTime = session.dialogData.slots[results.response.entity].starttime;
               }
            });

            session.userData.schduleDone=true;
            session.send("Good bye");
            session.endDialog();
        }else {
            session.send("Sorry I didn't understand you, kindly retry");
        }
    }
]).cancelAction({
    matches : 'cancel',
    onDefault : function(){
        sessionStorage.send("Thanks, I'll cancel the details and will not proceed with scheduling");
        session.endDialog();
    }
});

bot.dialog("/cancelme", [
    (session)=>{

            builder.Prompts.confirm(session, msgs.cancelPrompt, {listStyle: builder.ListStyle["button"]});

    },
    (session,results)=>{
        console.log("Going to cancell current operations");
          if(results.response){
              console.log(results.response);
            if(results.response){
                console.log("Cancelling it");
                session.send("Going to cancel current operations");
                session.clearDialogStack("Cancelled operation");
                session.endDialog();

            }else {
                console.log("Cancelling in else of results");
                session.send("Aborting cancellation process.");
                session.cancelDialog();
            }
         }

     }

    ]);



/*
 * This dialog will be used to gather the customer account number and pin
 * A call to rest end point should be made to validate the account number
 * 
 * 
 */ 

// Take the NXT account number and pin in this dialog and look up user account and authenticate user and set up his name in session;
bot.dialog("/profile", [
    (session)=>{
        session.sendTyping();
        if(!session.userData.accountCheckfailed) {
            builder.Prompts.number(session, msgs.profileDialog.welcomeChkAccount);
        }else{
            builder.Prompts.number(session,msgs.profileDialog.revalidateAccount);
        }
    },
    (session,results,next)=>{
        //Set User Account Number in memory
        session.userData.accountNo = results.response;
        //session.userData.name =  utilites.pullAccountDetails(results.response).name;
        next();
    },
    (session)=>{
        builder.Prompts.number(session,msgs.profileDialog.welcomPIN);
    },
    (session,results)=>{
        session.sendTyping();
        session.userData.accountPin = results.response;
        session.send(msgs.waitValidate);
        //call validate account number
        session.userData.user = utilites.pullAccountDetails(session.userData.accountNo,session.userData.accountPin);
        console.log(session.userData.user);
        session.sendTyping();
        if(session.userData.user==null){
            session.userData.accountCheckfailed = true;
            session.send(msgs.profileDialog.validationFailed);
            session.cancelDialog().beginDialog("/profile");
        }else {
            session.send("Hi %s How may I help you today?", session.userData.user.accountName);
            session.endDialog();
        }
    }
])





/*
 *  Create offer Card based on the input from Pointis/
 * 
 * 
 */ 

function createHeroCard(session) {
    return new builder.HeroCard(session)
        .title('$20 VOD Coupon')
        .text('Enjoy the VOD content')
        .buttons([
            builder.CardAction.postBack(session,"Accept", "Accept"),
            builder.CardAction.postBack(session,"Decline", "Decline")
        ]);
}

/*
 *
 *
 */


function routeMessages(intent, session) {
    console.log("I am routing message for intent "+intent);
    switch (intent){
        case 'CancelOperation' :
            session.cancelDialog();
            session.beginDialog("/cancel");
            break;
        case 'ScheduleTechnician' :
            session.beginDialog("/schedule");
            break;
        case 'MissedTechnician' :
            session.beginDialog("/missedtechnician");
            break;
        case 'BeginConversation' :
            session.beginDialog("/start");
            break;
        default :
            session.beginDialog("/profile");

    }
}

/*
 * Have to call luis for intent and entities on each promt
 * 
 *
 */


