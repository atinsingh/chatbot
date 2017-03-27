const restify =  require('restify');
const builder = require('botbuilder');
const querystring = require("querystring");

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

dialog.onDefault(builder.DialogAction.send("I am sorry I don't understand your question, please try reprashe it"));





/*
 *  This should be called before, we begin our conversation
 *  This function will will build a profile.
 * 
 * 
 */  

dialog.onBegin( (session, args, next) => {
     if(!session.userData.accountNo){
         session.beginDialog("/profile");
     }
});





// Root Dialog for bot
bot.dialog("/missedtechnician",[
    (session,results,next)=>{
        if(session.message.text)
        session.send("I am really sorry to hear that \
        , let me look into it",session.userData.name);
        session.sendTyping();
        let schedule = pullschedule(session.userData.accountNo);
        if(schedule!==null){
            // Call pointis to get the action;
            session.send("Apologies, I found that you had an appointment \
            on %s at %s but we failed as %s",schedule.appoitmentDate,schedule.appoitmentTime,schedule.issuetag);
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


/*
 * Handle the schedule new appoitment 
 * 
 * 
 * 
 */ 
bot.dialog("/schedule", [
    (session, args, next)=>{
        builder.Prompts.text(session,"When do you prefer new appoitment");
    },
    (session,results,next)=>{
        session.sendTyping();
        /*
        getLuisIntent(querystring.escape(results.response), (data)=>{
                console.log(data);
                let schedule = builder.EntityRecognizer.findEntity(data.entities,'builtin.datetime.time');
                console.log("=========================");
                console.log(schedule);
                console.log("========================");
            
        });
        */
        builder.LuisRecognizer.recognize(results.response,model, (err,intents,entities)=>{
                if(err){
                    console.log("Some error occurred in calling LUIS");
                }
                console.log(intents);
                console.log("==================");
                console.log(entities);
        });
        session.endDialog("Thank you, I have schduled your appointment, our techcian will call you 15 min before your appoitment");
        
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
 * Have to call luis for intent and entities on each promt
 * 
 *
 */


function getLuisIntent(question,callback){
    var query = "?subscription-key=9c2eaf8becea42ef9a98c0d7e22ffa65&verbose=true&q="+question;
    var options = {};
    options.url = "https://westus.api.cognitive.microsoft.com";
    options.type = options.type || "json";
    options.path = "/luis/v2.0/apps/899a5581-0c98-4e96-a389-13a6080eabf8" + query;
    options.headers = {Accept: "application/json"};


    var client = restify.createClient(options);

    client.get(options, function(err, req, res, data) {
        if (err) {
            console.log(err);
            return;
        }
        client.close();
        console.log(JSON.stringify(data));

        callback(JSON.stringify(data));
    });
}