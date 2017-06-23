//EML;Licenses!DCR!AA Plan!NA;PlanReviewDeveloper^`
/*
	Script conversion from EMSE 
	Change Log
		Riki 6/22/2017 - Initial conversion
*/	
var sEmailTextFile = "AffirmativeActionEmailsBody";
branch("CMN:Licenses/DCR/AA Plan/NA:getEmailAddrs");
emailSubject = "AA Plan - Approved - " + sBizName + " - Individual Developer" +  "-- " + capIDString;
emailText = "<html><body><FONT face=calibri>";
if (lookup(sEmailTextFile, "aaSalutation") != undefined) {
	emailText += "<p>" + lookup(sEmailTextFile, "aaSalutation") + "</p>";
	}

if (lookup(sEmailTextFile, "DevApprovalLine1") != undefined) {
	emailText += "<p>" + lookup(sEmailTextFile, "DevApprovalLine1") + "</p>";
	}

if (lookup(sEmailTextFile, "DevApprovalLine2") != undefined) {
	emailText += "<p>" + lookup(sEmailTextFile, "DevApprovalLine2") + "</p>";
	}

if (lookup(sEmailTextFile, "DevApprovalLine3") != undefined) {
	emailText += "<p>" + lookup(sEmailTextFile, "DevApprovalLine3") + "</p>";
	}

if (lookup(sEmailTextFile, "DevApprovalLine4") != undefined) {
	emailText += "<p>" + lookup(sEmailTextFile, "DevApprovalLine4") + "</p>";
	}

if (lookup(sEmailTextFile, "DevApprovalLine5") != undefined) {
	emailText += "<p>" + lookup(sEmailTextFile, "DevApprovalLine5") + "</p>";
	}

if (lookup(sEmailTextFile, "xMarthaSigLine") != undefined) {
	emailText += "<p>" + lookup(sEmailTextFile, "xMarthaSigLine") + "</p>";
	}

emailText += "</body></html>";
sCcEmail = "mwhite@cityofmadison.com;
";
if (true) {
	sCcEmail += "KMcCarthy@cityofmadison.com;
	";
	}

if (!bNoEmail) {
	aa.sendEmail("noreply@cityofmadison.com", sToEmail, sCcEmail, emailSubject, emailText, "");
	} else {
	message = "Neither the EEO/AA Officer nor the Contractor contacts has an email address. ";
	cancel = false;
	showMessage = true;
	}
`^