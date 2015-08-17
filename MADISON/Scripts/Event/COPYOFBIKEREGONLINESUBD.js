/*------------------------------------------------------------------------------------------------------/
| Program: BikeOnlineNotification.js  Trigger: Batch
| Client: Madison
| Version 1.0 Matt Couper 9/11/2013
|------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var emailText = "";
var showDebug = true; // Set to true to see debug messages in email confirmation
var maxSeconds = 60 * 5; // number of seconds allowed for batch processing, usually < 5*60
var showMessage = false;
var useAppSpecificGroupName = true;
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
/------------------------------------------------------------------------------------------------------*/

var startDate = new Date();
var timeExpired = false;
var report = "";
var startTime = startDate.getTime(); // Start timer
var systemUserObj = aa.person.getUser("ADMIN").getOutput();
var timeExpired = false;

var appGroup = "Permitting"; //app Group to process {Permitting}
var appTypeType = "Traffic Engineering"; //app type to process
var appSubtype = "Bicycle Registration"; //app subtype to process
var appCategory = "NA"; //app category to process
var appType = appGroup + "/" + appTypeType + "/" + appSubtype + "/" + appCategory;
var expStatus = "Online Submittal";
var agency = "Madison";
var emailAddress = "mcouper@cityofmadison.com"; //email to send report
var elamsupport = "elamsupport@cityofmadison.com";//email for batch - will need to be changed
//var elamsupport = "mcouper@cityofmadison.com"; 
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
	logDebug("Start Date: " + jsDateToMMDDYYYY(startDate) + br);
	logDebug("Starting the timer for this job.  If it takes longer than 5 minutes an error will be listed at the bottom of the email." + br);
	if (!timeExpired) {
		mainProcess();
		logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");
		logDebug("End Date: " + startDate);
		aa.sendMail("noreply@cityofmadison.com", emailAddress, "", "Batch Job - Online Bike Applications", emailText);
	}
}
/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/
function mainProcess() {
	var toDate = new Date();
	toDate = new Date(dateAdd(toDate,-1));
	//toDate = new Date(dateAdd(toDate,0)); 
	
	var capResult = aa.cap.getByAppType("Permitting", "Traffic Engineering", "Bicycle Registration","NA");
	
	
	logDebug("This report shows all Bike Registrations submitted online " + jsDateToMMDDYYYY(toDate) + br);

	if (capResult.getSuccess()) {
		capList = capResult.getOutput();
		logDebug(br+"**The number of new Bike Permits: " + capList.length);
	} else {
		logDebug("ERROR: Retrieving permits: " + capResult.getErrorType() + ":" + capResult.getErrorMessage());
		return false;
	}
	var capResultRen = aa.cap.getByAppType("Permitting", "Traffic Engineering", "Bicycle Registration","Renewal");
	
	if (capResultRen.getSuccess()) {
		capListRen = capResultRen.getOutput();
		logDebug("**The number of Renewal Bike Permits: " + capListRen.length + br);
	} else {
		logDebug("ERROR: Retrieving permits: " + capResultRen.getErrorType() + ":" + capResultRen.getErrorMessage());
		return false;
	}
	var cntrl = 0;
	
	/*-----------------------------------
	// New Bike Registrations
	------------------------------------*/
	for (wf in capList) { 
		
		if (elapsed() > maxSeconds) { //only continue if time hasn't expired
			logDebug("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.");
			timeExpired = true;
			break;
		}

		b1WFcap = capList[wf];
		var capId = b1WFcap.getCapID();
		var custId = aa.cap.getCapID(capId.getID1(), capId.getID2(), capId.getID3()).getOutput();
		var altId = custId.getCustomID(); 
		var capStat = b1WFcap.getCapStatus();
		var capDate = b1WFcap.getFileDate();
		var capACA = b1WFcap.isCreatedByACA();
		capDate = new Date(dateAdd(capDate,0));
		
		if (capACA = true && jsDateToMMDDYYYY(capDate) == jsDateToMMDDYYYY(toDate)) {
			logDebug("New Permit - " + altId + " was submitted online on " + jsDateToMMDDYYYY(toDate) + br);
			cntrl = cntrl+1;
		}
		//else
		//{
		//	logDebug(altId + " was not submitted online (or submitted yesterday) " + toDate + br);
		//}
	}	
	
	
	/*------------------------------------
	// RENEWAL BIKE REGISTRATIONS
	-------------------------------------*/
	
	var cntrlRen = 0;
	
	for (wfRen in capListRen) { 
		
		if (elapsed() > maxSeconds) { //only continue if time hasn't expired
			logDebug("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.");
			timeExpired = true;
			break;
		}

		b1WFcap = capListRen[wfRen];
		var capId = b1WFcap.getCapID();
		var custId = aa.cap.getCapID(capId.getID1(), capId.getID2(), capId.getID3()).getOutput();
		var altId = custId.getCustomID(); 
		var capStat = b1WFcap.getCapStatus();
		var capACA = b1WFcap.isCreatedByACA();
		var capDate = b1WFcap.getFileDate();
		capDate = new Date(dateAdd(capDate,0));
		
		if (capACA = true && jsDateToMMDDYYYY(capDate) == jsDateToMMDDYYYY(toDate)) {
			logDebug("Renewal Permit - " + altId + " was submitted online on " + jsDateToMMDDYYYY(toDate) + br);
			cntrlRen = cntrlRen+1;
		}
		//else
		//{
		//	logDebug(altId + " was not submitted online (or submitted yesterday) " + toDate + br);
		//}
	}	
	
	if ( cntrl >= 1 || cntrlRen >= 1) {
	
	logDebug("**The number of NEW Bike Permits Submitted Online Yesterday: " + cntrl);
	logDebug("**The number of RENEWAL Bike Permits Submitted Online Yesterday: " + cntrlRen + br);
	
	aa.sendMail("noreply@cityofmadison.com", emailAddress, "", "Bike permit online application daily report", emailText);
	
	}
aa.sendMail("noreply@cityofmadison.com", elamsupport, "", "Bike permit online application daily report", emailText);
}

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/


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