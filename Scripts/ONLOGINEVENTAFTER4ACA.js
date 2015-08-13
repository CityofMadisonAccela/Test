/*------------------------------------------------------------------------------------------------------/
| SVN $Id: OnLoginEventAfter4ACA.js 6515 2013-03-22 18:15:38Z jeff.moyer $
| Program : OnLoginEventAfter4ACAV7.3.js
| Event   : On login
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
var controlString = "OnLoginEventAfter4ACA";	//Standard choice for control
var preExecute = "OnLoginEventAfter4ACA";		//Standard choice to execute first (for globals, etc)
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
var tab = "    ";

var sysDate = aa.date.getCurrentDate();
var sysDateMMDDYYYY = dateFormatted(sysDate.getMonth(),sysDate.getDayOfMonth(),sysDate.getYear(),"");
/*------------------------------------------------------------------------------------------------------/
| BEGIN Event Specific Variables
/------------------------------------------------------------------------------------------------------*/
var agencyCode 	= aa.env.getValue("AgencyCode");
var language  	= aa.env.getValue("Language");
var userName 	= aa.env.getValue("Username");
/*------------------------------------------------------------------------------------------------------/
| END Event Specific Variables
/------------------------------------------------------------------------------------------------------*/

logDebug("Agency Code = " + agencyCode);
logDebug("Language = " + language);
logDebug("User Name = " + userName);
logDebug("sysDateMMDDYYYY = " + sysDateMMDDYYYY);

/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/-----------------------------------------------------------------------------------------------------*/

//doStandardChoiceActions(controlString,true,0);

var user = aa.person.getCurrentUser().getOutput(); 
var userEmail = user.getEmail();
var puser = aa.publicUser.getPublicUserByEmail(userEmail).getOutput();
var userSeqNum = puser.getUserSeqNum();
var contractorLicenseList = aa.contractorLicense.getContrLicListByUserSeqNBR(userSeqNum).getOutput();
var expiredDate = new Date();
var returnMessage = "";
var isLicExpired = false;
var isInsExpired = false;
var isBusExpired = false;

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

var returnCode = "-1";
var returnMessage = "If you are a licensed contractor, you will need to add your license information to your account " +
	"to apply for some permit types online. You can search for your license information and associate " +
	"it to your account by going to the Account Management link above." + br;

debugObject(contractorLicenseList);
	
if (!contractorLicenseList.isEmpty()) {
	
	returnMessage = "Your account is associated with the following license(s).  The license will not be available for use if expired.  " +
	"Please make sure State credentials are up to date - you can check your State " +
        "Credentials at <a href='https://app.wi.gov/licensesearch' target='_blank'>https://app.wi.gov/licensesearch</a>.  Then, please call 608-266-5902 so we can update our records." + br + br;
	
	for (var i = 0; i < contractorLicenseList.size(); i++) {
		var LModel = contractorLicenseList.get(i);
		var licenseNbr= LModel.getLicense().getStateLicense();
		var licenseType= LModel.getLicense().getLicenseType();	
		
		returnMessage = returnMessage + licenseType + " license (" + licenseNbr + ")";
		
		isLicExpired = hasExpiredLicense("EXPIRE", licenseNbr);
		isInsExpired = hasExpiredLicense("INSURANCE", licenseNbr);
		isBusExpired = hasExpiredLicense("BUSINESS", licenseNbr);
		
		if (isLicExpired || isInsExpired || isBusExpired) {
			returnMessage = returnMessage + " <font color='red'>is expired.</font>" + br;
		} else {
			returnMessage = returnMessage + " is valid for use." + br;
		}
	}
}

aa.env.setValue("ReturnCode", returnCode);
aa.env.setValue("ReturnMessage", returnMessage);

//aa.sendEmail("noreply@cityofmadison.com", "jmoyer@cityofmadison.com", "jmoyer@cityofmadison.com", "On Login After", debug, "");

