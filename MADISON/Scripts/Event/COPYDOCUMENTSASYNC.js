/*
*  Program : CopyDocumentsAsync
*  Usage   : This script is invoked in Other Event Script
*  Comments: Document copy - seeing significant delay so trying async
*/

// ********************************************************************************************************************************
//	Environment Parameters Below
// ********************************************************************************************************************************

//aa.sendMail("noreply@cityofmadison.com","glabelle-brown@cityofmadison.com","jmoyer@cityofmadison.com","2nd TEST","Test");

var servProvCode = aa.env.getValue("ServProvCode");			// Service Provider Code
var currentUserID = aa.env.getValue("ReportUser"); 			// AA User
var fromCapId = aa.env.getValue("FromCapId");
var toCapId = aa.env.getValue("ToCapId");

var showDebug = true;
var showMessage = false; 
var debug = "";
var error = "";
var br = "<BR/>";

// ***********************************************************************
logDebug("<u>Record Information:</u>");
logDebug("servProvCode: " +  servProvCode);
logDebug("fromCapId : " +  fromCapId);
logDebug("toCapId : " +  toCapId);
// ***********************************************************************

main();

function main() {
	//handleEnvParamters();
        //aa.sendMail("noreply@cityofmadison.com","glabelle-brown@cityofmadison.com","","3rd TEST","Test");
	var success = copyDocumentsAsync(fromCapId, toCapId, currentUserID);
	/*if(!success) {
		aa.sendMail("Accela Automation Result Email <noreply@cityofmadison.com>","glabelle-brown@cityofmadison.com","", "Errors occurs in Sending Report Script", "Test");
	} else {
		aa.sendMail("Accela Automation Result Email <noreply@cityofmadison.com>","glabelle-brown@cityofmadison.com","", "Email Sent Successfully", "Test");
	}*/
}

function copyDocumentsAsync(fromCapId, toCapId, currentUserID) {
	result = aa.cap.copyRenewCapDocument(fromCapId, toCapId, currentUserID);
        debugObject(result);
	return true;
}

function handleEnvParamters() {
	if(servProvCode == null) servProvCode = "";	
	if(emailResultTo == null) emailResultTo = "elamsupport@cityofmadison.com";
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