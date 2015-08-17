var maxSeconds = 60 * 60;							// number of seconds allowed for batch processing, usually < 5*60
batchJobResult = aa.batchJob.getJobID()
batchJobName = "" + aa.env.getValue("BatchJobName");
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

//Variables
var sysDate1 = aa.date.getCurrentDate();
var sysDate = dateAdd(null, 0);
var startTime = sysDate.getTime();
var strReportName = "";
var debug = "";								// Debug String
var br = "<BR>";							// Break Tag
var capId;
var altId;
var emailText = "";
var useAppSpecificGroupName = false;
var cap;
var capStatus;
var systemUserObj = aa.person.getUser("ADMIN").getOutput();
//Let's first check out what type of process are we handling

//debugObject();

//Get the CAPS
FDCAP = aa.cap.getByAppType("Permitting","Fire","RoutineFireInspection","NA");
if (FDCAP.getSuccess())
{
	FDCAPs = FDCAP.getOutput();
	for(var iRecords=0; iRecords < FDCAPs.length; iRecords++) 
	{
		capId=FDCAPs[iRecords].getCapID();
		cap = aa.cap.getCap(capId).getOutput();				// Cap object
		capStatus = cap.getCapStatus();	
		altId = capId.getCustomID();
		//cd = cap.getCapDetailModel(); 
		cd = aa.cap.getCapDetail(capId).getOutput().getCapDetailModel(); 
		capAsgnStaff = cd.getAsgnStaff(); 
		capAsgnDept = cd.getAsgnDept();
		if (getAppSpecific("Fire Station Code") == "24") continue;
		if (!capAsgnStaff) continue;
		if (capStatus == "Annual Routine") continue;
		scheduleInspectDate("Routine","01/01/2012",capAsgnStaff,"AM"); 
		updateAppStatus("Annual Routine");
		logDebug(altId);
		//aa.sendMail("noreply@cityofmadison.com", "rsjachrani@cityofmadison.com", "rsjachrani@cityofmadison.com", "Fire Inspection testing", altId + br + elapsed() + "seconds ");
		if (elapsed() > 3600) break;
	}
}
aa.sendMail("noreply@cityofmadison.com", "rsjachrani@cityofmadison.com", "rsjachrani@cityofmadison.com", "Fire Inspection testing", emailText + br + elapsed() + "seconds ");
aa.env.setValue("ScriptReturnMessage", debug);	
	
// Functions

function updateAppStatus(stat,cmt) // optional cap id
{
	var itemCap = capId;
	if (arguments.length == 3) 
		itemCap = arguments[2]; // use cap ID specified in args

	var updateStatusResult = aa.cap.updateAppStatus(itemCap, "APPLICATION", stat, sysDate1, cmt, systemUserObj);
	//if (updateStatusResult.getSuccess())
	//	logDebug("Updated application status to " + stat + " successfully.");
	//else
	//	logDebug("**ERROR: application status update to " + stat + " was unsuccessful.  The reason is "  + updateStatusResult.getErrorType() + ":" + updateStatusResult.getErrorMessage());
}

function getAppSpecific(itemName)  // optional: itemCap
{
	var updated = false;
	var i=0;
	var itemCap = capId;
	if (arguments.length == 2) itemCap = arguments[1]; // use cap ID specified in args
   	
	if (useAppSpecificGroupName)
	{
		if (itemName.indexOf(".") < 0)
			{ logDebug("**WARNING: editAppSpecific requires group name prefix when useAppSpecificGroupName is true") ; return false }
		
		
		var itemGroup = itemName.substr(0,itemName.indexOf("."));
		var itemName = itemName.substr(itemName.indexOf(".")+1);
	}
	
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
					break;
				}
		} // item name blank
	} 
	else
		{ logDebug( "**ERROR: getting app specific info for Cap : " + appSpecInfoResult.getErrorMessage()) }
}

function scheduleInspectDate(iType,DateToSched) // optional inspector ID. 
// DQ - Added Optional 4th parameter inspTime Valid format is HH12:MIAM or AM (SR5110)
// DQ - Added Optional 5th parameter inspComm 
	{
	var inspectorObj = null;
	var inspTime = null;
	var inspComm = "Scheduled via Script";
	if (arguments.length >= 3) 
		if (arguments[2] != null)
		{
		var inspRes = aa.person.getUser(arguments[2])
		if (inspRes.getSuccess())
			inspectorObj = inspRes.getOutput();
		}
	
        if (arguments.length >= 4)
            if(arguments[3] != null)
		        inspTime = arguments[3];
		        
		if (arguments.length >= 5)
		    if(arguments[4] != null)
		        inspComm = arguments[4];

	var schedRes = aa.inspection.scheduleInspection(capId, inspectorObj, aa.date.parseDate(DateToSched), inspTime, iType, inspComm)
	
	//if (schedRes.getSuccess())
		//logDebug("Successfully scheduled inspection : " + iType + " for " + DateToSched);
	//else
	//	logDebug( "**ERROR: adding scheduling inspection (" + iType + "): " + schedRes.getErrorMessage());
	}
	
function elapsed() 
	{
	var thisDate = new Date();
	var thisTime = thisDate.getTime();
	return ((thisTime - startTime) / 1000) 
	}
	
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