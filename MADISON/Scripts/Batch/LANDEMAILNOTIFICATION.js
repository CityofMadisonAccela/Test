/*------------------------------------------------------------------------------------------------------/
| Program: LandNotification.js  Trigger: Batch
| Client: Madison
| Version 1.0 Jeff Moyer 6/25/2013
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
var startTime = startDate.getTime(); // Start timer
var systemUserObj = aa.person.getUser("ADMIN").getOutput();
var emailAddress = "jmoyer@cityofmadison.com";//"japien@cityofmadison.com"; //email to send report
var elamSupport = "";//"elamsupport@cityofmadison.com";//email for batch

var emailTo = "";
var emailCC = "";
var emailSubject = "";
var emailBody = "";
var emailFrom = "noreply@cityofmadison.com";
var capId;
var altId;
var appStatus;
var certInsuranceDate;
var elevenBDate;
var contactEmail = "No Email Address";
var contactName = "No Name";
var contactBusiness = "No business Name";
var expireDate = new Date();
var aboutToExpireDate = new Date(dateAdd((expireDate.getMonth() + 1) + "/" + expireDate.getDate() + "/" + expireDate.getFullYear(), + 21));
var dontSendEmailDate = new Date(dateAdd((expireDate.getMonth() + 1) + "/" + expireDate.getDate() + "/" + expireDate.getFullYear(), - 28));
var landTypes = new Array("Minor Alteration", "Permitted Use");
var landSubTypes = new Array("Site Plan Review", "Conditional Use", "PUDSIP");
var b = false;

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
	logDebug("Start Date: " + startDate + br);
	mainProcess();
	logDebug("End Date: " + startDate);
	aa.sendMail("noreply@cityofmadison.com", emailAddress, elamSupport, "PreQual About to Expire Report", emailText);
}
/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/
function mainProcess() 
{
	logDebug("This process sends and email to the Contractor if the Certificate of Insurance Expiration Date or the 11B Bond Expiration Date " +
	"are about to expire (3 weeks before expiration) or expired." + br);
	logDebug("Expire Date: " + expireDate);
	logDebug("About to Expire Date: " + aboutToExpireDate);
	logDebug("Don't Send Email Date: " + dontSendEmailDate);

	for (typ in landTypes)
	{
		for (sType in landSubTypes) 
		{
			processSubType(landTypes[typ], landSubTypes[sType]);
		}
	}
}

function processSubType(type, subType) 
{
	logDebug("Checking for record type: Land, " + type + ", " + subType + ", NA");
	var result = aa.cap.getByAppType("Land", type, subType, "NA");
	if (result.getSuccess()) 
	{
		records = result.getOutput();
		logDebug("The number of records: " + records.length + br);
	} 
	else 
	{
		logDebug("ERROR: Retrieving permits: " + result.getErrorType() + ":" + result.getErrorMessage());
		return false;
	}
	
	for (record in records) 
	{
		b1App = records[record];
		var b1CapId = b1App.getCapID();
		capId = aa.cap.getCapID(b1CapId.getID1(), b1CapId.getID2(), b1CapId.getID3()).getOutput();
		altId = capId.getCustomID();
		cap = aa.cap.getCap(capId).getOutput();
		if (cap) 
		{
			appStatus = cap.getCapStatus();
			if (appStatus != "Closed" || appStatus != "Void") 
			{
				var workflowResult = aa.workflow.getTasks(capId);
				if (workflowResult.getSuccess())
				{
					var wfObj = workflowResult.getOutput();
					for (task in wfObj)
					{
						var fTask = wfObj[task];
						var wfTask = fTask.getTaskDescription();
						var wfDueDate = convertDate(fTask.getDueDate());
						var wfdDate = fTask.getDueDate().getClass();
						logDebug(wfTask + " " + wfDueDate);
						//debugObject(wfdDate);
						b = true;
						break;
						
					}
				}
				else
				{ 
					logMessage("**ERROR: Failed to get workflow object: " + workflowResult.getErrorMessage());
				}
				if (b)
				{
					break;
				}
				/*
				//gather data
				var dontProcess = false;
				catA = getAppSpecific("CATEGORIES.A", capId);
				certInsuranceDate = getAppSpecific("LICENSE INFORMATION.Certificate of Insurance Expiration Date", capId);
				elevenBDate = getAppSpecific("LICENSE INFORMATION.11B Expiration", capId);
				if (certInsuranceDate != null) {
					var cInsDate = new Date(certInsuranceDate);
				} else {
					var cInsDate = new Date("01/01/" + (expireDate.getFullYear() + 2));
				}
				if (elevenBDate != null && catA == "CHECKED") {
					var eBDate = new Date(elevenBDate);
				} else {
					var eBDate = new Date("01/01/" + (expireDate.getFullYear() + 2));
				}
				
				//process incomplete license
				if ((elevenBDate == null && catA == "CHECKED") || certInsuranceDate == null) {
					getContactInfo();
					emailTo = "jmoyer@cityofmadison.com";//"japien@cityofmadison.com;"; 
					emailCC = " ";
					emailSubject = "Review Prequalified Contractor License: " + altId;
					emailBody = "Janet,<br>Please review license " + altId + " for contractor " + contactBusiness + ".<br>" +
					"Either the Certificate of Insurance Expiration Date or the 11B Bond Expiration date does not have a value " +
					"and the license is Active.";
					dontProcess == true;
					aa.sendMail(emailFrom, emailTo, emailCC, emailSubject, emailBody);
				}
				
				if (dontProcess == false) {
					//process about to expire				
					var certAboutExpire = false;
					var eBondAboutExpire = false;
					var bothAboutExpire = false;
					if (cInsDate < aboutToExpireDate && cInsDate > expireDate) {
						certAboutExpire = true;
						if (eBDate < aboutToExpireDate && eBDate > expireDate) {
							bothAboutExpire = true;
						}
					}
					if (eBDate < aboutToExpireDate && eBDate > expireDate) {
						eBondAboutExpire = true;
						if (cInsDate < aboutToExpireDate && cInsDate > expireDate) {
							bothAboutExpire = true;
						}
					}
					if (bothAboutExpire == true || eBondAboutExpire == true || certAboutExpire == true) {
						aboutExpireEmail(bothAboutExpire, eBondAboutExpire, certAboutExpire);
					}
					//process expired
					var certExpire = false;
					var eBondExpire = false;
					var bothExpire = false;				
					if (cInsDate < expireDate && cInsDate > dontSendEmailDate) {
						certExpire = true;
						if (eBDate < expireDate && eBDate > dontSendEmailDate) {
							bothExpire = true;
						}
					}
					if (eBDate < expireDate && eBDate > dontSendEmailDate) {
						eBondExpire = true;
						if (cInsDate < expireDate && cInsDate > dontSendEmailDate) {
							bothExpire = true;
						}
					}
					if (bothExpire == true || eBondExpire == true || certExpire == true) {
						expiredEmail(bothExpire, eBondExpire, certExpire);
					}	
				}
				*/
			}
		}
	}
}