/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/
function hasExpiredLicense(pDateType, plicenseNbr) {
	var vDateType;
	if ( pDateType==null || pDateType=="" ) {
		logDebug ("Invalid date type parameter");
		return false;
	} else {
		vDateType = pDateType.toUpperCase();
		if (!matches(vDateType, "EXPIRE","INSURANCE","BUSINESS")) {
			logDebug ("Invalid date type parameter");
			return false;
		}
	}
	var vExpired = false;
	var vToday = new Date();
	var vResult = getLicProfExpDate(vDateType, plicenseNbr);
	if (vResult != "NO DATE FOUND") {
		vResult = jsDateToASIDate(vResult);
		vToday = jsDateToASIDate(vToday);
		expiredDate = vResult;
		var licDate = new Date(vResult);
		var tdate = new Date(vToday);
		if (licDate < tdate) {
			vExpired = true;
			logDebug("Licence # " + plicenseNbr + " expired on " + vResult);
		} else {
			logDebug("No licensed professionals found on CAP");
			return vExpired;
		}
	} else {
		expiredDate = "";
		vExpired = false;
	}
	return vExpired;
}
	
function getLicProfExpDate(pDateType, pLicNum) {
	if (pDateType==null || pDateType=="") {
		var dateType = "EXPIRE";
	} else {
		var dateType = pDateType.toUpperCase();
		if (!(dateType=="ISSUE" || dateType=="RENEW" || dateType=="BUSINESS" || dateType=="INSURANCE")) {
			dateType = "EXPIRE";
		}
	}
	if (pLicNum==null || pLicNum=="") {
		logDebug("Invalid license number parameter");
		return ("INVALID PARAMETER");
	}
	var newLic = getRefLicenseProf(pLicNum)
	if (newLic) {
		var jsExpDate = new Date();
 		if (dateType=="EXPIRE") {
			if (newLic.getLicenseExpirationDate()) {
				jsExpDate = convertDate(newLic.getLicenseExpirationDate());
				logDebug(pLicNum+" License Expiration Date: "+jsDateToMMDDYYYY(jsExpDate));
				return jsExpDate;
			} else {
				logDebug("Reference record for license "+pLicNum+" has no License Expiration Date");
				return ("NO DATE FOUND");
			}
		} else if (dateType=="INSURANCE") {
			if (newLic.getInsuranceExpDate()) {
				jsExpDate = convertDate(newLic.getInsuranceExpDate());
				logDebug(pLicNum+" Insurance Expiration Date: "+jsDateToMMDDYYYY(jsExpDate));
				return jsExpDate;
			} else {
				logDebug("Reference record for license "+pLicNum+" has no Insurance Expiration Date");
				return ("NO DATE FOUND");
			}
		} else if (dateType=="BUSINESS") {
			if (newLic.getBusinessLicExpDate()) {
				jsExpDate = convertDate(newLic.getBusinessLicExpDate());
				logDebug(pLicNum+" Business Lic Expiration Date: "+jsDateToMMDDYYYY(jsExpDate));
				return jsExpDate;
			} else {
				logDebug("Reference record for license "+pLicNum+" has no Business Lic Exp Date");
				return ("NO DATE FOUND");
			}
		} else if (dateType=="ISSUE") {
			if (newLic.getLicenseIssueDate()) {
				jsExpDate = convertDate(newLic.getLicenseIssueDate());
				logDebug(pLicNum+" License Issue Date: "+jsDateToMMDDYYYY(jsExpDate));
				return jsExpDate;
			} else {
				logDebug("Reference record for license "+pLicNum+" has no Issue Date");
				return ("NO DATE FOUND");
			}
		} else if (dateType=="RENEW") {
			if (newLic.getLicenseLastRenewalDate()) {
				jsExpDate = convertDate(newLic.getLicenseLastRenewalDate());
				logDebug(pLicNum+" License Last Renewal Date: "+jsDateToMMDDYYYY(jsExpDate));
				return jsExpDate;
			} else {
				logDebug("Reference record for license "+pLicNum+" has no Last Renewal Date");
				return ("NO DATE FOUND");
			}
		} else {
			return ("NO DATE FOUND");
		}
	}
}

function getRefLicenseProf(refstlic) {
	var refLicObj = null;
	var refLicenseResult = aa.licenseScript.getRefLicensesProfByLicNbr(aa.getServiceProviderCode(),refstlic);
	if (!refLicenseResult.getSuccess()) { 
		logDebug("**ERROR retrieving Ref Lic Profs : " + refLicenseResult.getErrorMessage()); 
		return false; 
	} else {
		var newLicArray = refLicenseResult.getOutput();
		if (!newLicArray) { 
			return null;
		} else {
			for (var thisLic in newLicArray) {
				if (refstlic && newLicArray[thisLic] && refstlic.toUpperCase().equals(newLicArray[thisLic].getStateLicense().toUpperCase())) {
					refLicObj = newLicArray[thisLic];
				}
			}
			return refLicObj;
		}
	}
}

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