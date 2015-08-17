/*------------------------------------------------------------------------------------------------------/
| Program:  POWTSTAM
| Client: 	Health - Hausbeck
| Version 1.0 - Created by Riki Sjachrani
| Description:	Process Permitting/Health/POWTS/Sanitary records for TAM maintenance.
|		The script is run once/month via Batch Job POWTS_TAM_NOTIFICATIONS, which is
|		typically run on the 3rd of the month.
|
| Modifications: Jane Schneider 5/2/2014 - Changed BeginDate from -90 to -100 days. 
|	        Jane Schneider 6/3/2015 - Commented out the calls to function saveReport and the function itself, 
|				 		as no longer needed in this script, now that the three TAM reports are being created via 
|						the BATCH_SET_SAVE_REPORT script called from batch jobs 
|							Batch Report TAMORDERSNOTICE
|							Batch Report TAM2NDNOTICE 
|							Batch Report TAM1STNOTICE
|							
/------------------------------------------------------------------------------------------------------*/
//get the first set of caps based on TAM due date range

//variable decalres
var maxSeconds = 60 * 60;							// number of seconds allowed for batch processing, usually < 5*60
batchJobResult = aa.batchJob.getJobID()
batchJobName = "" + aa.env.getValue("BatchJobName");
sEnvironment = "Production";
wfObjArray = null;

batchJobID = 0;
if (batchJobResult.getSuccess())
  {
  batchJobID = batchJobResult.getOutput();
  logDebug("Batch Job " + batchJobName + " Job ID is " + batchJobID);
  }
else
  logDebug("Batch job ID not found " + batchJobResult.getErrorMessage());

//Parameters

var Notification_Email_Address = getParam("Notification_Email_Address");// 
var Notification_Email_Address_cc = getParam("Notification_Email_Address_cc");//

var sysDate = dateAdd(null, 0);
//var sysDate = aa.date.getCurrentDate();
var dt30Days = dateAdd(sysDate,-30);
var dt60Days = dateAdd(sysDate,-60);

//Changed search range to go back 100 days instead of 90 days, as some SAN records were falling off the TAM schedule. - Jane Schneider, 5/2/2014.
//var dtBeginDate = (dateAdd(sysDate, -90)); // dummy date to begin seaching for TAMs (expectation that some will be at Orders Issued)
var dtBeginDate = (dateAdd(sysDate, -100)); // dummy date to begin seaching for TAMs (expectation that some will be at Orders Issued)

var ISOBeginDate = aa.date.parseISODate((dtBeginDate.getYear()+1900)+"-"+(dtBeginDate.getMonth()+1)+"-"+dtBeginDate.getDate());
var dtEndDate = (dateAdd(sysDate, 90)); // dummy date for end searching TAMs (this will be the date first orders Issued)
var ISOEndDate = aa.date.parseISODate((dtEndDate.getYear()+1900)+"-"+(dtEndDate.getMonth()+1)+"-"+dtEndDate.getDate());
//var ISOBeginDate = aa.date.parseISODate("2010-12-13");//getParam("Begin_Date");
//var ISOEndDate = aa.date.parseISODate("2010-12-17");//getParam("End_Date");

//Variables
var startTime = sysDate.getTime();
var dtOperationStatus = new Date();
var dtTAMDue = new Date();
var TAMCAPs = new Array();
var strReportName = "";
var debug = "";								// Debug String
var br = "<BR>";							// Break Tag
var capId;
var altId;
var emailText = "";
var TAMDue;
var useAppSpecificGroupName = false;
var cap;
var capStatus;
var systemUserObj = aa.person.getUser("ADMIN").getOutput();
var cnt1st = 0;
var cnt2nd = 0;
var cntOrd = 0;
//Let's first check out what type of process are we handling

//debugObject();

