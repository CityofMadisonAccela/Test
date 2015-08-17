var maxSeconds = 60 * 59;							// number of seconds allowed for batch processing, usually < 5*60
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
var startDate = new Date();
var sysDate1 = aa.date.getCurrentDate();
var sysDate = dateAdd(null, 0);
var startTime = sysDate.getTime();
var strReportName = "";
var debug = "";								// Debug String
var br = "<BR>";							// Break Tag
var capId;
var altId;
var countSkipped = 0;
var count1year = 0;
var countAll = 0;
var countSecond = 0;
var countNoRoutine = 0;
var countNo2012 = 0;
var countNoAssigned = 0;
var emailText = "";
var useAppSpecificGroupName = false;
var timeExpired = false;
var cap;
var capStatus;
var systemUserObj = aa.person.getUser("ADMIN").getOutput();
//Let's first check out what type of process are we handling

//debugObject();
if (!timeExpired) mainProcess();

function mainProcess()
	{

		//Get the CAPS
		aa.sendMail("noreply@cityofmadison.com", "rsjachrani@cityofmadison.com", "rsjachrani@cityofmadison.com", "Fire Inspection start", elapsed() + "seconds ");
		FDCAP = aa.cap.getByAppType("Permitting","Fire","RoutineFireInspection","NA");

		rsYear = "2014"; //startDate.getFullYear()
		rsCutOffDate = new Date("01/01/" + rsYear);
		firstSchedule = "01/01/" + rsYear;

		if (FDCAP.getSuccess())
		{
			FDCAPs = FDCAP.getOutput();
			for(var iRecords=0; iRecords < FDCAPs.length; iRecords++) 
			{
				/*if (iRecords%1000==0 && iRecords != 0)
				{	
					aa.sendMail("noreply@cityofmadison.com", "rsjachrani@cityofmadison.com", "rsjachrani@cityofmadison.com", "Still running", elapsed() + "seconds " + br +" Number of records " + countSecond + br + emailText);
				}*/
				if (elapsed() > maxSeconds) // only continue if time hasn't expired
					{
					logDebug("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.") ;
					timeExpired = true;
					break;
					}
				countAll++; 
				capId=FDCAPs[iRecords].getCapID();
				cap = aa.cap.getCap(capId).getOutput();				// Cap object
				capStatus = cap.getCapStatus();	
				//aa.sendMail("noreply@cityofmadison.com", "rsjachrani@cityofmadison.com", "rsjachrani@cityofmadison.com", "Fire Inspection testing", elapsed() + "seconds ");
				if (capStatus == "Annual Routine") 
				{
					continue;
				}
				if (capStatus == "Closed")
				{
					countSkipped++;
					continue;
				}
				if (capStatus == "Inactive")
				{
					countSkipped++;
					continue;
				}
				if (capStatus == "Voided") 
				{
					countSkipped++;
					continue;
				}
				
				altId = capId.getCustomID();
				
				//cd = cap.getCapDetailModel(); 
				cd = aa.cap.getCapDetail(capId).getOutput().getCapDetailModel(); 
				capAsgnStaff = cd.getAsgnStaff(); 
				capAsgnDept = cd.getAsgnDept();
				if (!capAsgnStaff) 
				{
					logDebug(altId + ",Routine is not assigned");
					countNoAssigned++;
					continue;
				}
				// Because this is the cycle 1 batch, we don't care about the inspection year
				/*if (getAppSpecific("Inspection Year") == "1") 
				{
					count1year++;
					continue;
				}*/
				//if (getAppSpecific("Fire Station Code") == "24") continue;
				
				lastInspection = getLastInspectionDate("Routine");
				
				if (lastInspection == null) 
				{
					//logDebug(altId + ",No Routine Inspection found");
					countNoRoutine++;
					scheduleInspectDateGroup("FIRROUINSP","Routine",firstSchedule,capAsgnStaff);
					logDebug(altId + "," + firstSchedule + "," + capAsgnStaff + ",No Routine Inspection found")
					countSecond++;
					updateAppStatus("Annual Routine");
					continue;
				}
				if (lastInspection.getYear() != "2013") 
				{
					//logDebug(altId + ",No Routine in 2012 found");
					countNo2012++;
					countSecond++;
					updateAppStatus("Annual Routine");
					scheduleInspectDateGroup("FIRROUINSP","Routine",firstSchedule,capAsgnStaff);
					logDebug(altId + "," + firstSchedule + "," + capAsgnStaff + ",No Routine in 2013 found")
					continue;
				}
				
							
				//if (altId != "88187") continue;
				
				
				//debugObject(lastInspection);
						
				//nextinspDate = new Date((lastInspection.getMonth() + 4) + "/" + lastInspection.getDayOfMonth() + "/" + rsYear); 
				nextinspDate = dateAdd(((lastInspection.getMonth()) + "/" + lastInspection.getDayOfMonth() + "/" + lastInspection.getYear()),160); 
				//logDebug((nextinspDate.getMonth()) + "/" + nextinspDate.getDate() + "/" + nextinspDate.getFullYear());
				//logDebug(dateAdd((lastInspection.getMonth() + 4) + "/" + lastInspection.getDayOfMonth() + "/" + lastInspection.getYear(),120));	
				if (nextinspDate < rsCutOffDate)
					{
					//scheduleInspectDate("Routine",rsCutOffDate,capAsgnStaff,"AM");
					scheduleInspectDateGroup("FIRROUINSP","Routine",firstSchedule,capAsgnStaff);
					//logDebug(altId + "," + firstSchedule + "," + capAsgnStaff);
					}
				else
					{
					//scheduleInspectDate("Routine",(lastInspection.getMonth() + 4) + "/" + lastInspection.getDayOfMonth() + "/" + rsYear,capAsgnStaff,"AM");
					scheduleInspectDateGroup("FIRROUINSP","Routine",(nextinspDate.getMonth() + "/" + nextinspDate.getDate() + "/" + nextinspDate.getFullYear()),capAsgnStaff);
					//logDebug(altId + "," + nextinspDate.getMonth() + "/" + nextinspDate.getDate() + "/" + nextinspDate.getFullYear() + "," + capAsgnStaff);
					//debugObject(nextinspDate);
					}
				//logDebug(dateAdd("05/01/2012",120));
				//scheduleInspectDate("Routine","01/01/2012",capAsgnStaff,"AM"); 
				//scheduleInspectDate("Routine",dateAdd("05/01/2012",120),capAsgnStaff,"AM");
				countSecond++;
				if (capStatus != "Closed" && capStatus != "Inactive" && capStatus != "Void") 
				{
					updateAppStatus("Annual Routine");
				}
				
				//logDebug(altId);
				
				//aa.sendMail("noreply@cityofmadison.com", "rsjachrani@cityofmadison.com", "rsjachrani@cityofmadison.com", "Fire Inspection testing", altId + br + elapsed() + "seconds ");
				
			}
		}
	}
	
