/*------------------------------------------------------------------------------------------------------/
| SVN $Id: AddLicenseToPublicUserAfter4ACA.js 6515 2014-07-22 18:15:38Z jeff.moyer $
| Program : AddLicenseToPublicUserAfter4ACA7.3.js
| Event   : Add license to public user
|
| Usage   : Master Script by City of Madison.  See accompanying documentation and release notes.
|
| Client  : Madison, Wisconsin
| Action# : N/A
|
| Notes   : This script is self contained and does not use the INCLUDES scripts
|
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| START User Configurable Parameters
|     Only variables in the following section may be changed.  If any other section is modified, this
|     will no longer be considered a "Master" script and will not be supported in future releases.  If
|     changes are made, please add notes above.
/------------------------------------------------------------------------------------------------------*/
//aa.env.setValue("isContinue", "1");
var controlString = "AddLicenseToPublicUserAfter4ACA";	//Standard choice for control
var preExecute = "AddLicenseToPublicUserAfter4ACA";		//Standard choice to execute first (for globals, etc)
var documentOnly = false;						//Document Only -- displays hierarchy of std choice steps

/*------------------------------------------------------------------------------------------------------/
| END User Configurable Parameters
/------------------------------------------------------------------------------------------------------*/
var SCRIPT_VERSION = 2.0

var vScriptName = aa.env.getValue("ScriptCode");
var vEventName = aa.env.getValue("EventName");

var startDate = new Date();
var startTime = startDate.getTime();
var cancel = false;
var message = "";
var debug = "";	
var emailText = "";
var showDebug = true;
var showMessage = false;
var useAppSpecificGroupName = true;
var br = "<BR>";
var tab = "";

var sysDate = aa.date.getCurrentDate();
var sysDateMMDDYYYY = dateFormatted(sysDate.getMonth(),sysDate.getDayOfMonth(),sysDate.getYear(),"");
/*------------------------------------------------------------------------------------------------------/
| BEGIN Event Specific Variables
/------------------------------------------------------------------------------------------------------*/
var licenseModel 	= aa.env.getValue("LicenseModel");
var resultCode  	= aa.env.getValue("ResultCode");
var servProvCode  	= aa.env.getValue("ServProvCode");
var userSeqNum 		= aa.env.getValue("UserSeqNum");
/*------------------------------------------------------------------------------------------------------/
| END Event Specific Variables
/------------------------------------------------------------------------------------------------------*/

logDebug("Agency Code = " + servProvCode);
logDebug("ResultCode = " + resultCode);
logDebug("User Seq Number = " + userSeqNum);
logDebug("sysDateMMDDYYYY = " + sysDateMMDDYYYY);

/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/-----------------------------------------------------------------------------------------------------*/

//doStandardChoiceActions(controlString,true,0);

var user = aa.person.getCurrentUser().getOutput(); 
var userEmail = user.getEmail();
var puser = aa.publicUser.getPublicUserByEmail(userEmail).getOutput();

var buildingLicenseTypes =  new Array("GENERAL", "ELEC - RESIDENTIAL", "ELEC - MASTER", "HTG - WARM AIR", "HTG - HOT WATER", "PLUMBING");
var healthLicenseTypes =  new Array("PUMPER", "PUMP INSTALLER", "PLUMBING");
var emailBuilding = false;
var emailHealth = false;

var elamSupport = "jmoyer@cityofmadison.com";//"elamSupport@cityofmadison.com";
var building = "jmoyer@cityofmadison.com";//"kdickens@cityofmadison.com";
var health = "jmoyer@cityofmadison.com";//"jhausbeck@publichealthmdc.com";

var message = "";

/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/

if (debug.indexOf("**ERROR") > 0) {
	aa.env.setValue("ErrorCode", "1");
	aa.env.setValue("ErrorMessage", debug);
} else {
	if (cancel) {
		aa.env.setValue("ErrorCode", "-2");
		if (showMessage) aa.env.setValue("ErrorMessage", message);
		if (showDebug) 	aa.env.setValue("ErrorMessage", debug);
	} else {
		aa.env.setValue("ErrorCode", "0");
		if (showMessage) aa.env.setValue("ErrorMessage", message);
		if (showDebug) 	aa.env.setValue("ErrorMessage", debug);
	}
}
var userName = user.getFirstName() + " " + user.getLastName();
var licenseType = licenseModel.getLicenseType();
var licenseNumber = licenseModel.getStateLicense();
var licenseBusinessName = licenseModel.getBusinessName();
var licenseAddress = licenseModel.getAddress1();
var licenseCSZ = licenseModel.getCity() + ", " + licenseModel.getState() + " " + licenseModel.getZip();

for (var i = 0; i < buildingLicenseTypes.length; i++) {
	if (buildingLicenseTypes[i].equals(licenseType)) {
		emailBuilding = true;
	}
}

for (var i = 0; i < healthLicenseTypes.length; i++) {
	if (healthLicenseTypes[i].equals(licenseType)) {
		emailHealth = true;
	}
}

message = "<p>A license was associated with a City of Madison License & Permits user.</p>" +
	"<p>User Information:" + br +
	"User Name: " + userName + br +
	"User Email: " + userEmail + "</p>" +
 	"<p>License Information:" + br +
	"License Number: " + licenseNumber + br +
	"License Type: " + licenseType + br +
	"License Business Name: " + licenseBusinessName + br +
	"License Business Address: " + licenseAddress + br +
	"License Business City, State, Zip: " + licenseCSZ + "</p>";
	
if (emailBuilding == true) {
	//message +=  "Building: " + emailBuilding + "</p>";
	aa.sendEmail("noreply@cityofmadison.com", building, elamSupport, "City of Madison Licenses & Permits - Association of License to Account", message, "");
} 