//Get the CAPS
TAMCAP = aa.cap.getCapIDsByAppSpecificInfoDateRange("OFFICE USE ONLY","Date TAM Due",ISOBeginDate,ISOEndDate);
if (TAMCAP.getSuccess())
{
	TAMCAPs = TAMCAP.getOutput();	
	//aa.sendMail("noreply@cityofmadison.com", Notification_Email_Address, Notification_Email_Address_cc, "Start of Batch", "Process no records " + TAMCAPs.length + br + "Elapse " + elapsed());
	
	for(var iRecords=0; iRecords < TAMCAPs.length; iRecords++) 
	{

		capId=TAMCAPs[iRecords].getCapID();
		cap = aa.cap.getCap(capId).getOutput();				// Cap object
		altId = capId.getCustomID();
		capStatus = cap.getCapStatus();		
		TAMDue = getAppSpecific("Date TAM Due");	
		dtTAMDue = new Date(TAMDue);//String(TAMDue).substring(6,11) + "-" + String(TAMDue).substring(0,2) + "-" + String(TAMDue).substring(3,5));
		dtOperationStatus = dateAdd(null,0);
		
		if (capStatus == "Second Notice Issued") 
		{
			dtOperationStatus = new Date(taskStatusDate("Operational"));
			//emailText+="#" + altId + " Orders Issued Pending "+ " " + dtOperationStatus + " Record Number " + cnt2nd +br;
			//if (dt30Days >= dtOperationStatus)
			if (dt60Days >= dtTAMDue)
			{
				updateTask("Operational", "Orders Issued", "Orders Issued","Note");
				aa.set.add("TAMORDERSNOTICE",capId);
				//saveReport("TAM Orders");
				cntOrd++;	
				//emailText+="#" + altId + " Orders Issued "+ " " +TAMDue+ " Record Number " + cntOrd + br;
			}
		}

		if (capStatus == "First Notice Issued" && dt30Days >= dtTAMDue)
		{
			updateTask("Operational", "Second Notice Issued", "Update to Second Notice Issued by batch","Note");
			aa.set.add("TAM2NDNOTICE",capId);
			//saveReport("TAM 2nd Notice");
			cnt2nd++;
			//emailText+="#" + altId + " Second Notice Issued "+ " " + TAMDue + " Record Number " + cnt2nd +br;
		}

		if (capStatus == "System in Compliance" && dtTAMDue <= dtEndDate && dtTAMDue > sysDate)
		{
			updateTask("Operational", "First Notice Issued", "Update to First Notice Issued by batch","Note");
			aa.set.add("TAM1STNOTICE",capId);
			//saveReport("TAM 1st Notice Card");
			cnt1st++;
			//emailText+="#" + altId + " First Notice Issued "+ " " +TAMDue+ " Record Number " +cnt1st+br;
		}
		

	//if (iRecords%300==0 && iRecords != 0)
	//	{	
	//		aa.sendMail("noreply@cityofmadison.com", Notification_Email_Address, Notification_Email_Address_cc, "Still running", elapsed() + "seconds " + br +" Number of records " + iRecords);
	//	}
	
		//create report TAM Notice that gets saved to CAP
		//saveReport(strReportName);
	}

//print last report with all TAM notifications - 10 notices
}
else
	emailText+="error "+br;
//Send notification email to let whomever know what's going on.
if (Notification_Email_Address.length)
{
	logDebug("Total number of records retrieved in date range of " + formatShortDate(dtBeginDate) + " - " + formatShortDate(dtEndDate) + ": " + TAMCAPs.length);
	logDebug("Count of records moved to 1st Notice: " + cnt1st);
	logDebug("Count of records moved to 2nd Notice: " + cnt2nd);
	logDebug("Count of records moved to Orders: " + cntOrd);	
	logDebug("");	
	logDebug("Elapsed Time : " + elapsed() + " seconds");		
	logDebug("");
	logDebug("End of POWTS TAM batch job")
	
	aa.sendMail("noreply@cityofmadison.com", Notification_Email_Address, Notification_Email_Address_cc, "POWTS TAM Batch - " + sEnvironment, emailText);	
}

aa.env.setValue("ScriptReturnMessage", debug);

