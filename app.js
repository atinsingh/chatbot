const restify =  require('restify');
const builder = require('botbuilder');
const querystring = require("querystring");
const config = require('./appConfig.json');
const users =  require("./data.json");
const msgs  =  require("./messages.json");
const utilites = require("./utility");

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
     console.log("Bot Server Started  at port %d ", port);
});



/*
 * This section is create a Universal chatbot using Microsoft Bot Builder framework Node JS SDK
 * Bot need an Microsoft APP ID and App Password.
 * App ID and password will be part of App Config
 */


let connectionConfiguration = new builder.ChatConnector({
    appId:config.appId,
    appPassword:config.appPassword
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

dialog.onBegin( (session, args, next) => {
     if(!session.userData.accountNo){
         session.beginDialog("/profile");
     }else{
         next();
     }
});


/*
 *
 * Begin Conversation 
 * 
 */ 
bot.dialog("/start", [
    (session,args,next)=>{
        session.sendTyping();
        if(!session.userData.name){
            session.beginDialog("/profile");
        }else{
        session.send("Welcome back Mr %s <br> How can I help \
        you today", session.userData.name);
        session.cancelDialog();
        }
    }
]);




// Root Dialog for bot
bot.dialog("/missedtechnician",[
    (session,results,next)=>{
        if(session.message.text)
        session.send("I am really sorry to hear that \
        ,let me look into it",session.userData.name);
        session.sendTyping();
        let schedule = pullschedule(session.userData.accountNo);
        if(schedule!==null){
            // Call pointis to get the action;
            session.send("Apologies, I found that you had an appointment on %s at %s but we failed as %s",schedule.appoitmentDate,schedule.appoitmentTime,schedule.issuetag);
            session.sendTyping();
            session.send("We would like to offer you following to compensate ");
            next();

        }else{
            session.send("Sorry I couldn't pull your records, please provide your details again");
            session.userData = {};
            session.beginDialog("/profile")
        }
    },
    (session,args,next)=>{
        session.sendTyping();
        var msg = new builder.Message(session).addAttachment(createHeroCard());
        builder.Prompts.choice(session, msg, "Accept|Decline");
     },
    (session,results, next)=>{
            if(results.response.entity==="Accept"){
                session.send("Thank you for accepting the coupon");
                session.beginDialog("/schedule");
            }else{
                // Look for another offer for this guy.
                session.send("I am sorry that you didn't like our offer, let me you schedule right away");
                session.beginDialog("/schedule");
            }
            //session.endDialog("Thank you for contacting NXT Telecom");        //Start appoitment prociess;
 
           // session.clearDialogStack();
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
    (session, args, next)=>{
        builder.Prompts.text(session,msgs.askAppoitment);
    },
    (session,results,next)=>{
         utilites.getLuisIntent(querystring.escape(results.response),(data)=>{
                if(data.topScoringIntent.intent==='CancelOperation'){
                    builder.Prompts.confirm(session,"Are you sure to cancel the appointment process ?");
                    session.beginDialog("/cancelme",{"response":results.response, "jumpstep":true});
                    session.cancelDialog();
                 }
                console.log(data.entities);
                let schedule = builder.EntityRecognizer.findAllEntities(data.entities,'builtin.datetime.date');
                let appoitmentDate = builder.EntityRecognizer.resolveTime(schedule);
                if(!appoitmentDate){
                    //use custom parser
                }
                let scheduleTime = builder.EntityRecognizer.findAllEntities(data.entities,'builtin.datetime.time');
                console.log(scheduleTime);
                let time =[];
                if(scheduleTime.length>1){
                    scheduleTime.forEach((entity)=>{
                        let data = [entity];
                        time.push(data);
                    });
                }
                
                let fromTime = builder.EntityRecognizer.resolveTime(time[0]);
                let toTime =   builder.EntityRecognizer.resolveTime(time[1]);
                //console.log(fromDate.toLocaleDateString());
                console.log(fromTime.toLocaleString());
                session.endDialog("Thank you, I have schduled your appointment on %s between %s to %s",
                appoitmentDate.toLocaleDateString(),fromTime.toLocaleTimeString(),toTime.toLocaleTimeString());
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
        session.send("I am checking available slots for you.");
        
        
    }
]).cancelAction({
    matches : 'cancel',
    onDefault : function(){
        sessionStorage.send("Thanks, I'll cancel the details and will not proceed with scheduling");
        session.endDialog();
    }
});

bot.dialog("/cancelme", [
    (session,args,next)=>{
        if(args){
            console.log("Received Arguments");
            if(args.jumpstep) {
                next();
            }
        }
        else {
            builder.Prompts.confirm(session, msgs.cancelPrompt, {listStyle: builder.ListStyle["button"]});
        }
    },
    (session,results,args)=>{
        console.log("Going to cancell current operations");
        if(args.response){
            session.clearDialogStack("Cancelled operation");
            //session.cancelDialog("Operation Cancelled");

        }else{
            console.log("Inside else");
            if(results.response){
                console.log("Cancelling it");
                session.clearDialogStack("Cancelled operation");

            }else {
                console.log("Cancelling in else of results");
                session.cancelDialog("Canclled");
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
        session.send("Welcome to NXT Telecom, to serve you better,")
        builder.Prompts.text(session,"Please provide your 8 git NXT account number");
    },
    (session,results,next)=>{
        session.userData.accountNo = results.response;
        session.userData.name =  lookUPAccount(results.response).name;
        next();
    },
    (session)=>{
        builder.Prompts.number(session,"Kindly provide 4 digit account pin");
    },
    (session,results)=>{
        session.userData.accountPin = results.response;
        //call validate account number
        session.send("Thank you, We are validating your account, please wait...");
        session.send("Hi %s How may I help you today?",session.userData.name);
        session.endDialog();
    }
])

/*
 *
 *  Look for an account details based on the number given by user
 * 
 * 
 */ 

lookUPAccount = function(accountNo) {
        // Lets keep dummy for demo else will be consuming rest end point 
        return {
            name:"Atin Singh"
        } 

}



/*
 * Arbit function to check the issue in the system
 * 
 * 
 */ 

pullschedule = function(accountNo) {
        console.log("Fetching details for user %s", accountNo);
        let user = null;
        users.forEach((account)=>{
            if(account.accountNumber===accountNo){
                user = account;
            }
        })
        return user;
}

/*
 *  Create offer Card based on the input from Pointis/
 * 
 * 
 */ 

function createHeroCard(session) {
    return new builder.HeroCard(session)
        .title('$20 VOD Coupon')
        .text('Build and connect intelligent bots to interact with your users naturally wherever they are, from text/sms to Skype, Slack, Office 365 mail and other popular services.')
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
            session.beginDialog("/missedtechnician")
    }
}

/*
 * Have to call luis for intent and entities on each promt
 * 
 *
 */