function aboutExpireEmail(both, bond, cert) {

	if (both == true) {
		getContactInfo();
		emailTo = contactEmail;
		emailCC = " "
		emailSubject = "Certificate of Insurance and 11B Bond About to Expire";
		emailBody = "Hello " + contactName + ",<br><br>Please be advised your Certificate of Insurance and 11B Bond with the City of Madison " +
		"will expire soon for " + contactBusiness + ".  Please have your agent send us a certificate and bond as soon as possible so that we " + 
		"can maintain your pre-qualification.<br><br>The necessary forms are located on the City of Madison " + 
		"<a href='http://www.cityofmadison.com/business/pw/forms.cfm'>Business Forms</a> website.  Click on Certificate " + 
		"of Insurance requirements form or 11B Bond form to complete the needed information.<br><br>Feel free to call with any questions.  " +
		"All forms can be submitted via fax or email.  When submitting please use the information below." +
		"<br><br>Janet Pien<br>City Engineering<br>608-266-4620<br>Fax 608-264-9275<br>Email japien@cityofmadison.com";
	} else if (both == false && cert == true) {
		getContactInfo();
		emailTo = contactEmail;
		emailCC = " "
		emailSubject = "Certificate of Insurance About to Expire";
		emailBody = "Hello " + contactName + ",<br><br>Please be advised your Certificate of Insurance with the City of Madison " +
		"will expire soon for " + contactBusiness + ".  Please have your agent send us a certificate as soon as possible so that we can maintain " +
		"your pre-qualification.<br><br>The necessary forms are located on the City of Madison " + 
		"<a href='http://www.cityofmadison.com/business/pw/forms.cfm'>Business Forms</a> website.  Click on Certificate " + 
		"of Insurance requirements form to complete the needed information.<br><br>Feel free to call with any questions.  " +
		"All forms can be submitted via fax or email.  When submitting please use the information below." +
		"<br><br>Janet Pien<br>City Engineering<br>608-266-4620<br>Fax 608-264-9275<br>Email japien@cityofmadison.com";
	} else if (both == false && bond == true) {
		getContactInfo();
		emailTo = contactEmail;
		emailCC = " "
		emailSubject = "11B Bond About to Expire";
		emailBody = "Hello " + contactName + ",<br><br>Please be advised your 11B Bond with the City of Madison " +
		"will expire soon for " + contactBusiness + ".  Please send us a bond as soon as possible so that we " + 
		"can maintain your pre-qualification.<br><br>The necessary forms are located on the City of Madison " + 
		"<a href='http://www.cityofmadison.com/business/pw/forms.cfm'>Business Forms</a> website.  Click on 11B Bond form to complete " +
		"the needed information.<br><br>Feel free to call with any questions.  " +
		"All forms can be submitted via fax or email.  When submitting please use the information below." +
		"<br><br>Janet Pien<br>City Engineering<br>608-266-4620<br>Fax 608-264-9275<br>Email japien@cityofmadison.com";
	}
	if (contactEmail != "No Email Address") {
		//aa.sendMail(emailFrom, emailTo, emailCC, emailSubject, emailBody);
	}
	logDebug("License: " + altId);
	logDebug("License Status: " + appStatus);
	logDebug("Category A: " + catA);
	logDebug("Certificate of Insurance Expiration: " + certInsuranceDate);
	logDebug("11B Expiration: " + elevenBDate);
	logDebug("Contact: " + contactBusiness + ", " + contactName + ", " + contactEmail);
	logDebug("About to Expire");
	logDebug(emailBody + "<br><br>");
}

