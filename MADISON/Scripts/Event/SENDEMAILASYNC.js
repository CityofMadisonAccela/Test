/*
*  Program : SendEmailAsync.js
*  Usage   : This script is invoked in Other Event Script
*  Comments: 5/14/2014 - ITKG - Script to send email async
*/

// ********************************************************************************************************************************
//	Environment Parameters Below
// ********************************************************************************************************************************
var emailFrom = aa.env.getValue("EmailFrom");			// From Email Address
var emailTo = aa.env.getValue("EmailTo");			// To Email Address
var emailCC = aa.env.getValue("EmailCC");			// CC Email Address
var emailSubject = aa.env.getValue("EmailSubject");		// Email Subject
var emailContent = aa.env.getValue("EmailContent");		// Email Content
var emailAttachment = aa.env.getValue("emailAttachment"); 	// Debug and Error email address

var showDebug = true;
var showMessage = false; 
var debug = "";
var error = "";
var br = "<BR/>";
var emailResultTo = "elamsupport@cityofmadison.com";

// ***********************************************************************
logDebug("<BR><u>Email Information:</u>");
logDebug("emailFrom = " +  emailFrom);
logDebug("emailTo = " +  emailTo);
logDebug("emailCC = " +  emailCC);
logDebug("emailSubject = " +  emailSubject);
logDebug("emailContent = " +  emailContent);
logDebug("emailAttachment = <br>" +  emailAttachment);
// ***********************************************************************

main();  // Now send the email

function main() 
{
	handleEnvParamters();
	var success = aa.sendEmail(emailFrom, emailTo, emailCC,  emailSubject, emailContent, "");
	if(!success) {
		aa.sendMail("Accela Automation Result Email <noreply@cityofmadison.com>",emailResultTo,"", "Errors occurs in Sending Report Script", debug);
	}
}

function handleEnvParamters() {
	if(emailFrom == null) emailFrom = "";
	if(emailTo == null) emailTo = "";
	if(emailCC == null) emailCC = "";
	if(emailSubject == null) emailSubject = "";
	if(emailContent == null) emailContent = "";
	if(emailAttachment == null) emailAttachment = "";
}

function debugObject(object) {
	var output = '';
	for (property in object) { 
		output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" +'; ' + "<BR>"; 
	} 
	logDebug(output);
}

function logDebug(dstr) {
	debug += dstr + br;	
}

function logMessage(dstr) {
	error += dstr + br;
	logDebug(dstr);
}