if (emailHealth == true) {
	//message +=  "Health: " + emailHealth + "</p>";
	aa.sendEmail("noreply@cityofmadison.com", health, elamSupport, "City of Madison Licenses & Permits - Association of License to Account", message, "");
} 

if (emailBuilding == false && emailHealth == false) {
	aa.sendEmail("noreply@cityofmadison.com", elamSupport, elamSupport, "City of Madison Licenses & Permits - Association of License to Account", message, "");
}

//aa.sendEmail("noreply@cityofmadison.com", "jmoyer@cityofmadison.com", "jmoyer@cityofmadison.com", "License Associated to User", debug, "");
/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/
	
function convertStringToPhone(theString) {
	var n = "22233344455566677778889999";
	var compString = String(theString.toUpperCase());
	var retString = "";
	for (var x=0 ; x< compString.length ; x++) {
   		if (compString[x] >= "A" && compString[x] <= "Z") {
   			retString += n[compString.charCodeAt(x)-65]
  		} else {
   			retString += compString[x];
  		}
	}
   	return retString;
}

function matches(eVal,argList) {
   for (var i=1; i<arguments.length;i++)
   	if (arguments[i] == eVal)
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
    if (!aa.calendar.getNextWorkDay) {
		vLevel = 1
		if (arguments.length > 1) {
			vLevel = arguments[1]
		}
		if ((showDebug & vLevel) == vLevel || vLevel == 1) {
			debug += dstr + br;
		}
		if ((showDebug & vLevel) == vLevel) {
			aa.debug(aa.getServiceProviderCode() + " : " + aa.env.getValue("CurrentUserID"), dstr)
		}
	} else {
		debug+=dstr + br;
	}
}

function dateFormatted(pMonth,pDay,pYear,pFormat) {
	//returns date string formatted as YYYY-MM-DD or MM/DD/YYYY (default)
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
	
function jsDateToASIDate(dateValue) {
	//Converts Javascript Date to ASI 0 pad MM/DD/YYYY
	if (dateValue != null) {
		if (Date.prototype.isPrototypeOf(dateValue)) {
			var M = "" + (dateValue.getMonth()+1); 
			var MM = "0" + M; 
			MM = MM.substring(MM.length-2, MM.length); 
			var D = "" + (dateValue.getDate()); 
			var DD = "0" + D; 
			DD = DD.substring(DD.length-2, DD.length); 
			var YYYY = "" + (dateValue.getFullYear()); 
			return MM + "/" + DD + "/" + YYYY;
		} else {
			logDebug("Parameter is not a javascript date");
			return ("INVALID JAVASCRIPT DATE");
		}
	} else {
		logDebug("Parameter is null");
		return ("NULL PARAMETER VALUE");
	}
}

function jsDateToMMDDYYYY(pJavaScriptDate) {
	//converts javascript date to string in MM/DD/YYYY format
	if (pJavaScriptDate != null) {
		if (Date.prototype.isPrototypeOf(pJavaScriptDate)) {
			return (pJavaScriptDate.getMonth()+1).toString()+"/"+pJavaScriptDate.getDate()+"/"+pJavaScriptDate.getFullYear();
		} else {
			logDebug("Parameter is not a javascript date");
			return ("INVALID JAVASCRIPT DATE");
		}
	} else {
		logDebug("Parameter is null");
		return ("NULL PARAMETER VALUE");
	}
}

function nextWorkDay(td) {
	//td can be "mm/dd/yyyy" (or anything that will convert to JS date)
	if (!td) {
		dDate = new Date();
	} else {
		dDate = new Date(td);
	}
	if (!aa.calendar.getNextWorkDay) {
		logDebug("getNextWorkDay function is only available in Accela Automation 6.3.2 or higher.");
	} else {
		var dDate = new Date(aa.calendar.getNextWorkDay(aa.date.parseDate(dDate.getMonth()+1 + "/" + dDate.getDate() + "/" + dDate.getFullYear())).getOutput().getTime());
	}
	return (dDate.getMonth()+1) + "/" + dDate.getDate() + "/" + dDate.getFullYear();;
}
	
function convertDate(thisDate) {
	//convert ScriptDateTime to Javascript Date Object
	return new Date(thisDate.getMonth() + "/" + thisDate.getDayOfMonth() + "/" + thisDate.getYear());
}


function callWebService(wsSubScript, wsScriptParameters) {
	aa.env.setValue("wsScriptParameters",wsScriptParameters);
	aa.env.setValue("wsScriptDebug","");
	aa.env.setValue("wsScriptMessage","");
	var sSubDebug = "";
	var sSubMessage = "";
	logDebug("Executing Web Service wsSubScript: " + wsSubScript);
	aa.runScriptInNewTransaction(wsSubScript);
	sSubDebug = aa.env.getValue("wsScriptDebug");
	sSubMessage = aa.env.getValue("wsScriptMessage");
	if (sSubDebug != "") {
		//Logging
		logDebug("Debug from wsSubScript: " + wsSubScript);
		logDebug(sSubDebug);
	}
	if (sSubMessage != "") {
		//Logging
		logDebug("Message from wsSubScript: " + wsSubScript);
		logDebug(sSubMessage);
	}
}

function openUrlInNewWindow(myurl) {
	 // showDebug or showMessage must be true for this to work
	 newurl = "<invalidTag LANGUAGE=\"JavaScript\">\r\n<!--\r\n newwin = window.open(\""
	 newurl+=myurl
	 newurl+="\"); \r\n  //--> \r\n </SCRIPT>"
	 comment(newurl)
}