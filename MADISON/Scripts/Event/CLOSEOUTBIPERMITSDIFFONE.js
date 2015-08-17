/*------------------------------------------------------------------------------------------------------/
| Program: Close Out Building Permits  Trigger: Batch
| Client: Madison
| Version 1.0 Matt Couper 8/29/2013
| Version 2.0 Jeff Moyer 9/17/2013
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var maxMinutes = 5;
var maxSeconds = 60 * maxMinutes; //number of seconds allowed for batch processing, usually < 60 * 5
var showDebug = true; //Set to true to see debug messages in email confirmation
var showMessage = false;
var useAppSpecificGroupName = true;
var emailText = "";
var br = "<BR>";
var tab = "    ";

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
/----------------------------------------------------------------------------------------------------*/

var systemUserObj = aa.person.getUser("ADMIN").getOutput();
var timeExpired = false;
var startDate = new Date();
var startTime = startDate.getTime(); // Start timer
var compareDate = new Date(dateAddMonths((startDate.getMonth() + 1).toString() + "/" + startDate.getDate() + "/" + 
	startDate.getFullYear(), - 6)); //6 months ago to compare issueDate
var fromDate = aa.date.getScriptDateTime(aa.util.parseDate((startDate.getMonth() - 6).toString() + "/" + startDate.getDate() + "/" + 
	startDate.getFullYear())); //9 months ago
//var fromDate = aa.date.getScriptDateTime(aa.util.parseDate("1/1/2008"));
var toDate = aa.date.getScriptDateTime(aa.util.parseDate((startDate.getMonth() - 5).toString() + "/" + startDate.getDate() + "/" + 
	startDate.getFullYear())); //6 months ago
var dispCompareDate = jsDateToMMDDYYYY(convertDate(compareDate));
var dispFromDate = jsDateToMMDDYYYY(convertDate(fromDate));
var dispToDate = jsDateToMMDDYYYY(convertDate(toDate));

var countProcessed = 0;
var loopCount = 0;

var clientEmail = "jmoyer@cityofmadison.com"; //email to send to client
var emailAddress = "jmoyer@cityofmadison.com";//email to send report
var elamsupport = "elamsupport@cityofmadison.com";//email for batch

var capId;
var altId;
var cap;
var capMod;
var capIDString;
var storeReportFile = "";

/*----------------------------------------------------------------------------------------------------/
|
| End: BATCH PARAMETERS
|
/----------------------------------------------------------------------------------------------------*/
/*----------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/----------------------------------------------------------------------------------------------------*/
var paramsOK = true;

