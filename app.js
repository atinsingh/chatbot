const restify =  require('restify');
const builder = require('botbuilder');

const config = require('./config.js');
const users =   require("./appconfig.json");
let model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/899a5581-0c98-4e96-a389-13a6080eabf8?subscription-key=9c2eaf8becea42ef9a98c0d7e22ffa65&verbose=true&q=';



//Create a server

let server = restify.createServer();
let port = process.env.port||process.env.PORT||3978;
server.listen(port,()=>{
    console.log("Bot Server Started  at port %d ", port);
});


// Create Intital Chat Bot 

let connectionConfigation = new builder.ChatConnector(config);


let bot =  new builder.UniversalBot(connectionConfigation);

let recognizer = new builder.LuisRecognizer(model);

server.post("/api/messages",connectionConfigation.listen());


let dialog = new builder.IntentDialog({
    recognizers :[recognizer]
});

bot.dialog('/',dialog);


dialog.matches('BeginConversation',"/start");

dialog.matches('MissedTechnician','/missedtechnician');

dialog.matches('ScheduleTechnician','/schedule');

bot.dialog("/missedtechnician",[
    (session,args,next)=>{
         console.log(session);
         if(!session.userData.accountNo){
            session.beginDialog("/profile");
        }else{
            session.sendTyping();
            next();
        }
    },
    (session,results,next)=>{
        session.send("I am really sorry to hear that \
        , let me look into it",session.userData.name);
        session.sendTyping();
        let schedule = pullschedule(session.userData.accountNo);
        if(schedule!==null){
            // Call pointis to get the action;
            session.send("Apologies, I found that you had an appointment \
            on %s at %s but we failed as %s",schedule.appoitmentDate,schedule.appoitmentTime,schedule.issuetag);
            session.sendTyping();
            next();

        }else{
            session.send("Sorry I couldn't pull your records, please provide your details again");
            session.userData = {};
            //session.beginDialog("/profile")
        }
    },
    (session,args,next)=>{
         session.send("I will provide you a $20 voucher, you can use this voucher for VOD kindly help to accept");
         session.clearDialogStack();
    },
    (session,results, next)=>{
        if(results.response==="Accept"){
            session.send("Thank you for accepting the coupon");
        }
    }
    
]);


dialog.onDefault(builder.DialogAction.send("I am sorry I don't understand your question, please try reprashe it"));

// Root Dialog for bot
/*bot.dialog("/",[
    (session,args,next)=>{
        if(!session.userData.accountNumber){
            session.beginDialog("/profile");
        }else{
            next();
        }
    },
    (session,results)=>{
        session.send("Hello %s",session.userData.name);
    }
]);*/


/*
 *
 * Begin Conversation 
 * 
 */ 
bot.dialog('/start', [
    (session)=>{
        session.sendTyping();
        session.send("Welcome back Mr %s <br> How can I help \
        you today", session.userData.name);
        session.cancelDialog();
    }
]);


/*
 * Handle the schedule new appoitment 
 * 
 * 
 * 
 */ 
bot.dialog("/schedule", [
    (session)=>{
        session.send("Working on create a appoitment for you");
        session.clearDialogStack();
        session.cancelDialog();
    }
]);

 


/*
 *
 * Gather profile details for user
 * 
 * 
 */ 

// Take the NXT account number and pin in this dialog and look up user account and authenticate user and set up his name in session;
bot.dialog("/profile", [
    (session)=>{
        builder.Prompts.text(session,"Kindly provide your 8 git NXT account number");
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
        session.endDialog("Thank you, We are validating your account, please wait...")
    },
])


dialog.onBegin(function (session, args, next) {
     if(!session.userData.accountNo){
         session.beginDialog("/profile");
     }
     next();
});


lookUPAccount = function(accountNo) {
        // Lets keep dummy for demo else will be consuming rest end point 
        return {
            name:"Atin Singh"
        } 

}

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