logDebug("countAll " + countAll);
logDebug("countSkipped " + countSkipped);
logDebug("countofSkippedOnceaYears" + count1year);
logDebug("countScheduledTwiceaYear " + countSecond);
logDebug("countNoRoutine " + countNoRoutine);
logDebug("countNo" + rsYear + " " + countNo2012);
logDebug("countNoAssigned  " + countNoAssigned);
aa.sendMail("noreply@cityofmadison.com", "rsjachrani@cityofmadison.com", "rsjachrani@cityofmadison.com", "Fire Inspection testing", emailText + br + elapsed() + "seconds ");
aa.env.setValue("ScriptReturnMessage", debug);	

function scheduleInspectDateGroup(inspGroup,iType,DateToSched) // optional inspector ID.  This function requires dateAdd function
	{
	//logDebug("begin schedule inspection : " + iType + " for " + DateToSched);
	var inspectorObj = null;
	if (arguments.length == 4) 
		{
		var inspRes = aa.person.getUser(arguments[3])
		if (inspRes.getSuccess())
			inspectorObj = inspRes.getOutput();
		}
	var inspModelRes = aa.inspection.getInspectionScriptModel();
	if (inspModelRes.getSuccess()){
		//logDebug("Successfully get inspection model: " + iType + " for " + DateToSched);
		var inspModelObj = inspModelRes.getOutput().getInspection();
		var inspActivityModel = inspModelObj.getActivity();
		inspActivityModel.setCapID(capId);
		inspActivityModel.setSysUser(inspectorObj);
		inspActivityModel.setActivityDate(aa.util.parseDate(DateToSched));
		inspActivityModel.setActivityGroup("Inspection");
		inspActivityModel.setActivityType(iType);
		inspActivityModel.setActivityDescription(iType);
		inspActivityModel.setRecordDescription("");
		inspActivityModel.setRecordType("");
		inspActivityModel.setDocumentID("");
		inspActivityModel.setDocumentDescription('Insp Scheduled');
		inspActivityModel.setActivityJval("");
		inspActivityModel.setStatus("Scheduled");
		inspActivityModel.setTime1(null);
		inspActivityModel.setAuditID("admin");
		inspActivityModel.setAuditStatus("A");
		inspActivityModel.setInspectionGroup(inspGroup);
		inspModelObj.setActivity(inspActivityModel);

		var inspTypeResult = aa.inspection.getInspectionType(inspGroup,iType);
		if (inspTypeResult.getSuccess() && inspTypeResult.getOutput())
		{
			if(inspTypeResult.getOutput().length > 0)
			{
				inspActivityModel.setCarryoverFlag(inspTypeResult.getOutput()[0].getCarryoverFlag()); //set carryoverFlag
				inspActivityModel.setActivityDescription(inspTypeResult.getOutput()[0].getDispType());
				inspActivityModel.setInspectionGroup(inspTypeResult.getOutput()[0].getGroupCode());
				inspActivityModel.setRequiredInspection(inspTypeResult.getOutput()[0].getRequiredInspection());
				inspActivityModel.setUnitNBR(inspTypeResult.getOutput()[0].getUnitNBR());
				inspActivityModel.setAutoAssign(inspTypeResult.getOutput()[0].getAutoAssign());
				inspActivityModel.setDisplayInACA(inspTypeResult.getOutput()[0].getDisplayInACA());
				inspActivityModel.setInspUnits(inspTypeResult.getOutput()[0].getInspUnits());
			}
		}

		var schedRes = aa.inspection.scheduleInspection(inspModelObj,systemUserObj);

		if (!schedRes.getSuccess())
			//logDebug("Successfully scheduled inspection : " + iType);
		//else
			logDebug( "**ERROR: scheduling inspection (" + iType + "): " + schedRes.getErrorMessage());
	}
	else{
		logDebug( "**ERROR: getting  inspection model  " );
	}
	
}