//***Functions **********************************************************************************************************************	
function getParam(pParamName) //gets parameter value and logs message showing param value
	{
	var ret = "" + aa.env.getValue(pParamName);
	logDebug("Parameter : " + pParamName+" = "+ret);
	return ret;
	}

function elapsed() {
	var thisDate = new Date();
	var thisTime = thisDate.getTime();
	return ((thisTime - startTime) / 1000) 
	}
	
function taskStatusDate(wfstr) // optional process name, capId
{
    
    var itemCap = capId;
	if (arguments.length == 3) itemCap = arguments[2]; // use cap ID specified in args

	var useProcess = false;
	var processName = "";
	if (arguments.length > 1 && arguments[1] != null) 
		{
		processName = arguments[1]; // subprocess
		useProcess = true;
		}

	var workflowResult = aa.workflow.getTasks(itemCap);
 	if (workflowResult.getSuccess())
  	 	var wfObj = workflowResult.getOutput();
  	else
  	  	{ logDebug("**ERROR: Failed to get workflow object: " + wfObj.getErrorMessage()); return false; }
	
	for (i in wfObj)
		{
   		var fTask = wfObj[i];
 		if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase())  && (!useProcess || fTask.getProcessCode().equals(processName)))
			{
			//logDebug((fTask.getStatusDate().getMonth()+1)+"/"+fTask.getStatusDate().getDate() +"/"+ (parseInt(fTask.getStatusDate().getYear())+1900));
			return ""+(fTask.getStatusDate().getMonth()+1)+"/"+fTask.getStatusDate().getDate() +"/"+ (parseInt(fTask.getStatusDate().getYear())+1900);
			}
		}
} 
	
function dateAdd(td,amt)
	// perform date arithmetic on a string
	// td can be "mm/dd/yyyy" (or any string that will convert to JS date)
	// amt can be positive or negative (5, -3) days
	// if optional parameter #3 is present, use working days only
	{

	var useWorking = false;
	if (arguments.length == 3)
		useWorking = true;

	if (!td)
		dDate = new Date();
	else
		dDate = new Date(td);
	var i = 0;
	if (useWorking)
		if (!aa.calendar.getNextWorkDay)
			{
			logDebug("getNextWorkDay function is only available in Accela Automation 6.3.2 or higher.");
			while (i < Math.abs(amt))
				{
				dDate.setTime(dDate.getTime() + (1000 * 60 * 60 * 24 * (amt > 0 ? 1 : -1)));
				if (dDate.getDay() > 0 && dDate.getDay() < 6)
					i++
				}
			}
		else
			{
			while (i < Math.abs(amt))
				{
				dDate = new Date(aa.calendar.getNextWorkDay(aa.date.parseDate(dDate.getMonth()+1 + "/" + dDate.getDate() + "/" + dDate.getFullYear())).getOutput().getTime());
				i++;
				}
			}
	else
		dDate.setTime(dDate.getTime() + (1000 * 60 * 60 * 24 * amt));

	return dDate;
}

function formatShortDate(dtSomeDate)
//Parameter to be passed in is a Date() object.
//Returns a date in the format of month/day/year, e.g., 5/4/2014.
{
	return (dtSomeDate.getMonth() + 1) + "/" + dtSomeDate.getDate() + "/" + dtSomeDate.getFullYear();

}

function getAppSpecific(itemName)  // optional: itemCap
{
	var updated = false;
	var i=0;
	var itemCap = capId;
	if (arguments.length == 2) itemCap = arguments[1]; // use cap ID specified in args
   	
	//if (useAppSpecificGroupName)
	//{
	//	if (itemName.indexOf(".") < 0)
	//		{ logDebug("**WARNING: editAppSpecific requires group name prefix when useAppSpecificGroupName is true") ; return false }
		
		
	//	var itemGroup = itemName.substr(0,itemName.indexOf("."));
	//	var itemName = itemName.substr(itemName.indexOf(".")+1);
	//}
	var itemGroup = "OFFICE USE ONLY"
	var itemName = "Date TAM Due"
    var appSpecInfoResult = aa.appSpecificInfo.getByCapID(itemCap);
	if (appSpecInfoResult.getSuccess())
 	{
		var appspecObj = appSpecInfoResult.getOutput();
		
		if (itemName != "")
		{
			for (i in appspecObj)
				if( appspecObj[i].getCheckboxDesc() == itemName && (!useAppSpecificGroupName || appspecObj[i].getCheckboxType() == itemGroup) )
				{
					return appspecObj[i].getChecklistComment();
				}
		} // item name blank
	} 
	else
		{ logDebug( "**ERROR: getting app specific info for Cap : " + appSpecInfoResult.getErrorMessage()) }
}