if (paramsOK) {
	logDebug("Start Date: " + startDate + br);
	logDebug("Starting the timer for this job.  If it takes longer than " + maxMinutes + " minutes an error will be listed at the bottom of the email." + br);
	if (!timeExpired) {
		mainProcess();
		logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");
		logDebug("End Date: " + startDate);
	}
}
/*-----------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/-----------------------------------------------------------------------------------------------------*/
function mainProcess() {

	logDebug("This process gathers all Building Inspection Permits in Permit Issuance with a status of Issued between " + dispFromDate + 
	" and " + dispToDate + " It then closes building permits that have difficulty factor of 1 and issued before " + dispCompareDate + "." + br);

	var capIdList = aa.workflow.getTasks("Permit Issuance", "Issued", fromDate, toDate)
		 
	if (capIdList.getSuccess()) {
		var capIds = capIdList.getOutput();
		logDebug("**The number of Building Permits: " + capIds.length + br);
	} else {
		logDebug("ERROR: Retrieving permits: " + capIdList.getErrorType() + ":" + capIdList.getErrorMessage());
		return false;
	}
	for (c = 0; c < capIds.length; c++) {
		loopCount++;
		if (elapsed() > maxSeconds) { //only continue if time hasn't expired
			logDebug("A script time-out has caused partial completion of this process.  Please re-run.  " + elapsed() + 
				" seconds elapsed, " + maxSeconds + " allowed.");
			timeExpired = true;
			break;
		}
		var cCapId = capIds[c].getCapID().toString();
		var capIdArray = cCapId.split("-");
		capId = aa.cap.getCapID(capIdArray[0], capIdArray[1], capIdArray[2]).getOutput();
		altId = capId.getCustomID();
		cap = aa.cap.getCap(capId).getOutput();
		if (cap) {
			var capStat = cap.getCapStatus();
			if (capStat == "Issued") {
				appTypeResult = cap.getCapType();
				appTypeString = appTypeResult.toString();
				appTypeArray = appTypeString.split("/");
				if(appTypeArray[0] == "Permitting" && appTypeArray[1] == "Building") {
					var diffFactor = getAppSpecific("OFFICIAL USE ONLY.Difficulty Factor", capId);
					if (diffFactor == "undefined") {
						diffFactor = 0;
					}
					if (diffFactor == "1") {
						capMod = cap.getCapModel();
						var statDate = "1/1/1900"//capMod.getCapStatusDate();
						if (statDate == null || statDate == "") {
							statDate = "1/1/1900"
						}
						var issueDate = convertDate(statDate.toLocaleString());
						if (issueDate < compareDate) {
							var detail = aa.cap.getCapDetail(capId);
							var det;
							var assignId;
							var user;
							var name;
							var assigned;
							if (detail.getSuccess()) {
								det = detail.getOutput();
								assignId = det.getAsgnStaff();								
								user  = aa.person.getUser(assignId);
								if (user.getSuccess()) {
									name = user.getOutput();
									assigned = name.getFirstName() + " " + name.getLastName();
								}
							}
							if (countProcessed == 0) {
								capIDString = altId;
							} 
                            //else {
								//capIDString += "," + altId;
							//}
							updateAppStatus("Closed","Set to Closed by Expire batch process.");
							taskCloseAllNotComplete("Closed", "Closed by Script", capId);
							countProcessed++
							logDebug("AltId: " + altId + " was closed.");
							logDebug("Issue Date: " + issueDate);
							logDebug("Assigned: " + assigned + br);
						}
					}
				}
			}
		}
	}
	logDebug("Loop Count: " + loopCount);
	logDebug("Processed Count: " + countProcessed);
	logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");
	if (countProcessed > 0) {
		storeReportFile = reportRunSave("Permit Close List", false, false, true);
	}
	if (storeReportFile != "") {
		aa.sendEmail("noreply@cityofmadison.com", clientEmail, elamsupport
		, "Building Permit, Difficulty 1, Close Report"
		, "The attachment on this report lists the recently closed permits ordered by Inspector", storeReportFile);
	} else {
		logDebug("Report was not run");
	}
	aa.sendMail("noreply@cityofmadison.com", emailAddress, elamsupport, "Building Permit, Difficulty 1, Close Report", emailText);
}

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/

function updateAppStatus(stat,cmt) {
	updateStatusResult = aa.cap.updateAppStatus(capId,"APPLICATION",stat, sysDate, cmt ,systemUserObj);
	if (!updateStatusResult.getSuccess()) {
		logDebug("ERROR: application status update to " + stat + " was unsuccessful.  The reason is "  + 
		updateStatusResult.getErrorType() + ":" + updateStatusResult.getErrorMessage());
	} else {
		logDebug("Application Status updated to " + stat);
	}
}

function getAppSpecific(itemName) { //optional: itemCap
	var updated = false;
	var i = 0;
	var itemCap = capId;
	if (arguments.length == 2) itemCap = arguments[1]; // use cap ID specified in args
	if (useAppSpecificGroupName) {
		if (itemName.indexOf(".") < 0) {
			logDebug("**WARNING: editAppSpecific requires group name prefix when useAppSpecificGroupName is true"); 
			return false 
		}
		var itemGroup = itemName.substr(0,itemName.indexOf("."));
		var itemName = itemName.substr(itemName.indexOf(".") + 1);
	}
	var appSpecInfoResult = aa.appSpecificInfo.getByCapID(itemCap);
	if (appSpecInfoResult.getSuccess()) {
		var appspecObj = appSpecInfoResult.getOutput();
		if (itemName != "") {
			for (i in appspecObj) {
				if (appspecObj[i].getCheckboxDesc() == itemName && (!useAppSpecificGroupName || appspecObj[i].getCheckboxType() == itemGroup)) {
					return appspecObj[i].getChecklistComment();
					break;
				}
			}
		}
	} else { 
		logDebug( "**ERROR: getting app specific info for Cap : " + appSpecInfoResult.getErrorMessage())
	}
}

