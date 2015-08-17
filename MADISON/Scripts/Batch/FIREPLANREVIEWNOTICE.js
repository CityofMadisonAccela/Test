/*------------------------------------------------------------------------------------------------------/
| Program: Close Out Building Permits  Trigger: Batch
| Client: Madison
| Version 1.0 Jeff Moyer 10/11/2013
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
|	//Riki 01-08-2014 Cheryl's retired now so I'm removing her as per SR-14-0000004
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
var emailAdminDate = new Date((startDate.getMonth() + 1) + "/" + startDate.getDate() + "/" 
	+ startDate.getFullYear()).getTime(); //1 day in future to compare dueDate
var fromDate = aa.date.getScriptDateTime(aa.util.parseDate((startDate.getMonth() + 1) + "/" + (startDate.getDate() - 1) + "/" 
	+ startDate.getFullYear())); //today to get any task that is due today for email administrator
var toDate = aa.date.getScriptDateTime(aa.util.parseDate((startDate.getMonth() + 1) + "/" + (startDate.getDate() + 1) + "/" 
	+ startDate.getFullYear()));  //1 day in the future to any task due tomorrow for email to assigned
var dispEmailAdminDate = jsDateToMMDDYYYY(convertDate(emailAdminDate));
var dispFromDate = jsDateToMMDDYYYY(convertDate(fromDate));
var dispToDate = jsDateToMMDDYYYY(convertDate(toDate));
var dispDueDate = new Date();

var appSubType = "";

var countProcessed = 0;
var loopCount = 0;

var emailAddress = ""; //Riki 01-08-2014 Cheryl's retired now so I'm removing her as per SR-14-0000004 //email to send report
var elamSupport = "elamSupport@cityofmadison.com";//email for batch

var emailTo = "";
var emailCC = "";
var emailSubject = "";
var emailBody = "";
var emailFrom = "noreply@cityofmadison.com";




var capId;
var altId;
var cap;
var capMod;

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

	logDebug("This process gathers all Fire Permits in Plan Review task with no status and a due date between " + dispFromDate + 
	" and " + dispToDate + " It then notifies the assigned that it is the day before the due date." + br);


	var capIdList = aa.workflow.getTasks("Plan Review", "Plan Review", fromDate, toDate)
		 
	if (capIdList.getSuccess()) {
		var capIds = capIdList.getOutput();
		logDebug("**The number of Permits: " + capIds.length + br);
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
			appTypeResult = cap.getCapType();
			appTypeString = appTypeResult.toString();
			appTypeArray = appTypeString.split("/");
			var processCap = false;
			if (appTypeArray[2] == "Alarm" || appTypeArray[2] == "AltFireSuppression" || appTypeArray[2] == "ControlledEgress" 
				|| appTypeArray[2] == "FireCommandCenter" || appTypeArray[2] == "KitchenHood" || appTypeArray[2] == "SmokeControlPanels" 
				|| appTypeArray[2] == "SmokeHeatVents" || appTypeArray[2] == "Sprinkler" || appTypeArray[2] == "Standpipe") {
				processCap = true;
				if (appTypeArray[2] == "AltFireSuppression") {
					appSubType = "Alternate Fire Suppression";
				} else if (appTypeArray[2] == "ControlledEgress") {
					appSubType = "Controlled Egress";
				} else if (appTypeArray[2] == "FireCommandCenter") {
					appSubType = "Fire Command Center";
				} else if (appTypeArray[2] == "KitchenHood") {
					appSubType = "Kitchen Hood";
				} else if (appTypeArray[2] == "SmokeControlPanels") {
					appSubType = "Smoke Control Panels";
				} else if (appTypeArray[2] == "SmokeHeatVents") {
					appSubType = "Smoke Heat Vents";
				} else {
					appSubType = appTypeArray[2];
				}
			}
			if(appTypeArray[0] == "Permitting" && appTypeArray[1] == "Fire" && processCap == true) {
				logDebug("AltId: " + altId );
				logDebug("Application Status: " + capStat);
				logDebug("Application Type: " + appTypeString);
				
				dispDueDate = dateAdd(convertDate(capIds[c].getDueDate()), 0);
				var dueDate = convertDate(capIds[c].getDueDate()).getTime();
				logDebug("Due Date: " + dispDueDate);
				if (dueDate < emailAdminDate) {
					logDebug("Notify Administrator" + br);
					prepareAndSendNotifyEmail("Administrator", null);
				} else if (dueDate > emailAdminDate) { 
					logDebug("Notify Assigned" + br);
					assigned = capIds[c].getAssignedStaff();
					userObj = aa.person.getUser(assigned.getFirstName(), assigned.getMiddleName(), assigned.getLastName());
					if (userObj.getSuccess()) {
						user = userObj.getOutput();
						prepareAndSendNotifyEmail("Assigned", user);
					} else {
						logDebug("The person assigned to the work flow task doesn't exist.");
					}
				}
			}
		}
	}
	logDebug("Loop Count: " + loopCount);
	logDebug("Processed Count: " + countProcessed);
	logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");
	
	aa.sendMail("noreply@cityofmadison.com", emailAddress, elamSupport, "Fire Permit Plan Review Notification", emailText);
}

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/

function prepareAndSendNotifyEmail(emailType, aUser) {
	emailTo = "";
	emailCC = "";
	if (emailType == "Administrator") {
		emailTo = "wsullivan@cityofmadison.com;"; //Riki 01-08-2014 Cheryl's retired now so I'm removing her as per SR-14-0000004
		emailCC = "eruckriegel@cityofmadison.com; llaurenzi@cityofmadison.com;";
	} else {
		emailTo = aUser.getEmail();
		emailCC = ""; //Riki 01-08-2014 Cheryl's retired now so I'm removing her as per SR-14-0000004
	}
	emailSubject = appSubType + " Permit (" + altId + ") Plan Review Is Due";
	emailBody = "<html><body><p>Please be advised " + appSubType  + " Permit (" + altId + ") " +
	"Plan Review is due on " + dispDueDate ".</p></body></html>"
	logDebug(tab + "Email To: " + emailTo);
	logDebug(tab + "Email CC: " + emailCC);
	logDebug(tab + "Email Subject: " + emailSubject);
	logDebug(tab + "Email Body: " + emailBody);
	if (emailTo != "") {
		aa.sendMail(emailFrom, emailTo, emailCC, emailSubject, emailBody);
	} else {
		logDebug(tab + "There isn't anyone assigned to the Plan Review work flow task" + br);
	}
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