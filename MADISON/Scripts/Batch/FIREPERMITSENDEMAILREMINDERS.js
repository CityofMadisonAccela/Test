/*------------------------------------------------------------------------------------------------------/
| Program: FirePermitSendEmailReminders  	Trigger: Batch
| Client: Madison
| Version 1.0 Jane Schneider 3/26/2014
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
	var useAppSpecificGroupName = true;
	var showDebug = true; 					//Set to true to see debug messages in email confirmation
	var showMessage = false;
	var emailText = "";
	var maxMinutes = 5;
	var maxSeconds = 60 * maxMinutes; 		//number of seconds allowed for batch processing, usually < 60 * 5
	sysDate = aa.date.getCurrentDate();
	batchJobResult = aa.batchJob.getJobID();
	batchJobName = "FirePermitReminderEmails";			//"" + aa.env.getValue("BatchJobName");
	wfObjArray = null;									//Workflow tasks array passed from main to helper functions.
	var br = "<BR>";	
	var myEnvironment = "Development";
	var taskNames = new Array 

	batchJobID = 0;
	if (batchJobResult.getSuccess()) {
		batchJobID = batchJobResult.getOutput();
		logDebug(myEnvironment + " Batch Job " + batchJobName + " Job ID is " + batchJobID + br);
	} else {
		logDebug(myEnvironment + " Batch job ID not found " + batchJobResult.getErrorMessage());
	}

/*----------------------------------------------------------------------------------------------------/
|
| Start: BATCH PARAMETERS
|
/----------------------------------------------------------------------------------------------------*/

var startDate = new Date();
var timeExpired = false;
var systemUserObj = aa.person.getUser("ADMIN").getOutput();
var startTime = startDate.getTime(); // Start timer
var currentDate = convertDate(dateAdd(null,0))
var numDaysCheck = 7;

var clientEmail = "jschneider@cityofmadison.com"//									//email to send to client
var emailAddress = "jschneider@cityofmadison.com"//"elamsupport@cityofmadison.com"; //email to send report
var elamsupport = "jschneider@cityofmadison.com"//"elamsupport@cityofmadison.com";	//email for batch

var appTypeType = "Fire";
var aryWfTask = new Array();
var aryWfTaskStatus = new Array();
var capId;
var altId;
//var cap;

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
	logDebug("Current Date = " + currentDate);	
	logDebug("Start Date and Time: " + startDate);	
	logDebug("Starting the timer for this job.  If it takes longer than " + maxMinutes + " minutes an error will be listed at the bottom of the email." + br);
	if (!timeExpired) {
		mainProcess();
		logDebug("End of Job");
		logDebug("Elapsed Time : " + elapsed() + " Seconds");
		logDebug("End Date and Time: " + startDate);
	}
	aa.sendMail("noreply@cityofmadison.com", emailAddress, elamsupport, "Fire Permits Emails Info", emailText);
}
/*-----------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/-----------------------------------------------------------------------------------------------------*/
function mainProcess() {
	
//these are the three workflow task/status combinations we need to look at for Additional Info or payments that
//have been waiting on a customer response for > 7 days. We will loop through and process each set.
	logDebug("This process sends an email to the customer if the workflow request for Additional Information or payment has exceeded the workflow Status Date by more than " + numDaysCheck + "." + br);
	
	aryWfTask[0] = "Intake";
	aryWfTaskStatus[0] = "Additional Info Required";
	
	aryWfTask[1] = "Plan Review";
	aryWfTaskStatus[1] = "Additional Info Required";
	
	aryWfTask[2] = "Intake";
	aryWfTaskStatus[2] = "Send Fees Invoiced eMail";

	for (var i = 0; i < 3; i++){
			
		var capIdList = aa.cap.getCaps(appTypeType, aryWfTask[i], aryWfTaskStatus[i], "");
	
		if (capIdList.getSuccess()) {
			var fireRecs = capIdList.getOutput();
			logDebug("The number of Fire records in wf task = " + aryWfTask[i] + " and wf status = " + aryWfTaskStatus[i] + ": " + fireRecs.length + br);
									
			for (fp in fireRecs){
				if (elapsed() > maxSeconds){ 		// only continue if time hasn't expired			
					logDebug("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.") ;
					timeExpired = true ;
					break;
				}
							
				oneFireRec = fireRecs[fp];				
				capId = oneFireRec.getCapID();
				altId = capId.getCustomID();
				var aryCapType = oneFireRec.capType.toString().split("/");				
			
				//Check if record group is Permitting, and if so, continue processing.
				if (aryCapType[0].toLowerCase() == "permitting"){
					//logDebug("This is a Permitting/Fire record");
					
					//This is a Permitting/Fire record, so continue processing; get workflow info.
					wfTasks = loadTasksCustom();
					wfObjArray = wfTasks;
								
					for (var j = 0; j < wfTasks.length; j++){
						//logDebug(wfTasks[i].getTaskDescription());
						//debugObject(wfTasks[i]);
						if (wfTasks[j].processCode == "FIRSPRNK" && wfTasks[j].taskDescription == aryWfTask[i] && wfTasks[j].disposition == aryWfTaskStatus[i]){
							//logDebug("Record process code in FIRSPRNK & task/status are ones to check.")
							//Get wf task/status Status Date							
							var wfStatusDate = convertDate(dateAdd(wfTasks[j].statusDate,0));
						
							if (wfStatusDate == null || wfStatusDate == "") {
								wfStatusDate = "1/1/1900"
							}
							
							logDebug("Status Date = " + wfStatusDate);
							
							if (currentDate > convertDate(dateAdd(wfStatusDate,numDaysCheck))){
								logDebug("Waiting for customer response for > " + numDaysCheck.toString() + " days.");							
								sendReminderEmail(aryCapType[2], wfTasks[j].disposition, wfStatusDate)							
							}//end Num Days check
						}//end If FIRSPRNK wf process
					}//end For..Loop for wfTasks.									
				}//end If Permitting group for rec type.
				logDebug(br);
			}//end For...Loop for fp in fireRecs
		}else{
			logDebug("ERROR: Retrieving permits: " + capIdList.getErrorType() + ":" + capIdList.getErrorMessage());
			return false;
		}// end if(capIdList.getSuccess)...else
	}//end outer For...Loop	
}//end mainProcess()

