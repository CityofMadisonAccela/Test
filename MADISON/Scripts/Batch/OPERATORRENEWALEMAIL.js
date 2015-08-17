/*------------------------------------------------------------------------------------------------------/
| | Program : OperatorRenewalEmail.js
| Event   : Process the Set determined in the parameter
|
| Usage   : For use with the cap set script functionality available in 6.5.0 and later.
|
| Client  : N/A
| Action# : N/A
|
| Notes   : 	There are 3 parameters to use "SetName", "CrystalReport", "GroupEmail"
	
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var showDebug = true;// Set to true to see debug messages in email confirmation
var maxSeconds = 60 * 5;// number of seconds allowed for batch processing, usually < 5*60
var showMessage = false;
var useAppSpecificGroupName = true;
var emailText = "";
var debug = "";
var br = "<BR>";
var tab = "&nbsp&nbsp&nbsp&nbsp";
/*------------------------------------------------------------------------------------------------------/
|
| END: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
sysDate = aa.date.getCurrentDate();
batchJobResult = aa.batchJob.getJobID();
batchJobName = "" + aa.env.getValue("BatchJobName");

batchJobID = 0;
if (batchJobResult.getSuccess()) {
	batchJobID = batchJobResult.getOutput();
	logDebug("Batch Job " + batchJobName + " Job ID is " + batchJobID + br);
} else {
	logDebug("Batch job ID not found " + batchJobResult.getErrorMessage());
}
/*----------------------------------------------------------------------------------------------------/
|
| Start: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var startDate = new Date();
var startTime = startDate.getTime();// Start timer
var systemUserObj = aa.person.getUser("ADMIN").getOutput();
var timeExpired = false;

var setName = getParam("SetName");
var crystalReportName = getParam("CrystalReport");
var groupEmail = getParam("GroupEmail");

var capId = null;
var altId = null;
var parentCapId = null;
var parentAltId = null;
var rFile = "";

var emailTo = "";
var emailCC = "";
var contactName = "";
var contactBusiness = "";
var emailSubject = "";
var emailBody = "";
var emailFrom = "noreply@cityofmadison.com";

var emailAddress = "jmoyer@cityofmadison.com";//email to send report
var supportEmail = "jmoyer@cityofmadison.com";
var staffEmailAddress = "";

/*----------------------------------------------------------------------------------------------------/
|
| End: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/-----------------------------------------------------------------------------------------------------*/
var paramsOK = true;

if (paramsOK) {
	logDebug("This process started on " + startDate + br);
	if (!timeExpired) {
		mainProcess();
		logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");
	}
}
/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/

function mainProcess() {
	logDebug("The purpose of this process is to email the License Holder the new license if the License Holder renewed on City " +
		"of Madison Licenses & Permits." + br);
	var setMember = aa.set.getCAPSetMembersByPK(setName);

	if (setMember.getSuccess()) {
		setMembers = setMember.getOutput().toArray();
	} else { 
		logDebug("ERROR: Getting Erosion Control work flow, reason is: " + setMemeber.getErrorType() + ":" + setMember.getErrorMessage()); 
		return false;
	}
	for(s in setMembers) {
		if (elapsed() > maxSeconds) { //only continue if time hasn't expired
			logDebug("A script time out has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.");
			timeExpired = true;
			break;
		}
		rFile = "";
		var id = setMembers[s];
		capId = aa.cap.getCapID(id.getID1(), id.getID2(),id.getID3()).getOutput();
		altId = capId.getCustomID();
		logDebug(br + "Renewal Record: " + altId);
		proj = aa.cap.getProjectByChildCapID(capId, "Renewal", "Complete");
		projSuccess = proj.getSuccess();
		if (projSuccess == true) {
			projOut = proj.getOutput();
			pCapId = projOut[0].getProjectID();
			parentCapId = aa.cap.getCapID(pCapId.getID1(), pCapId.getID2(),pCapId.getID3()).getOutput();
			parentAltId = parentCapId.getCustomID();
			cap = aa.cap.getCap(parentCapId).getOutput();		
			appTypeResult = cap.getCapType();
			appTypeString = appTypeResult.toString();
			appTypeArray = appTypeString.split("/");
			appSubType = appTypeArray[2];
			logDebug("Parent Record: " + parentAltId);
			rFile = reportViewAttachEmail("Business License", false, true, true);
			if (rFile != "") {
				prepareAndSendEmail();
				aa.set.removeSetHeadersListByCap(setName, capId);
			} else {
				logDebug("Report did not run.  Email not sent.");
			}
		}
	}
	aa.sendMail("noreply@cityofmadison.com", emailAddress, supportEmail, "Operator Renewal Email", debug);
}

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/

