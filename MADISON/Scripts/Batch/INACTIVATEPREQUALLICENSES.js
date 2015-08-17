/*------------------------------------------------------------------------------------------------------/
| Program: InactivatePrequalLicenses.js  Trigger: Batch
| Client: Madison
| Version 1.0 Jane Schneider 4/24/2015
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var emailText = "";
var showDebug = true;
var showMessage = false;
var useAppSpecificGroupName = true;
var br = "<BR>";
var tab = "    ";

var maxSeconds = 5 * 60;							// number of seconds allowed for batch processing, usually < 5*60
sysDate = aa.date.getCurrentDate();

batchJobResult = aa.batchJob.getJobID();
batchJobName = "" + aa.env.getValue("BatchJobName");

batchJobID = 0;
sEnvironment = "Dev";  //Dev, Test, Production

if (batchJobResult.getSuccess()) {
	batchJobID = batchJobResult.getOutput();
	logDebug("Batch Job: " + batchJobName + br + "Job ID: " + batchJobID);
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
var startTime = startDate.getTime();			// Start timer
var systemUserObj = aa.person.getUser("ADMIN").getOutput();

var emailFrom = "noreply@cityofmadison.com";
//var emailTo = "japien@cityofmadison.com"; //email to send report
var emailTo = "jschneider@cityofmadison.com"
var emailCc = "elamsupport@cityofmadison.com";//email for batch

var capId;
var altId;
var appStatus;
var appStatusDate;
var strRecStatusDate;
var dtAppStatusDate;
var dtToday;
var dtSixMonthDate;
var strSixMonthDate;
var statusInactive = "Inactive";  
var recsInactivatedCnt = 0;
var contactBizName = "No business Name";
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
var currentMonth = sysDate.getMonth();
//logDebug("Current date = " + sysDate.getDayOfMonth());	
//logDebug("Current year = " + sysDate.getYear());
		
if (paramsOK) {
/************************************************************************************************************************************
		Janet Pien in Engineering wants this script to run once every three months (once/quarter), but Batch Job scheduler doesn't 
		have that option. Thus, the batch job is scheduled to run every month on the 30th. Thus, the script bombs out if month 
		is not March, June, September, or December,
************************************************************************************************************************************/
	if (currentMonth == 3 || currentMonth == 6 || currentMonth == 9 || currentMonth == 12){		
		logDebug("Start Date/Time: " + startDate + br);
		mainProcess();	
		logDebug("End Date/Time: " + new Date());
		logDebug("End of Job. Elapsed Time: " + elapsed() + " seconds");	
		aa.sendMail(emailFrom, emailTo, emailCc, "Prequal Records Set to Inactive - " + sEnvironment + " Results", emailText);
		//aa.sendMail(emailFrom, emailTo, emailCc, batchJobName + " - " + sEnvironment + " Results", emailText);
	}else{
		logDebug("The InactivatePrequalLicenses batch script runs only once a quarter at the end of March(3), June(6), Sept(9), Dec(12), and the current month is " + currentMonth + ".");
	}
}
/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/
function mainProcess() {
	logDebug("This process inactivates Prequal license records that have been sitting in Additional Info Required, Pending, or Open status for longer than 6 months." + br);
	
	dtToday = new Date();	
	dtSixMonthDate = new Date(dateAdd(dtToday, -183));
	strSixMonthDate = jsDateToMMDDYYYY(dtSixMonthDate);		
	logDebug("6 Months Past Date: " + strSixMonthDate);
	
	var lpResult = aa.cap.getByAppType("Licenses", "Engineering", "Prequalified Contractor", "Na");
	
	if (lpResult.getSuccess()) {
		lps = lpResult.getOutput();
		logDebug("Number of Prequal records found: " + lps.length + br);
	} else {
		logDebug("ERROR: Retrieving permits: " + lpResult.getErrorType() + ":" + lpResult.getErrorMessage());
		return false;
	}
		
	logDebug("List of Prequal records set to Inactive: " + br);
	
	for (lp in lps) {	

		if (elapsed() > maxSeconds){ // only continue if time hasn't expired			
			logDebug("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.") ;
			timeExpired = true ;
			break;
		}
			
		b1App = lps[lp];		
		var b1CapId = b1App.getCapID();		
		capId = aa.cap.getCapID(b1CapId.getID1(), b1CapId.getID2(), b1CapId.getID3()).getOutput();
		altId = capId.getCustomID();
		cap = aa.cap.getCap(capId).getOutput();
		capMod = cap.getCapModel();		
		
		if (cap) {
			appStatus = cap.getCapStatus();
			appStatusDate = capMod.capStatusDate;			
			
			if (appStatus == "Additional Info Required" || appStatus == "Pending" || appStatus == "Open" ) {
				//if (altId == "LPC2010000-00445") {					
					strRecStatusDate = (appStatusDate.getMonth() + 1) + "/" + appStatusDate.getDate() + "/" + (appStatusDate.getYear() + 1900);					
					dtAppStatusDate = new Date(strRecStatusDate);					

					if (dtAppStatusDate < dtSixMonthDate){
						getContactInfo();
						logDebug("Contractor Business Name: " + contactBizName)
						logDebug("Prequal License: " + altId);
						logDebug("Record Status & Status Date: " + appStatus + ", " + strRecStatusDate);						
						//logDebug("Record Status Date is older than 6 months, so inactivate record");
						updateAppStatus(statusInactive, "Updated by batch script");
                       	licEditExpInfo(statusInactive, null);
						logDebug("Updated Record & Renewal Expiration status to " + statusInactive + ".");
						recsInactivatedCnt++;						
						logDebug("");
					}					
				//} //End specific rec test.
			}
		}
	}
	logDebug("Total Prequal records set to Inactive: " + recsInactivatedCnt);
}