function expiredEmail(both, bond, cert) {

	if (both == true) {
		getContactInfo();
		emailTo = contactEmail;
		emailCC = " "
		emailSubject = "Certificate of Insurance and 11B Bond Expired";
		emailBody = "Hello " + contactName + ",<br><br>Our request for an updated Certificate of Insurance and 11B Bond has gone unanswered.  " +
		"The pre-qualification for " + contactBusiness + " is inactive until current information is received.<br><br>The necessary forms are " +
		"located on the City of Madison <a href='http://www.cityofmadison.com/business/pw/forms.cfm'>Business Forms</a> website.  " + 
		"Click on Certificate of Insurance requirements form or 11B Bond form to complete the needed information.<br><br>" + 
		"Please call if you have any questions.  All forms can be submitted via fax or email.  When submitting please use the information below." +
		"<br><br>Janet Pien<br>City Engineering<br>608-266-4620<br>Fax 608-264-9275<br>Email japien@cityofmadison.com";
	} else if (both == false && cert == true) {
		getContactInfo();
		emailTo = contactEmail;
		emailCC = " "
		emailSubject = "Certificate of Insurance Expired";
		emailBody = "Hello " + contactName + ",<br><br>Our request for an updated Certificate of Insurance has gone unanswered.  " +
		"The pre-qualification for " + contactBusiness + " is inactive until current information is received.<br><br>The necessary forms are " +
		"located on the City of Madison <a href='http://www.cityofmadison.com/business/pw/forms.cfm'>Business Forms</a> website.  " + 
		"Click on Certificate of Insurance requirements form to complete the needed information.<br><br>" + 
		"Please call if you have any questions  All forms can be submitted via fax or email.  When submitting please use the information below." +
		"<br><br>Janet Pien<br>City Engineering<br>608-266-4620<br>Fax 608-264-9275<br>Email japien@cityofmadison.com";
	} else if (both == false && bond == true) {
		getContactInfo();
		emailTo = contactEmail;
		emailCC = " "
		emailSubject = "11B Bond Expired";
		emailBody = "Hello " + contactName + ",<br><br>Our request for an updated 11B Bond has gone unanswered.  " +
		"The pre-qualification for " + contactBusiness + " is inactive until current information is received.<br><br>The necessary forms are " +
		"located on the City of Madison <a href='http://www.cityofmadison.com/business/pw/forms.cfm'>Business Forms</a> website.  " + 
		"Click on 11B Bond form to complete the needed information.<br><br>" + 
		"Please call if you have any questions.  All forms can be submitted via fax or email.  When submitting please use the information below." +
		"<br><br>Janet Pien<br>City Engineering<br>608-266-4620<br>Fax 608-264-9275<br>Email japien@cityofmadison.com";
	}
	if (contactEmail != "No Email Address") {
		//aa.sendMail(emailFrom, emailTo, emailCC, emailSubject, emailBody);
	}
	logDebug("License: " + altId);
	logDebug("License Status: " + appStatus);
	logDebug("Category A: " + catA);
	logDebug("Certificate of Insurance Expiration: " + certInsuranceDate);
	logDebug("11B Expiration: " + elevenBDate);
	logDebug("Contact: " + contactBusiness + ", " + contactName + ", " + contactEmail);
	logDebug("Expired<br><br>");
	logDebug(emailBody + "<br><br>");
}

function getContactInfo() {
	var capContactResult = aa.people.getCapContactByCapID(capId);
	if (capContactResult.getSuccess()) {
		var capContactArray = capContactResult.getOutput();
		for (c in capContactArray) {
			var contact = capContactArray[c];
			var people = contact.getPeople();
			if (people.getContactType() == "Contractor") {
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
		logDebug("In Convert" + thisDate.getClass().toString());
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