function prepareAndSendEmail() {
	getContactEmail("License Holder", "To");
	emailSubject = "Operator License Renewal";
	emailBody = "<html><body><p>Hello " + contactName + ",</p>" + 
	"<p>Thank you for applying for and receiving your operator license. " + 
	"Your license has been issued. At any time you may login to the " + 
	"<a href='https://elam.cityofmadison.com/CitizenAccess/'>City of Madison Licenses & Permits</a> website " + 
	"to download the license from attached documents.  Directions below: " + br +
	tab + "Once logged in click on 'Search for a License/Registration'." + br +
	tab + "Locate the License number (" + parentAltId + ") and click on the number." + br +
	tab + "Near the bottom of the page is the Documents section.  Expand and review/print your documents." + br + br +
	"<p>Thank You," + br + "City Clerk" + br + "210 Martin Luther King, Jr. Blvd., Room 103" + br + "City of Madison, Wisconsin 53701</p>" + 
	"<p>608 266 4601 Phone" + br + "608 266 4666 Fax" + br + "clerk@cityofmadison.com</p></body></html>"
	logDebug(tab + "Email To: " + emailTo);
	logDebug(tab + "Email CC: " + emailCC);
	logDebug(tab + "Email Subject: " + emailSubject);
	logDebug(tab + "Email Body: " + emailBody);
	if (emailTo != "No Email Address") {
		//aa.sendEmail(emailFrom, emailTo, emailCC, emailSubject, emailBody, rFile);
		logDebug(tab + "Email will be sent." + br);
	} else {
		logDebug(tab + "License was renewed by ACA but License Holder does not have an email address." + br);
	}
}

function getContactEmail(contactType, emailType) {
	var capContactResult = aa.people.getCapContactByCapID(parentCapId);
	var contact;
	if (emailType == "To") {
		emailTo = "";
		contactName = "";
		contactBusiness = "";
	} else {
		emailCC = "";
	}
	if (capContactResult.getSuccess()) {
		var capContactArray = capContactResult.getOutput();
		for (c in capContactArray) {
			contact = capContactArray[c];
			var people = contact.getPeople();
			if (people.getContactType() == contactType && emailType == "To") {
				emailTo += people.getEmail() + "; ";
				if (contactName != "") {
					contactName = contactName + "/" + people.getContactName();
				} else {
					contactName += people.getContactName();
				}
				if (contactBusiness != "") {
					contactBusiness = contactBusiness + "/" + people.getBusinessName();
				} else {
					contactBusiness += people.getBusinessName();
				}
			}
			if (people.getContactType() == contactType && emailType == "CC") {
				emailCC += people.getEmail() + "; ";
			}
		}
		if (emailTo.equals("null; ")) {
			emailTo = "No Email Address";
		}
	}
}