function getContactInfo() {
	
	var capContactResult = aa.people.getCapContactByCapID(capId);
	
	if (capContactResult.getSuccess()) {
		var capContactArray = capContactResult.getOutput();
		for (c in capContactArray) {
			var contact = capContactArray[c];
			var people = contact.getPeople();
			if (people.getContactType() == "Contractor") {
				//contactEmail = people.getEmail();
				//contactName = people.getContactName();
				contactBizName = people.getBusinessName();
			}
		}
	}
}

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/
function updateAppStatus(stat,cmt){

	updateStatusResult = aa.cap.updateAppStatus(capId,"APPLICATION",stat, sysDate, cmt ,systemUserObj);
	if (!updateStatusResult.getSuccess())
		//logDebug("Updated application status to " + stat + " successfully.");
//	else
		logDebug("ERROR: application status update to " + stat + " was unsuccessful.  The reason is "  + updateStatusResult.getErrorType() + ":" + updateStatusResult.getErrorMessage());
}

function licEditExpInfo (pExpStatus, pExpDate){
	//Edits expiration status and/or date
	//Needs licenseObject function
	//06SSP-00238
	//
	var lic = new licenseObject(null);
	if (pExpStatus!=null)
		{
		lic.setStatus(pExpStatus);
		}
		
	if (pExpDate!=null)
		{
		lic.setExpiration(pExpDate);
		}
}

