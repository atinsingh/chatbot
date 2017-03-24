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