function reportViewAttachEmail(reportName, view, attach, email) {
	var name = "";
	var reportFile = "";
	var error = "";
	var parameters;
	var reportModel = aa.reportManager.getReportModelByName(reportName); //get detail of report to drive logic
	if (reportModel.getSuccess()) {
		reportDetail = reportModel.getOutput();
		name = reportDetail.getReportDescription();
		if (name == null || name == "") {
			name = reportDetail.getReportName();
		}
		var reportInfoModel = aa.reportManager.getReportInfoModelByName(reportName);  //get report info to change the way report runs
		if (reportInfoModel.getSuccess()) { 
			report = reportInfoModel.getOutput();
			report.setModule(appTypeArray[0]); 
			report.setCapId(parentCapId);
			reportInfo = report.getReportInfoModel();
			
			//set parameters
			if (reportDetail.getReportType().equals("URL_Report")) {
				//if REPORT_TYPE = URL_Report then val1 is Report Parameter
				parameters = aa.util.newHashMap(); 
				parameters.put("val1", parentAltId);
			} else {
				//if REPORT_TYPE is a Reporting Service then AltID is used
				parameters = aa.util.newHashMap();
				parameters.put("AltID", parentAltId);
			}
			report.setReportParameters(parameters);
			
			//process parameter selection and EDMS save
			if (attach == true && view == true ) {
				reportRun = aa.reportManager.runReport(parameters, reportDetail);
				showMessage = true;
				comment(reportRun.getOutput()); //attaches report
				if (email == true) {
					reportInfo.setNotSaveToEDMS(false);
					reportResult = aa.reportManager.getReportResult(report); //attaches report
					changeNameofDocument();
					if (reportResult.getSuccess()) {
						reportOut = reportResult.getOutput();
						reportOut.setName(changeNameofAttachment(reportOut.getName()));
						reportFile = aa.reportManager.storeReportToDisk(reportOut);
						if (reportFile.getSuccess()) {
							reportFile = reportFile.getOutput();
						} else {
							reportFile = "";
							error = "Report failed to store to disk.  Debug reportFile for error message.";
							logDebug(error);
						}
					} else {
						reportFile = "";
						error = "Report failed to run and store to disk.  Debug reportResult for error message.";
						logDebug(error);
					}
				} else {
					reportFile = "";
				}
			} else if (attach == true && view == false) {
				reportInfo.setNotSaveToEDMS(false);
				reportResult = aa.reportManager.getReportResult(report); //attaches report
				changeNameofDocument();
				if (reportResult.getSuccess()) {
					reportOut = reportResult.getOutput();
					reportOut.setName(changeNameofAttachment(reportOut.getName()));
					if (email == true) {
						reportFile = aa.reportManager.storeReportToDisk(reportOut);
						if (reportFile.getSuccess()) {
							reportFile = reportFile.getOutput();
						} else {
							reportFile = "";
							error = "Report failed to store to disk.  Debug reportFile for error message.";
							logDebug(error);
						}
					} else {
						reportFile = "";
					}
				} else {
					reportFile = "";
					error = "Report failed to run and store to disk.  Debug reportResult for error message.";
					logDebug(error);
				}
			} else if (attach == false && view == true) {
				reportRun = aa.reportManager.runReport(parameters, reportDetail);
				showMessage = true;
				comment(reportRun.getOutput());
				if (email == true) {
					reportInfo.setNotSaveToEDMS(true);
					reportResult = aa.reportManager.getReportResult(report);
					if (reportResult.getSuccess()) {
						reportOut = reportResult.getOutput();
						reportOut.setName(changeNameofAttachment(reportOut.getName()));
						reportFile = aa.reportManager.storeReportToDisk(reportOut);
						if (reportFile.getSuccess()) {
							reportFile = reportFile.getOutput();
						} else {
							reportFile = "";
							error = "Report failed to store to disk.  Debug reportFile for error message.";
							logDebug(error);
						}
					} else {
						reportFile = "";
						error = "Report failed to run and store to disk.  Debug reportResult for error message";
						logDebug(error);
					}
				} else {
					reportFile = "";
				}
			} else if (attach == false && view == false) {
				if (email == true) {
					reportInfo.setNotSaveToEDMS(true);
					reportResult = aa.reportManager.getReportResult(report);
					if (reportResult.getSuccess()) {
						reportOut = reportResult.getOutput();
						reportOut.setName(changeNameofAttachment(reportOut.getName()));
						reportFile = aa.reportManager.storeReportToDisk(reportOut);
						if (reportFile.getSuccess()) {
							reportFile = reportFile.getOutput();
						} else {
							reportFile = "";
							error = "Report failed to store to disk.  Debug reportFile for error message.";
							logDebug(error);
						}
					} else {
						reportFile = "";
						error = "Report failed to run and store to disk.  Debug reportResult for error message.";
						logDebug(error);
					}
				} else {
					reportFile = "";
				}
			}
		} else {
			reportFile = "";
			error = "Failed to get report information.  Check report name matches name in Report Manager.";
			logDebug(error);
		}
	} else {
		reportFile = "";
		error = "Failed to get report detail.  Check report name matches name in Report Manager.";
		logDebug(error);
	}
	function changeNameofDocument() {
		var docList = aa.document.getDocumentListByEntity(parentCapId, "CAP");
		if (docList.getSuccess()) {
			var docs = docList.getOutput();
			var idocs = docs.iterator();
			while (idocs.hasNext()) {
				var doc = idocs.next();
				var curDate = new Date();
				compareDate = new Date(curDate.setMinutes(curDate.getMinutes() - 1));
				var fileUpload = doc.getFileUpLoadDate();
				fileUpload = new Date(fileUpload.toLocaleString());
				if (compareDate <= fileUpload) {				
					docName = doc.getDocName();
					extLoc = docName.indexOf(".");
					docLen = docName.length();
					ext = docName.substr(extLoc, docLen);
					docName = name + ext;
					doc.setDocName(docName);
					doc.setFileName(docName);
					aa.document.updateDocument(doc);
				}
			}
		}
	}
	function changeNameofAttachment(attachmentName) {
		rptExtLoc = attachmentName.indexOf(".");
		rptLen = attachmentName.length();
		ext = attachmentName.substr(rptExtLoc, rptLen);
		attachName = name + ext;
		return attachName
	}
	return reportFile;
}