function licenseObject(licnumber){ // optional renewal Cap ID -- uses the expiration on the renewal CAP.

	itemCap = capId;
	if (arguments.length == 2) itemCap = arguments[1]; // use cap ID specified in args


	this.refProf = null;		// licenseScriptModel (reference licensed professional)
	this.b1Exp = null;		// b1Expiration record (renewal status on application)
	this.b1ExpDate = null;
	this.b1ExpCode = null;
	this.b1Status = null;
	this.refExpDate = null;
	this.licNum = licnumber;	// License Number

	// Load the reference License Professional if we're linking the two
	if (licnumber) // we're linking
		{
		var newLic = getRefLicenseProf(licnumber)
		if (newLic)
				{
				this.refProf = newLic;
				tmpDate = newLic.getLicenseExpirationDate();
				if (tmpDate)
						this.refExpDate = tmpDate.getMonth() + "/" + tmpDate.getDayOfMonth() + "/" + tmpDate.getYear();
				logDebug("Loaded reference license professional with Expiration of " + this.refExpDate);
				}
		}

   	// Load the renewal info (B1 Expiration)

   	b1ExpResult = aa.expiration.getLicensesByCapID(itemCap)
   		if (b1ExpResult.getSuccess())
   			{
   			this.b1Exp = b1ExpResult.getOutput();
			tmpDate = this.b1Exp.getExpDate();
			if (tmpDate)
				this.b1ExpDate = tmpDate.getMonth() + "/" + tmpDate.getDayOfMonth() + "/" + tmpDate.getYear();
			this.b1Status = this.b1Exp.getExpStatus();
			logDebug("Found renewal record of status : " + this.b1Status + ", Expires on " + this.b1ExpDate);
			}
		else
			{ logDebug("**ERROR: Getting B1Expiration Object for Cap.  Reason is: " + b1ExpResult.getErrorType() + ":" + b1ExpResult.getErrorMessage()) ; return false }

   	this.setExpiration = function(expDate)
   		// Update expiration date
   		{
   		var expAADate = aa.date.parseDate(expDate);

   		if (this.refProf) {
   			this.refProf.setLicenseExpirationDate(expAADate);
   			aa.licenseScript.editRefLicenseProf(this.refProf);
   			logDebug("Updated reference license expiration to " + expDate); }

   		if (this.b1Exp)  {
 				this.b1Exp.setExpDate(expAADate);
				aa.expiration.editB1Expiration(this.b1Exp.getB1Expiration());
				logDebug("Updated renewal to " + expDate); }
   		}

	this.setIssued = function(expDate)
		// Update Issued date
		{
		var expAADate = aa.date.parseDate(expDate);

		if (this.refProf) {
			this.refProf.setLicenseIssueDate(expAADate);
			aa.licenseScript.editRefLicenseProf(this.refProf);
			logDebug("Updated reference license issued to " + expDate); }

		}
		
	this.setLastRenewal = function(expDate)
		// Update expiration date
		{
		var expAADate = aa.date.parseDate(expDate)

		if (this.refProf) {
			this.refProf.setLicenseLastRenewalDate(expAADate);
			aa.licenseScript.editRefLicenseProf(this.refProf);
			logDebug("Updated reference license issued to " + expDate); }
		}

	this.setStatus = function(licStat)
		// Update expiration status
		{
		if (this.b1Exp)  {
			this.b1Exp.setExpStatus(licStat);
			aa.expiration.editB1Expiration(this.b1Exp.getB1Expiration());
			//logDebug("Updated renewal to status " + licStat); 
			}
		}

	this.getStatus = function()
		// Get Expiration Status
		{
		if (this.b1Exp) {
			return this.b1Exp.getExpStatus();
			}
		}

	this.getCode = function()
		// Get Expiration Status
		{
		if (this.b1Exp) {
			return this.b1Exp.getExpCode();
			}
		}
}

//Batch version of function
function taskEditStatus(wfstr,wfstat,wfcomment,wfnote,pFlow,pProcess){
	//Needs isNull function
	//pProcess not coded yet
	//
	pFlow = isNull(pFlow,"U"); //If no flow control specified, flow is "U" (Unchanged)
	var dispositionDate = aa.date.getCurrentDate();

	for (i in wfObjArray)
	{
 		if ( wfstr.equals(wfObjArray[i].getTaskDescription()) )
			{
			var stepnumber = wfObjArray[i].getStepNumber();
			aa.workflow.handleDisposition(capId,stepnumber,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj,pFlow);
			logDebug("Updating Workflow Task: " + wfstr + " with status " + wfstat);
			}
	}
}

function getAppSpecific(itemName) { // optional: itemCap
	var updated = false;
	var i=0;
	var itemCap = capId;
	if (arguments.length == 2) itemCap = arguments[1]; // use cap ID specified in args
	
	if (useAppSpecificGroupName) {
		if (itemName.indexOf(".") < 0) {
			logDebug("**WARNING: editAppSpecific requires group name prefix when useAppSpecificGroupName is true"); 
			return false 
		}
		var itemGroup = itemName.substr(0,itemName.indexOf("."));
		var itemName = itemName.substr(itemName.indexOf(".")+1);
	}
	
	var appSpecInfoResult = aa.appSpecificInfo.getByCapID(itemCap);
	if (appSpecInfoResult.getSuccess()) {
		var appspecObj = appSpecInfoResult.getOutput();
		if (itemName != "") {
			for (i in appspecObj) {
				if( appspecObj[i].getCheckboxDesc() == itemName && (!useAppSpecificGroupName || appspecObj[i].getCheckboxType() == itemGroup) )
				{
					return appspecObj[i].getChecklistComment();
					break;
				}
			}
		}
	} else { 
		logDebug( "**ERROR: getting app specific info for Cap : " + appSpecInfoResult.getErrorMessage())
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