function taskCloseAllNotComplete(pStatus, pComment) {
	var taskArray = new Array();
	var workflowResult = aa.workflow.getTasks(capId);
 	if (workflowResult.getSuccess()) {
  	 	var wfObj = workflowResult.getOutput();
	} else { 
		logDebug("**ERROR: Failed to get workflow object: " + workflowResult.getErrorMessage()); 
		return false; 
	}
	var fTask;
	var stepnumber;
	var processID;
	var dispositionDate = aa.date.getCurrentDate();
	var wfnote = " ";
	var wftask;
	for (i in wfObj) {
		fTask = wfObj[i];
		wftask = fTask.getTaskDescription();
		stepnumber = fTask.getStepNumber();
		processID = fTask.getProcessID();
		if (wftask.equals("Inspection") || wftask.equals("Certificate of Occupancy") || wftask.equals("Closed")) {
			if (fTask.getCompleteFlag().equals("N")) {
					aa.workflow.handleDisposition(capId, stepnumber, pStatus, dispositionDate, wfnote, pComment, systemUserObj,"Y");
					logDebug("Closing Work flow Task " + wftask + " with status " + pStatus);
			}
		}
	}
}

//ITJSM added 8/8/2013
function reportRunSave(reportName, view, edmsSave, storeToDisk) {
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
			report.setCapId(capId);
			reportInfo = report.getReportInfoModel();
			
			//set parameters
			if (reportDetail.getReportType().equals("URL_Report")) {
				//if REPORT_TYPE = URL_Report then val1 is Report Parameter
				parameters = aa.util.newHashMap(); 
				parameters.put("val1", capIDString);
			} else {
				//if REPORT_TYPE is a Reporting Service then AltID is used
				parameters = aa.util.newHashMap();
				parameters.put("AltID", capIDString);
			}
			report.setReportParameters(parameters);
			
			//process parameter selection and EDMS save
			if (edmsSave == true && view == true ) {
				reportRun = aa.reportManager.runReport(parameters, reportDetail);
				showMessage = true;
				comment(reportRun.getOutput()); //attaches report
				if (storeToDisk == true) {
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
			} else if (edmsSave == true && view == false) {
				reportInfo.setNotSaveToEDMS(false);
				reportResult = aa.reportManager.getReportResult(report); //attaches report
				changeNameofDocument();
				if (reportResult.getSuccess()) {
					reportOut = reportResult.getOutput();
					reportOut.setName(changeNameofAttachment(reportOut.getName()));
					if (storeToDisk == true) {
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
			} else if (edmsSave == false && view == true) {
				reportRun = aa.reportManager.runReport(parameters, reportDetail);
				showMessage = true;
				comment(reportRun.getOutput());
				if (storeToDisk == true) {
					reportInfo.setNotSaveToEDMS(true);
					reportResult = aa.reportManager.getReportResult(report);
					if (reportResult.getSuccess()) {
						reportResult = reportResult.getOutput();
						reportResult.setName(changeNameofAttachment(reportResult.getName()));
						reportFile = aa.reportManager.storeReportToDisk(reportResult);
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
			} else if (edmsSave == false && view == false) {
				if (storeToDisk == true) {
					reportInfo.setNotSaveToEDMS(true);
					reportResult = aa.reportManager.getReportResult(report);
					if (reportResult.getSuccess()) {
						reportResult = reportResult.getOutput();
						reportResult.setName(changeNameofAttachment(reportResult.getName()));
						reportFile = aa.reportManager.storeReportToDisk(reportResult);
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
		var docList = aa.document.getDocumentListByEntity(capId, "CAP");
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

function dateAdd(td, amt) {
	// perform date arithmetic on a string
	// td can be "mm/dd/yyyy" (or any string that will convert to JS date)
	// amt can be positive or negative (5, -3) days
	// if optional parameter #3 is present, use working days only
	var useWorking = false;
	if (arguments.length == 3) {
		useWorking = true;
	}
	if (!td) {
		dDate = new Date();
	} else {
		dDate = convertDate(td);
	}
	var i = 0;
	if (useWorking) {
		if (!aa.calendar.getNextWorkDay) {
			logDebug("getNextWorkDay function is only available in Accela Automation 6.3.2 or higher.");
			while (i < Math.abs(amt)) {
				dDate.setTime(dDate.getTime() + (1000 * 60 * 60 * 24 * (amt > 0 ? 1 : -1)));
				if (dDate.getDay() > 0 && dDate.getDay() < 6) {
					i++
				}
			}
		} else {
			while (i < Math.abs(amt)) {
				dDate = new Date(aa.calendar.getNextWorkDay(aa.date.parseDate(dDate.getMonth() + 1 + "/" + dDate.getDate() + "/" + dDate.getFullYear())).getOutput().getTime());
				i++;
			}
		}
	} else {
		dDate.setTime(dDate.getTime() + (1000 * 60 * 60 * 24 * amt));
	}
	return (dDate.getMonth() + 1) + "/" + dDate.getDate() + "/" + dDate.getFullYear();
}

function dateAddMonths(pDate, pMonths) {
	// Adds specified # of months (pMonths) to pDate and returns new date as string in format MM/DD/YYYY
	// If pDate is null, uses current date
	// pMonths can be positive (to add) or negative (to subtract) integer
	// If pDate is on the last day of the month, the new date will also be end of month.
	// If pDate is not the last day of the month, the new date will have the same day of month, unless such a day doesn't exist in the month,
	// in which case the new date will be on the last day of the month
	if (!pDate) {
		baseDate = new Date();
	} else {
		baseDate = convertDate(pDate);
	}
	var day = baseDate.getDate();
	baseDate.setMonth(baseDate.getMonth() + pMonths);
	if (baseDate.getDate() < day) {
		baseDate.setDate(1);
		baseDate.setDate(baseDate.getDate() - 1);
	}
	return ((baseDate.getMonth() + 1) + "/" + baseDate.getDate() + "/" + baseDate.getFullYear());
}

function convertDate(thisDate) {
	//converts date to javascript date
	if (typeof(thisDate) == "string") {
		var retVal = new Date(String(thisDate));
		if (!retVal.toString().equals("Invalid Date"))
			return retVal;
	}
	if (typeof(thisDate) == "object") {
		if (!thisDate.getClass) { // object without getClass, assume that this is a javascript date already
			return thisDate;
		}
		if (thisDate.getClass().toString().equals("class com.accela.aa.emse.util.ScriptDateTime")) {
			return new Date(thisDate.getMonth() + "/" + thisDate.getDayOfMonth() + "/" + thisDate.getYear());
		}
		if (thisDate.getClass().toString().equals("class java.util.Date")) {
			return new Date(thisDate.getTime());
		}
		if (thisDate.getClass().toString().equals("class java.lang.String")) {
			return new Date(String(thisDate));
		}
	}
	if (typeof(thisDate) == "number") {
		return new Date(thisDate); // assume milliseconds
	}
	logDebug("**WARNING** convertDate cannot parse date : " + thisDate);
	return null;
}

function jsDateToMMDDYYYY(pJavaScriptDate) {
	//converts javascript date to string in MM/DD/YYYY format
	if (pJavaScriptDate != null) {
		if (Date.prototype.isPrototypeOf(pJavaScriptDate)) {
			return (pJavaScriptDate.getMonth() + 1).toString() + "/" + pJavaScriptDate.getDate() + "/" + pJavaScriptDate.getFullYear();
		} else {
			logDebug("Parameter is not a javascript date");
			return ("INVALID JAVASCRIPT DATE");
		}
	} else {
		logDebug("Parameter is null");
		return ("NULL PARAMETER VALUE");
	}
}

function debugObject(object) {
	var output = '';
	for (property in object) {
		output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" + '; ' + "<BR>";
	}
	logDebug(output);
}

function elapsed() {
	var thisDate = new Date();
	var thisTime = thisDate.getTime();
	return ((thisTime - startTime) / 1000)
}

function logDebug(dstr) {
	if (showDebug) {
		aa.print(dstr)
		emailText += dstr + "<br>";
		aa.debug(aa.getServiceProviderCode() + " : " + aa.env.getValue("CurrentUserID"), dstr)
	}
}

function comment(cstr) {
	if (showDebug) logDebug(cstr);
	if (showMessage) logMessage(cstr);
}