// Functions
function getLastInspectionDate(insp2Check)
	// function getLastInspector: returns the inspector ID (string) of the last inspector to result the inspection.
	//
	{
	var inspResultObj = aa.inspection.getInspections(capId);
	if (inspResultObj.getSuccess())
		{
		inspList = inspResultObj.getOutput();
		//logDebug("a");
		inspList.sort(compareInspDateDesc)
		for (xx in inspList)
			{
			//logDebug(inspList[xx].getInspectionType());
			//logDebug(inspList[xx].getInspectionStatus());
			if (inspList[xx].getInspectionDate() != null && String(insp2Check).equals(inspList[xx].getInspectionType()) && !inspList[xx].getInspectionStatus().equals("Scheduled") && !inspList[xx].getInspectionStatus().equals("Rescheduled"))
				{
				//
				// have to re-grab the user since the id won't show up in this object.
				//inspUserObj = aa.person.getUser(inspList[xx].getInspector().getFirstName(),inspList[xx].getInspector().getMiddleName(),inspList[xx].getInspector().getLastName()).getOutput();
				//return inspUserObj.getUserID();
				//datame = inspList[xx].getInspectionDate().getMonth() + "/" + inspList[xx].getInspectionDate().getDayOfMonth() + "/" + inspList[xx].getInspectionDate().getYear();
				//debugObject(inspList[xx].getInspectionDate());
				
				return inspList[xx].getInspectionDate();
				}
			}
			
		}
	//debugObject(inspResultObj);
	return null;
	}

function compareInspDateDesc(a,b) 
	{
		try{if (a.getInspectionDate()!=null && b.getInspectionDate()!=null)
				{
					return (a.getInspectionDate().getEpochMilliseconds() < b.getInspectionDate().getEpochMilliseconds()); 
				}
			}
		catch(err){
			return null;
			}
	}


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
	   logDebug("<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" +'; ' + "<BR>"); 
	 } 
	 //logDebug(output);
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