/*
function saveReport(reportName)
{
	var reportInfoModel = aa.reportManager.getReportInfoModelByName(reportName);
	
	if (reportInfoModel.getSuccess())
	{
		report = reportInfoModel.getOutput();
		report.setModule("Permitting"); // Setting the module
		report.setCapId(capId);

		parameters = aa.util.newHashMap();
		parameters.put("AltID",altId);
		report.setReportParameters(parameters);
		report2 = report.getReportInfoModel(); 
		report2.setNotSaveToEDMS(false);
		//debugObject(report);
	}

	var reportResult = aa.reportManager.getReportResult(report);

	if(reportResult.getSuccess())
	{
		reportResult = reportResult.getOutput();
		var reportFile = aa.reportManager.storeReportToDisk(reportResult);
		if (reportFile.getSuccess())
		{
			reportFile = reportFile.getOutput();
		}
	}
	else
	{
		emailText+="Could not run report for #" + altId + br;
	}
}
*/

function debugObject(object)
{
 var output = ''; 
 for (property in object) { 
   output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" +'; ' + "<BR>"; 
 } 
 logDebug(output);
} 

function logDebug(dstr)
	{
	emailText+=dstr + br;
	}

function updateTask(wfstr,wfstat,wfcomment,wfnote) // optional process name, cap id
	{
	var useProcess = false;
	var processName = "";
	if (arguments.length > 4) 
		{
		if (arguments[4] != "")
			{
			processName = arguments[4]; // subprocess
			useProcess = true;
			}
		}
	var itemCap = capId;
	if (arguments.length == 6) itemCap = arguments[5]; // use cap ID specified in args
 
	var workflowResult = aa.workflow.getTasks(itemCap);
	if (workflowResult.getSuccess())
		var wfObj = workflowResult.getOutput();
	else
		{ 	
		emailText += "**ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage(); 
		return false; 
		}
            
	if (!wfstat) wfstat = "NA";
            
	for (i in wfObj)
		{
		var fTask = wfObj[i];
		if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase())  && (!useProcess || fTask.getProcessCode().equals(processName)))
			{
			var dispositionDate = aa.date.getCurrentDate();
			var stepnumber = fTask.getStepNumber();
			var processID = fTask.getProcessID();
			if (useProcess)
				aa.workflow.handleDisposition(itemCap,stepnumber,processID,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj,"U");
			else
				aa.workflow.handleDisposition(itemCap,stepnumber,wfstat,dispositionDate,wfnote,wfcomment,systemUserObj,"U");
			//logMessage("Updating Workflow Task " + wfstr + " with status " + wfstat);
			//logDebug("Updating Workflow Task " + wfstr + " with status " + wfstat);
			}                                   
		}
	}
	
function updateAppStatus(stat,cmt) // optional cap id
	{
	
	var itemCap = capId;
	if (arguments.length == 3) itemCap = arguments[2]; // use cap ID specified in args

	var updateStatusResult = aa.cap.updateAppStatus(itemCap,"APPLICATION",stat, sysDate, cmt ,systemUserObj);
	/*if (updateStatusResult.getSuccess())
		logDebug("Updated application status to " + stat + " successfully.");
	else
		logDebug("**ERROR: application status update to " + stat + " was unsuccessful.  The reason is "  + updateStatusResult.getErrorType() + ":" + updateStatusResult.getErrorMessage());
	*/
	}