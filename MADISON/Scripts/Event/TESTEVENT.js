var emailText = "";
var strVar = "superduper";


aa.env.setValue("ScriptReturnCode", "0");

debugObject(aa.env);
emailText += aa.env.getValue("ScriptReturnCode");
aa.env.setValue("ScriptReturnMessage", "This occurred + <br>" + emailText);
emailText += aa.env.getValue("ScriptReturnMessage");
aa.sendMail("noreply@cityofmadison.com","rsjachrani@cityofmadison.com","","Test",emailText);

function debugObject(object)
{
 var output = ''; 
 for (property in object) 
 { 
   //aa.sendMail("noreply@cityofmadison.com","rsjachrani@cityofmadison.com","","Test","<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" +'; ' + "<BR>");
   output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" +'; ' + "<BR>"; 
 } 
 //aa.sendMail("noreply@cityofmadison.com","rsjachrani@cityofmadison.com","","Test",output);
 emailText += output;
}