function convertDate(thisDate) { // convert ScriptDateTime to Javascript Date Object
	xMonth = thisDate.getMonth();
	xYear = thisDate.getYear();
	xDay = thisDate.getDayOfMonth();
	var xDate = xMonth + "/" + xDay + "/" + xYear;
	return (new Date(xDate));
}

function formatDate(thisDate) { //format ScriptDateTime to MM/dd/yyyy
	return thisDate.getMonth() + "/" + thisDate.getDayOfMonth() + "/" + thisDate.getYear();
}

function formatJSDate(thisDate) { //format javascriptDateTime to MM/dd/yyyy
	xMonth = thisDate.getMonth() + 1;
	xYear = thisDate.getFullYear();
	xDay = thisDate.getDate();
	xDate = xMonth + "/" + xDay + "/" + xYear;
	return xDate;
}

function dateFormatted(pMonth,pDay,pYear,pFormat) {//returns date string formatted as YYYY-MM-DD or MM/DD/YYYY (default)
	var mth = "";
	var day = "";
	var ret = "";
	if (pMonth > 9) {
		mth = pMonth.toString();
	} else {
		mth = "0"+pMonth.toString();
	}
	if (pDay > 9) {
		day = pDay.toString();
	} else {
		day = "0"+pDay.toString();
	}
	if (pFormat=="YYYY-MM-DD") {
		ret = pYear.toString()+"-"+mth+"-"+day;
	} else {
		ret = ""+mth+"/"+day+"/"+pYear.toString();
	}
	return ret;
}

function exists(eVal, eArray) {
	  for (ii in eArray)
	  	if (eArray[ii] == eVal) return true;
	  return false;
}

function logDebug(dstr) {
	debug+=dstr + br;
}

function logMessage(dstr) {
	message+=dstr + br;
}

function debugObject(object) {
	var output = ''; 
	for (property in object) { 
		output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" +'; ' + "<BR>"; 
	} 
	logDebug(output);
} 

function comment(cstr) {
	if (showDebug) logDebug(cstr);
	if (showMessage) logMessage(cstr);
}

function getParam(pParamName) {
	var ret = "" + aa.env.getValue(pParamName);
	logDebug("" + pParamName+": "+ret);
	return ret;
}

function elapsed() {
	var thisDate = new Date();
	var thisTime = thisDate.getTime();
	return ((thisTime - startTime) / 1000)
}