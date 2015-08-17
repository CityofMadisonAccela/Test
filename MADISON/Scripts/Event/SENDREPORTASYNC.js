/*
*  Program : SendReportAsyncV2.js
*  Usage   : This script is invoked in Other Event Script
*  Comments: 1/21/2014 - ITJSM - Added functionality view document async, attach document async, 
*	1/15/2015 - ITJSM - edited to correct emailing issue
*	copy attachment to parent cap
*/

// ********************************************************************************************************************************
//	Environment Parameters Below
// ********************************************************************************************************************************
var report = aa.env.getValue("Report");						// Report, gets attached to email
var name = aa.env.getValue("ReportName");					// Report Name, gets attached to email
var emailFrom = aa.env.getValue("EmailFrom");				// From Email Address
var emailTo = aa.env.getValue("EmailTo");					// To Email Address
var emailCC = aa.env.getValue("EmailCC");					// CC Email Address
var emailSubject = aa.env.getValue("EmailSubject");			// Email Subject
var emailContent = aa.env.getValue("EmailContent");			// Email Content
var emailResultTo = aa.env.getValue("SystemEmail"); 		// Debug and Error email address

var showDebug = true;
var showMessage = false; 
var debug = "";
var error = "";
var reportFile = "";

// ***********************************************************************
logDebug("<BR><u>Email Information:</u>");
logDebug("ReportName = " +  name);
logDebug("SystemEmail = " +  emailResultTo);
logDebug("emailFrom = " +  emailFrom);
logDebug("emailTo = " +  emailTo);
logDebug("emailCC = " +  emailCC);
logDebug("emailSubject = " +  emailSubject);
logDebug("emailContent = <br>" +  emailContent);
// ***********************************************************************

if (handleEnvParamters()){
	getReportFile();
	var success = sendEmailwAttchmntMultipleParameters(emailFrom, emailTo, emailCC, emailSubject, emailContent, reportFile);
	if(!success) {
		if (emailResultTo != "") {
			aa.sendMail("noreply@cityofmadison.com",emailResultTo,"", "Errors in Sending Async Report Script", debug);
		}
	} else {
		if (emailResultTo != "") {
			aa.sendMail("noreply@cityofmadison.com",emailResultTo,"", "Email Sent Successfully", debug);
		}
	}
} else {
	logDebug("Handling of environment parameters has failed.");
} 

function sendEmailwAttchmntMultipleParameters(fromAddress, toAddress, ccAddress, eSubject, eContent, eReport) {
	var sendResult = aa.sendEmail(fromAddress, toAddress, ccAddress, eSubject, eContent, eReport);
	if(sendResult.getSuccess()) {
		logMessage("A copy of this report has been sent to the valid email addresses.");
		return true;                   
	} else {
		logMessage("System failed send report to selected email addresses because mail server is broken or report " + 
		"file size is greater than 5M.");
		return false;
	}
}

function getReportFile() {
	reportResult = aa.reportManager.getReportResult(report);
	if (reportResult.getSuccess()) {
		rr = reportResult.getOutput();
		//rr.setName(changeNameofAttachment(rr.getName(), name));
		reportFile = aa.reportManager.storeReportToDisk(rr).getOutput();
	} else {
		logDebug("Failed to get Report Result. The report (" + name + ") was not generated and the email was not sent.");
		aa.sendMail("noreply@cityofmadison.com","elamsupport@cityofmadison.com","", "Errors occurs in Creating Report", debug);	
	}
}

function changeNameofAttachment(attachmentName, name) {
	rptExtLoc = attachmentName.indexOf(".");
	rptLen = attachmentName.length();
	ext = attachmentName.substr(rptExtLoc, rptLen);
	attachName = name + ext;
	return attachName
}

function handleEnvParamters() {
	if(report == null) report = "";
	if(name == null) name = "";
	if(emailFrom == null) emailFrom = "";
	if(emailTo == null) emailTo = "";
	if(emailCC == null) emailCC = "";
	if(emailSubject == null) emailSubject = "";
	if(emailContent == null) emailContent = "";
	if(emailResultTo == null) emailResultTo = "";
	return true;
}

function debugObject(object) {
	var output = '';
	for (property in object) { 
		output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" +'; ' + "<BR>"; 
	} 
	logDebug(output);
}

function logDebug(dstr) {
	debug += dstr + "<BR>";	
}

function logMessage(dstr) {
	error += dstr + "<BR>";
	logDebug(dstr);
}