function sendReminderEmail(permitSubType, wfStatus, wfStatusDt) {
	
	var wfStatusSubj = "";
	var wfStatusText1 = "";
	var wfStatusText2 = "";
	var bNoEmailSent = false;
	
	wfStatusDtShort = (wfStatusDt.getMonth() + 1) + "/" + wfStatusDt.getDate() + "/" + wfStatusDt.getFullYear();
	
	switch(String(wfStatus)){
		case aryWfTaskStatus[0]:
		//Additional Info
			logDebug("In Switch at " + aryWfTaskStatus[0]);
			wfStatusSubj = "Additional Information";
			wfStatusText1 = "additional information";
			wfStatusText2 = "provide the requested additional information";
			break;
		case aryWfTaskStatus[2]:
		//Send Fees Invoiced eMail
			logDebug("In Switch at " + aryWfTaskStatus[2]);
			wfStatusSubj = "Payment of Permit Fees";
			wfStatusText1 = "payment of permit fees";
			wfStatusText2 = "submit payment";
			break;
		default :
			wfStatusSubj = "None"
			break;
	}					
		
	getContactInfo();
	
	emailFrom = "noreply@cityofmadison.com";
	//emailTo = contactEmail;
	emailTo = emailAddress;
	emailCC = "";
	emailSubject = "[Madison Fire Dept] Request for " + wfStatusSubj;
	emailBody = "Hello " + contactName + ",<br><br>Our request for " + wfStatusText1 + " on " + wfStatusDtShort.toString() + 
	" for Fire " + permitSubType + " permit " + altId + " has gone unanswered.<br><br>Please " + wfStatusText2 + " immediately." + 
	"<br><br>Please call if you have any questions.<br><br>" + 
	"William Sullivan<br>Madison Fire Department<br>Phone (608)266-4420<br>Fax (608)267-1153<br>Email fire@cityofmadison.com";
			
	if (contactEmail != "No Email Address" && wfStatusSubj != "None") {		
		//aa.sendMail(emailFrom, emailTo, emailCC, emailSubject, emailBody);
	}else{
		bNoEmailSent = true;
	}

	logDebug("Permit #: " + altId);
	logDebug ("Permit Type: " + "Permitting/Fire/" + permitSubType + "/NA");
	logDebug("Applicant: " + contactBusiness + ", " + contactName + ", " + contactEmail);	
	logDebug("Workflow Status: " + wfStatus);
	logDebug("Workflow Status Date: " + wfStatusDtShort);
	logDebug(br + "Subject: " + emailSubject);
	logDebug(emailBody + "<br>");
	
	if(bNoEmailSent == true){
		logDebug("Email was NOT sent, because either no email address or workflow status.");
	}else{
		logDebug("Email was sent.");
	}
}

function getContactInfo() {
	var capContactResult = aa.people.getCapContactByCapID(capId);
	if (capContactResult.getSuccess()) {
		var capContactArray = capContactResult.getOutput();
		for (c in capContactArray) {
			var contact = capContactArray[c];
			var people = contact.getPeople();
			if (people.getContactType() == "Applicant") {
				contactEmail = people.getEmail();
				contactName = people.getContactName();
				contactBusiness = people.getBusinessName();
			}
		}
		if (contactEmail == null || contactEmail == "" ) {
			contactEmail = "No Email Address";
		}
	}
}

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/

function loadTasksCustom() {  //uses global var capId.
		
		var taskArr = new Array();

		var workflowResult = aa.workflow.getTasks(capId);
		if (workflowResult.getSuccess()){
			wfObj = workflowResult.getOutput();
			//debugObject(wfObj);				
		}else{ 
			logMessage("**ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage()); 
			return false; 
		}
		
		return wfObj
	}

function debugObject(object)
		{
		 var output = ''; 
		 for (property in object) { 
		   output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" +'; ' + "<BR>"; 
		 } 
		 logDebug(output);
		} 
		
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

function dateAdd(td, amt) {
	// perform date arithmetic on a string
	// td can be "mm/dd/yyyy" (or any string format that will convert to JS date)
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
