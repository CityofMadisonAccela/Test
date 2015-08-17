/*On a monthly basis, a batch script is to run that will look for the selection 'Yes' or 'Partial' and then look for a date that is greater than 
395 days in the past or is blank. If the field is blank, or if the field contains a date that is 395 days or greater in the past, an 'Initial 
Courtesy Notice' will be printed to send to the Responsible Party. Once printed, the date of printing will be placed into the 'Date of Notice' ASI 
field in the Office Use Only subgroup shown below. If the 'Date of Notice' field contains a date that is less than 32 days in the past and the 
testing dates noted in the fields in the table above are greater than 395 days in the past or are blank, open a FIRCODEAR Code Enforcement case and
place the date the case was opened in the 'FIRCODEAR CE Case Date' field in the 'Office Use Only' ASI subgroup shown below.*/

aa.env.setValue("emailAddress","RSjachrani@cityofmadison.com");
aa.env.setValue("ccAddress","lhughes@accela.com");

/*------------------------------------------------------------------------------------------------------/
| Program: MAD_FIRE_CE_BATCH.js  Trigger: Batch    Client : Madison County
|                                                                  
| Version 0.1 - Base Version -							7/27/2009
| 
| Notes:
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START USER CONFIGURABLE PARAMETERS
|
|
/------------------------------------------------------------------------------------------------------*/
var showMessage = false;			// Set to true to see results in popup window
var showDebug = true;				// Set to true to see debug messages in popup window
var maxSeconds = 295;				// number of seconds allowed for batch processing, usually < 5*60
var emailText = "";
var useAppSpecificGroupName = false;					// Use Group name when populating App Specific Info Values

/*----------------------------------------------------------------------------------------------------/
|
| END USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var systemUserObj = aa.person.getUser("ADMIN").getOutput();  // Current User Object
var emailAddress = "" + aa.env.getValue("emailAddress");	// email to send report
var ccAddress = "" + aa.env.getValue("ccAddress");	// email to send report
var batchJobName = "" + aa.env.getValue("BatchJobName");	// Name of the batch job

/*----------------------------------------------------------------------------------------------------/
|
| END BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var message = "";

var startDate = new Date();

var startTime = startDate.getTime();			// Start timer
var sysDate = aa.date.getCurrentDate();
var sysDateMMDDYYYY = dateFormatted(sysDate.getMonth(),sysDate.getDayOfMonth(),sysDate.getYear(),"MM/DD/YYYY");
var setID = "";
var timeExpired = false;
var batchJobID = aa.batchJob.getJobID().getOutput();
var br = "<BR>";	
var currentUserID = aa.env.getValue("CurrentUserID");   		// Current User			

/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
| 
/-----------------------------------------------------------------------------------------------------*/
//aa.cap.getByAppType("Permitting","Fire","RoutineFireInspection","NA");
logMessage("START","Start of Job<br>");
logMessage("PARAMETER emailAddress = " + emailAddress + "<br>");
logMessage("PARAMETER batchJobName = " + batchJobName + "<br>");

logMessage("---------------------------------------------<br>");

//logMessage("sysDate "+ sysDate);

var oneYearDate = new Date(dateAdd(null,-395));
var oneMthDate = new Date(dateAdd(null,-32));

var rptCnt = 0;
var chldCnt = 0;

logMessage("Tested Date must be less than or equal to: " + oneYearDate + "<br>");
logMessage("Notice Date must be less than or equal to: " + oneMthDate + "<br>");

month = sysDate.getMonth();
day = sysDate.getDayOfMonth();
year = sysDate.getYear();

madFRESprkA = new Array();
madFREFrA = new Array();
madFRESpipA = new Array();
madFREAltSSA = new Array();
madFREKHSA = new Array();
madFREFrpmpA = new Array();
madFREPrvHA = new Array();
madFREFrDA = new Array();

//Get all CAPS with sprinklers ASI
madFRESprkY = 	aa.cap.getCapIDsByAppSpecificInfoField("Sprinklers","Yes");
madFRESprkP = 	aa.cap.getCapIDsByAppSpecificInfoField("Sprinklers","Partial");
if (madFRESprkY.getSuccess())
	madFRESprkA = madFRESprkY.getOutput();
if (madFRESprkP.getSuccess())
	madFRESprkA = madFRESprkA.concat(madFRESprkP.getOutput());
	
//Get all CAPS with Fire Alarms ASI
madFREFrAY =	 aa.cap.getCapIDsByAppSpecificInfoField("Fire Alarms","Yes");
madFREFrAP =	 aa.cap.getCapIDsByAppSpecificInfoField("Fire Alarms","Partial");
if (madFREFrAY.getSuccess())
	madFREFrA = madFREFrAY.getOutput();
if (madFREFrAP.getSuccess())
	madFREFrA = madFREFrA.concat(madFREFrAP.getOutput());
	
//Get all CAPS with Standpipes ASI
madFRESpip = aa.cap.getCapIDsByAppSpecificInfoField("Standpipes","Yes");
if (madFRESpip.getSuccess())
	madFRESpipA = madFRESpip.getOutput();
/*
//Get all CAPS with Alternate Suppression Systems ASI
madFREAltSS = aa.cap.getCapIDsByAppSpecificInfoField("Alternate Suppression Systems","Yes");
if (madFREAltSS.getSuccess())
	madFREAltSSA = madFREAltSS.getOutput();

//Get all CAPS with Kitchen Hood System ASI
madFREKHS = aa.cap.getCapIDsByAppSpecificInfoField("Kitchen Hood System","Yes");
if (madFREKHS.getSuccess())
	madFREKHSA = madFREKHS.getOutput();

//Get all CAPS with Fire Pump ASI
madFREFrpmp = aa.cap.getCapIDsByAppSpecificInfoField("Fire Pump","Yes");
if (madFREFrpmp.getSuccess())
	madFREFrpmpA = madFREFrpmp.getOutput();

//Get all CAPS with Private Hydrants ASI
madFREPrvH = aa.cap.getCapIDsByAppSpecificInfoField("Private Hydrants","Yes");
if (madFREPrvH.getSuccess())
	madFREPrvHA = madFREPrvH.getOutput();

//Get all CAPS with Fire Doors ASI
madFREFrD = aa.cap.getCapIDsByAppSpecificInfoField("Fire Doors","Yes");
if (madFREFrD.getSuccess())
	madFREFrDA = madFREFrD.getOutput();
*/
//evaluate caps with Sprinkler data
if (madFRESprkA.length > 0)
{
	logMessage("Searching through " + madFRESprkA.length + " Sprinker cases.  Elapsed Time : " + elapsed() + " Seconds <br>");
	for(xx in madFRESprkA)
	{	
		if (elapsed() > maxSeconds) // only continue if time hasn't expired
		{	 
			logMessage("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.<br>") ;
			logMessage("Looped through " + xx + " records.<br>") ;
			timeExpired = true ;
			break; 
		}				
		var prntRpt = false;
		var cChild = false;
		capObj = madFRESprkA[xx];
		capId = capObj.getCapID();
		altCapId = aa.cap.getCapID(capId.getID1(),capId.getID2(),capId.getID3()).getOutput();
		capIDString = altCapId.getCustomID();	
		cap = aa.cap.getCap(capId).getOutput();
		var AInfo = new Array();						// Create array for tokenized variables
		
		asiSpklrDate = getAppSpecific("Date Sprinkler Tested",capId);
		
		//Get Date of Notice ASI field
		var asiNotDate = getAppSpecific("Date of Notice",capId);	
		var asiCEDate = getAppSpecific("FIRCODEAR CE Case Date",capId); 

		if (asiCEDate != null)
			continue;

		//begin check to see if 365 days passed on Date checks or date check is null					
		if ((asiSpklrDate == null) || new Date(asiSpklrDate) < oneYearDate)
		{
			logMessage("Case #: "+ capIDString+"<br>");
			logMessage("Date Sprinkler Tested: "+ asiSpklrDate+"<br>");
			if(asiNotDate == null)
				prntRpt = true;	
			else if (new Date(asiNotDate) < oneMthDate && (asiCEDate == null))
			{
				logMessage("Date of Notice: "+ asiNotDate+"<br>");
				cChild = true;
			}
		}
		//if date range exceeded print report
		if (prntRpt)
		{
			logMessage("Case#: " + capIDString+ " is due for an inspection");
			editAppSpecific("Date of Notice",sysDateMMDDYYYY,capId);
			rptCnt++;
			
			var bReport=false; 
			var ALTID = capIDString; 
			var reportName = "Official Notice"; //Enter report name here
			report = aa.reportManager.getReportModelByName(reportName);
			report = report.getOutput(); 

			var permit = aa.reportManager.hasPermission(reportName,currentUserID); 

			if(permit.getOutput().booleanValue()) 
				bReport=true; 

			var parameters = aa.util.newHashMap();
 
			if( bReport)
			{
				var msg = aa.reportManager.runReport(parameters,report);
				aa.env.setValue("ScriptReturnCode","0"); 
				aa.env.setValue("ScriptReturnMessage", msg.getOutput() );
			}
		}
		if (cChild)
		{
			logMessage("Creating Enforcement Cap for missing/expired Test Date");
			childId=createChild("Enforcement","Fire","RoutineInspection","NA",capIDString);
			chldCnt++;
			editAppSpecific("FIRCODEAR CE Case Date",sysDateMMDDYYYY,capId);
		}

	}
}
else logMessage("No Sprinkler Cases Found<br>");	

//evaluate caps with Fire Alarm data
if (madFREFrA.length > 0)
{
	logMessage("Searching through " + madFREFrA.length + " Fire Alarm cases.  Elapsed Time : " + elapsed() + " Seconds <br>");
	for(xx in madFREFrA)
	{	
		if (elapsed() > maxSeconds) // only continue if time hasn't expired
		{	 
			logMessage("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.<br>") ;
			logMessage("Looped through " + xx + " records.<br>") ;
			timeExpired = true ;
			break; 
		}				
		var prntRpt = false;
		var cChild = false;
		capObj = madFREFrA[xx];
		capId = capObj.getCapID();
		altCapId = aa.cap.getCapID(capId.getID1(),capId.getID2(),capId.getID3()).getOutput();
		capIDString = altCapId.getCustomID();	
		cap = aa.cap.getCap(capId).getOutput();
		var AInfo = new Array();						// Create array for tokenized variables
		
		var asiFrADate = getAppSpecific("Date Fire Alarm Tested",capId);
		
		//Get Date of Notice ASI field
		var asiNotDate = getAppSpecific("Date of Notice",capId);	
		var asiCEDate = getAppSpecific("FIRCODEAR CE Case Date",capId); 

		if (asiCEDate != null)
			continue;
			
		//begin check to see if 365 days passed on Date checks or date check is null
		if ((asiFrADate == null) || new Date(asiFrADate) < oneYearDate)
		{
			logMessage("Case #: "+ capIDString+"<br>");
			logMessage("Date Fire Alarm Tested: "+ asiFrADate+"<br>");
			if(asiNotDate == null)
				prntRpt = true;	
			else if (new Date(asiNotDate) < oneMthDate && (asiCEDate == null))
			{
				logMessage("Date of Notice: "+ asiNotDate+"<br>");
				cChild = true;
			}
		}
		//if date range exceeded print report
		if (prntRpt)
		{
			logMessage("Case#: " + capIDString+ " is due");
			editAppSpecific("Date of Notice",sysDateMMDDYYYY,capId);
			rptCnt++;
			
			var bReport=false; 
			var ALTID = capIDString; 
			var reportName = "Official Notice"; //Enter report name here
			report = aa.reportManager.getReportModelByName(reportName);
			report = report.getOutput(); 

			var permit = aa.reportManager.hasPermission(reportName,currentUserID); 

			if(permit.getOutput().booleanValue()) 
				bReport=true; 

			var parameters = aa.util.newHashMap();
 
			if( bReport)
			{
				var msg = aa.reportManager.runReport(parameters,report);
				aa.env.setValue("ScriptReturnCode","0"); 
				aa.env.setValue("ScriptReturnMessage", msg.getOutput() );
			}
		}
		if (cChild)
		{
			logMessage("Creating Enforcement Cap for missing/expired Test Date");
			childId=createChild("Enforcement","Fire","RoutineInspection","NA",capIDString);
			chldCnt++;
			editAppSpecific("FIRCODEAR CE Case Date",sysDateMMDDYYYY,capId);
		}

	}

}
else logMessage("No Fire Alarm Cases Found<br>");

//evaluate caps with Standpipe data
if (madFRESpipA.length > 0)
{
	logMessage("Searching through " + madFRESpipA.length + " Standpipe cases.  Elapsed Time : " + elapsed() + " Seconds <br>");
	for(xx in madFRESpipA)
	{	
		if (elapsed() > maxSeconds) // only continue if time hasn't expired
		{	 
			logMessage("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.<br>") ;
			logMessage("Looped through " + xx + " records.<br>") ;
			timeExpired = true ;
			break; 
		}				
		var prntRpt = false;
		var cChild = false;		
		capObj = madFRESpipA[xx];
		capId = capObj.getCapID();
		altCapId = aa.cap.getCapID(capId.getID1(),capId.getID2(),capId.getID3()).getOutput();
		capIDString = altCapId.getCustomID();	
		cap = aa.cap.getCap(capId).getOutput();
		var AInfo = new Array();						// Create array for tokenized variables
				
		var asiSpipDate = getAppSpecific("Date Standpipe Tested",capId);
		
		//Get Date of Notice ASI field
		var asiNotDate = getAppSpecific("Date of Notice",capId);	
		var asiCEDate = getAppSpecific("FIRCODEAR CE Case Date",capId); 
		
		if (asiCEDate != null)
			continue;
			
		//begin check to see if 365 days passed on Date checks or date check is null			
		if ((asiSpipDate == null) || new Date(asiSpipDate) < oneYearDate)
		{
			logMessage("Case #: "+ capIDString+"<br>");
			logMessage("Date Fire Alarm Tested: "+ asiSpipDate+"<br>");
			if(asiNotDate == null)
				prntRpt = true;	
			else if (new Date(asiNotDate) < oneMthDate && (asiCEDate == null))
			{
				logMessage("Date of Notice: "+ asiNotDate+"<br>");
				cChild = true;
			}
		}
		//if date range exceeded print report
		if (prntRpt)
		{
			logMessage("Case#: " + capIDString+ " is due");
			editAppSpecific("Date of Notice",sysDateMMDDYYYY,capId);
			rptCnt++;
			
			var bReport=false; 
			var ALTID = capIDString; 
			var reportName = "Official Notice"; //Enter report name here
			report = aa.reportManager.getReportModelByName(reportName);
			report = report.getOutput(); 

			var permit = aa.reportManager.hasPermission(reportName,currentUserID); 

			if(permit.getOutput().booleanValue()) 
				bReport=true; 

			var parameters = aa.util.newHashMap();
 
			if( bReport)
			{
				var msg = aa.reportManager.runReport(parameters,report);
				aa.env.setValue("ScriptReturnCode","0"); 
				aa.env.setValue("ScriptReturnMessage", msg.getOutput() );
			}
		}
		if (cChild)
		{
			logMessage("Creating Enforcement Cap for missing/Expired Test Date");
			childId=createChild("Enforcement","Fire","RoutineInspection","NA",capIDString);
			chldCnt++;
			editAppSpecific("FIRCODEAR CE Case Date",sysDateMMDDYYYY,capId);
		}

	}
}
else logMessage("No Standpipe Cases Found<br>");		

//evaluate caps with Alternate Suppression System data
if (madFREAltSSA.length > 0)
{
	logMessage("Searching through " + madFREAltSSA.length + " Alternate Suppression System cases.  Elapsed Time : " + elapsed() + " Seconds <br>");
	for(xx in madFREAltSSA)
	{	
		if (elapsed() > maxSeconds) // only continue if time hasn't expired
		{	 
			logMessage("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.<br>") ;
			logMessage("Looped through " + xx + " records.<br>") ;
			timeExpired = true ;
			break; 
		}				
		var prntRpt = false;
		var cChild = false;		
		capObj = madFREAltSSA[xx];
		capId = capObj.getCapID();
		altCapId = aa.cap.getCapID(capId.getID1(),capId.getID2(),capId.getID3()).getOutput();
		capIDString = altCapId.getCustomID();	
		cap = aa.cap.getCap(capId).getOutput();
		var AInfo = new Array();						// Create array for tokenized variables
		
		var asiAltSSDate = getAppSpecific("Date Alternate Suppression System Tested",capId);
				
		//Get Date of Notice ASI field
		var asiNotDate = getAppSpecific("Date of Notice",capId);	
		var asiCEDate = getAppSpecific("FIRCODEAR CE Case Date",capId); 

		if (asiCEDate != null)
			continue;
			
		//begin check to see if 365 days passed on Date checks or date check is null					
		if ((asiAltSSDate == null) || new Date(asiAltSSDate) < oneYearDate)
		{
			logMessage("Case #: "+ capIDString+"<br>");
			logMessage("Date Alternate Suppression System Tested: "+ asiAltSSDate+"<br>");
			if(asiNotDate == null)
				prntRpt = true;	
			else if (new Date(asiNotDate) < oneMthDate && (asiCEDate == null))
			{
				logMessage("Date of Notice: "+ asiNotDate+"<br>");
				cChild = true;
			}
		}
		//if date range exceeded print report
		if (prntRpt)
		{
			logMessage("Case#: " + capIDString+ " is due");
			editAppSpecific("Date of Notice",sysDateMMDDYYYY,capId);
			rptCnt++;
			
			var bReport=false; 
			var ALTID = capIDString; 
			var reportName = "Official Notice"; //Enter report name here
			report = aa.reportManager.getReportModelByName(reportName);
			report = report.getOutput(); 

			var permit = aa.reportManager.hasPermission(reportName,currentUserID); 

			if(permit.getOutput().booleanValue()) 
				bReport=true; 

			var parameters = aa.util.newHashMap();
 
			if( bReport)
			{
				var msg = aa.reportManager.runReport(parameters,report);
				aa.env.setValue("ScriptReturnCode","0"); 
				aa.env.setValue("ScriptReturnMessage", msg.getOutput() );
			}
		}
		if (cChild)
		{
			logMessage("Creating Enforcement Cap for missing/expired Test Date");
			childId=createChild("Enforcement","Fire","RoutineInspection","NA",capIDString);
			chldCnt++;
			editAppSpecific("FIRCODEAR CE Case Date",sysDateMMDDYYYY,capId);
		}

	}
}
else logMessage("No Alternate Suppression System Cases Found<br>");

//evaluate caps with Kitchen Hood System data
if (madFREKHSA.length > 0)
{
	logMessage("Searching through " + madFREKHSA.length + " Kitchen Hood System cases.  Elapsed Time : " + elapsed() + " Seconds <br>");	
	for(xx in madFREKHSA)
	{	
		if (elapsed() > maxSeconds) // only continue if time hasn't expired
		{	 
			logMessage("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.<br>") ;
			logMessage("Looped through " + xx + " records.<br>") ;
			timeExpired = true ;
			break; 
		}				
		var prntRpt = false;
		var cChild = false;		
		capObj = madFREKHSA[xx];
		capId = capObj.getCapID();
		altCapId = aa.cap.getCapID(capId.getID1(),capId.getID2(),capId.getID3()).getOutput();
		capIDString = altCapId.getCustomID();	
		cap = aa.cap.getCap(capId).getOutput();
		var AInfo = new Array();						// Create array for tokenized variables
				
		var asiKHSDate = getAppSpecific("Date Kitchen Hood System Tested",capId);
				
		//Get Date of Notice ASI field
		var asiNotDate = getAppSpecific("Date of Notice",capId);	
		var asiCEDate = getAppSpecific("FIRCODEAR CE Case Date",capId); 
	
		if (asiCEDate != null)
			continue;
			
		//begin check to see if 365 days passed on Date checks or date check is null		
		if ((asiKHSDate == null) || new Date(asiKHSDate) < oneYearDate)
		{
			logMessage("Case #: "+ capIDString+"<br>");
			logMessage("Date Kitchen Hood System Tested: "+ asiKHSDate+"<br>");
			if(asiNotDate == null)
				prntRpt = true;	
			else if (new Date(asiNotDate) < oneMthDate && (asiCEDate == null))
			{
				logMessage("Date of Notice: "+ asiNotDate+"<br>");
				cChild = true;
			}
		}
		//if date range exceeded print report
		if (prntRpt)
		{
			logMessage("Case#: " + capIDString+ " is due");
			editAppSpecific("Date of Notice",sysDateMMDDYYYY,capId);
			rptCnt++;
			
			var bReport=false; 
			var ALTID = capIDString; 
			var reportName = "Official Notice"; //Enter report name here
			report = aa.reportManager.getReportModelByName(reportName);
			report = report.getOutput(); 

			var permit = aa.reportManager.hasPermission(reportName,currentUserID); 

			if(permit.getOutput().booleanValue()) 
				bReport=true; 

			var parameters = aa.util.newHashMap();
 
			if( bReport)
			{
				var msg = aa.reportManager.runReport(parameters,report);
				aa.env.setValue("ScriptReturnCode","0"); 
				aa.env.setValue("ScriptReturnMessage", msg.getOutput() );
			}
		}
		if (cChild)
		{
			logMessage("Creating Enforcement Cap for missing/expired Test Date");
			childId=createChild("Enforcement","Fire","RoutineInspection","NA",capIDString);
			chldCnt++;
			editAppSpecific("FIRCODEAR CE Case Date",sysDateMMDDYYYY,capId);
		}

	}
}
else logMessage("No Kitchen Hood System Cases Found<br>");

//evaluate caps with Fire Pump data
if (madFREFrpmpA.length > 0)
{
	logMessage("Searching through " + madFREFrpmpA.length + " Fire Pump cases.  Elapsed Time : " + elapsed() + " Seconds <br>");
	for(xx in madFREFrpmpA)
	{	
		if (elapsed() > maxSeconds) // only continue if time hasn't expired
		{	 
			logMessage("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.<br>") ;
			logMessage("Looped through " + xx + " records.<br>") ;
			timeExpired = true;
			break; 
		}				
		var prntRpt = false;
		var cChild = false;		
		capObj = madFREFrpmpA[xx];
		capId = capObj.getCapID();
		altCapId = aa.cap.getCapID(capId.getID1(),capId.getID2(),capId.getID3()).getOutput();
		capIDString = altCapId.getCustomID();	
		cap = aa.cap.getCap(capId).getOutput();
		var AInfo = new Array();						// Create array for tokenized variables
				
		var asiFrpmpDate = getAppSpecific("Date Fire Pump Tested",capId);
		
		//Get Date of Notice ASI field
		var asiNotDate = getAppSpecific("Date of Notice",capId);	
		var asiCEDate = getAppSpecific("FIRCODEAR CE Case Date",capId); 
		
		if (asiCEDate != null)
			continue;
			
		//begin check to see if 365 days passed on Date checks or date check is null		
		if ((asiFrpmpDate == null) || new Date(asiFrpmpDate) < oneYearDate)
		{
			logMessage("Case #: "+ capIDString+"<br>");
			logMessage("Date Fire Pump Tested: "+ asiFrpmpDate+"<br>");
			if(asiNotDate == null)
				prntRpt = true;	
			else if (new Date(asiNotDate) < oneMthDate && (asiCEDate == null))
			{
				logMessage("Date of Notice: "+ asiNotDate+"<br>");
				cChild = true;
			}
		}
		//if date range exceeded print report
		if (prntRpt)
		{
			logMessage("Case#: " + capIDString+ " is due");
			editAppSpecific("Date of Notice",sysDateMMDDYYYY,capId);
			rptCnt++;
			
			var bReport=false; 
			var ALTID = capIDString; 
			var reportName = "Official Notice"; //Enter report name here
			report = aa.reportManager.getReportModelByName(reportName);
			report = report.getOutput(); 

			var permit = aa.reportManager.hasPermission(reportName,currentUserID); 

			if(permit.getOutput().booleanValue()) 
				bReport=true; 

			var parameters = aa.util.newHashMap();
 
			if( bReport)
			{
				var msg = aa.reportManager.runReport(parameters,report);
				aa.env.setValue("ScriptReturnCode","0"); 
				aa.env.setValue("ScriptReturnMessage", msg.getOutput() );
			}
		}
		if (cChild)
		{
			logMessage("Creating Enforcement Cap for missing/expired Test Date");
			childId=createChild("Enforcement","Fire","RoutineInspection","NA",capIDString);
			chldCnt++;
			editAppSpecific("FIRCODEAR CE Case Date",sysDateMMDDYYYY,capId);
		}

	}
}
else logMessage("No Fire Pump Cases Found<br>");


//evaluate caps with Private Hydrant data
if (madFREPrvHA.length > 0)
{
	logMessage("Searching through " + madFREPrvHA.length + " Private Hydrant cases.  Elapsed Time : " + elapsed() + " Seconds <br>");	
	for(xx in madFREPrvHA)
	{	
		if (elapsed() > maxSeconds) // only continue if time hasn't expired
		{	 
			logMessage("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.<br>") ;
			logMessage("Looped through " + xx + " records.<br>") ;
			timeExpired = true ;
			break; 
		}				
		var prntRpt = false;
		var cChild = false;		
		capObj = madFREPrvHA[xx];
		capId = capObj.getCapID();
		altCapId = aa.cap.getCapID(capId.getID1(),capId.getID2(),capId.getID3()).getOutput();
		capIDString = altCapId.getCustomID();	
		cap = aa.cap.getCap(capId).getOutput();
		var AInfo = new Array();						// Create array for tokenized variables
		
		var asiPrvHDate = getAppSpecific("Date Private Hydrant Tested",capId);
				
		//Get Date of Notice ASI field
		var asiNotDate = getAppSpecific("Date of Notice",capId);	
		var asiCEDate = getAppSpecific("FIRCODEAR CE Case Date",capId); 
	
		if(asiCEDate != null)
			continue;
			
		//begin check to see if 365 days passed on Date checks or date check is null					
		if ((asiPrvHDate == null) || new Date(asiPrvHDate) < oneYearDate)
		{
			logMessage("Case #: "+ capIDString+"<br>");
			logMessage("Date Sprinkler Tested: "+ asiPrvHDate+"<br>");
			if(asiNotDate == null)
				prntRpt = true;	
			else if (new Date(asiNotDate) < oneMthDate && (asiCEDate == null))
			{
				logMessage("Date of Notice: "+ asiNotDate+"<br>");
				cChild = true;
			}
		}
		//if date range exceeded print report
		if (prntRpt)
		{
			logMessage("Case#: " + capIDString+ " is due");
			editAppSpecific("Date of Notice",sysDateMMDDYYYY,capId);
			rptCnt++;
			
			var bReport=false; 
			var ALTID = capIDString; 
			var reportName = "Official Notice"; //Enter report name here
			report = aa.reportManager.getReportModelByName(reportName);
			report = report.getOutput(); 

			var permit = aa.reportManager.hasPermission(reportName,currentUserID); 

			if(permit.getOutput().booleanValue()) 
				bReport=true; 

			var parameters = aa.util.newHashMap();
 
			if( bReport)
			{
				var msg = aa.reportManager.runReport(parameters,report);
				aa.env.setValue("ScriptReturnCode","0"); 
				aa.env.setValue("ScriptReturnMessage", msg.getOutput() );
			}
		}
		if (cChild)
		{
			logMessage("Creating Enforcement Cap for missing/expired Test Date");
			childId=createChild("Enforcement","Fire","RoutineInspection","NA",capIDString);
			chldCnt++;
			editAppSpecific("FIRCODEAR CE Case Date",sysDateMMDDYYYY,capId);
		}

	}
}
else logMessage("No Private Hydrant Cases Found<br>");

//evaluate caps with Fire Door data
if (madFREFrDA.length > 0)
{
	logMessage("Searching through " + madFREFrDA.length + " Fire Door cases.  Elapsed Time : " + elapsed() + " Seconds <br>");
	for(xx in madFREFrDA)
	{	
		if (elapsed() > maxSeconds) // only continue if time hasn't expired
		{	 
			logMessage("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.<br>") ;
			logMessage("Looped through " + xx + " records.<br>") ;
			timeExpired = true ;
			break; 
		}				
		var prntRpt = false;
		var cChild = false;		
		capObj = madFREFrDA[xx];
		capId = capObj.getCapID();
		altCapId = aa.cap.getCapID(capId.getID1(),capId.getID2(),capId.getID3()).getOutput();
		capIDString = altCapId.getCustomID();	
		cap = aa.cap.getCap(capId).getOutput();
		var AInfo = new Array();						// Create array for tokenized variables
				
		var asiFrDDate = getAppSpecific("Date Fire Doors Tested",capId);	
		
		//Get Date of Notice ASI field
		var asiNotDate = getAppSpecific("Date of Notice",capId);	
		var asiCEDate = getAppSpecific("FIRCODEAR CE Case Date",capId); 

		if(asiCEDate != null)
			continue;
			
		//begin check to see if 365 days passed on Date checks or date check is null					
		if ((asiFrDDate == null) || new Date(asiFrDDate) < oneYearDate)
		{
			logMessage("Case #: "+ capIDString+"<br>");
			logMessage("Date Sprinkler Tested: "+ asiFrDDate+"<br>");
			if(asiNotDate == null)
				prntRpt = true;	
			else if (new Date(asiNotDate) < oneMthDate && (asiCEDate == null))
			{
				logMessage("Date of Notice: "+ asiNotDate+"<br>");
				cChild = true;
			}
		}

		//if date range exceeded print report
		if (prntRpt)
		{
			logMessage("Case#: " + capIDString+ " is due");
			editAppSpecific("Date of Notice",sysDateMMDDYYYY,capId);
			rptCnt++;
			
			var bReport=false; 
			var ALTID = capIDString; 
			var reportName = "Official Notice"; //Enter report name here
			report = aa.reportManager.getReportModelByName(reportName);
			report = report.getOutput(); 

			var permit = aa.reportManager.hasPermission(reportName,currentUserID); 

			if(permit.getOutput().booleanValue()) 
				bReport=true; 

			var parameters = aa.util.newHashMap();
 
			if( bReport)
			{
				var msg = aa.reportManager.runReport(parameters,report);
				aa.env.setValue("ScriptReturnCode","0"); 
				aa.env.setValue("ScriptReturnMessage", msg.getOutput() );
			}
		}
		if (cChild)
		{
			logMessage("Creating Enforcement Cap for missing/expired Test Date");
			childId=createChild("Enforcement","Fire","RoutineInspection","NA",capIDString);
			chldCnt++;
			editAppSpecific("FIRCODEAR CE Case Date",sysDateMMDDYYYY,capId);
		}

	}
}
else logMessage("No Fire Door Cases Found<br>");

logMessage("Total Notices printed = "+ rptCnt);
logMessage("Total Code Enforcement cases created = "+ chldCnt);

logMessage("End of Job: Elapsed Time : " + elapsed() + " Seconds");

if (emailAddress.length) 
{
	emailText = "below are the results <br>" + emailText;
	if (!ccAddress.length) ccAddress = "";
	aa.sendMail("noreply@cityofmadison.com", emailAddress, ccAddress, batchJobName + " Results", emailText);
}

/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/

function dateFormatted(pMonth,pDay,pYear,pFormat)
//returns date string formatted as YYYY-MM-DD or MM/DD/YYYY (default)
	{
	var mth = "";
	var day = "";
	var ret = "";
	if (pMonth > 9)
		mth = pMonth.toString();
	else
		mth = "0"+pMonth.toString();

	if (pDay > 9)
		day = pDay.toString();
	else
		day = "0"+pDay.toString();

	if (pFormat=="YYYY-MM-DD")
		ret = pYear.toString()+"-"+mth+"-"+day;
	else
		ret = ""+mth+"/"+day+"/"+pYear.toString();

	return ret;
	}

function elapsed() {
	var thisDate = new Date();
	var thisTime = thisDate.getTime();
	return ((thisTime - startTime) / 1000) 
	}

function logMessage(edesc) {
	aa.eventLog.createEventLog("INFO", "Batch Process", batchJobName, sysDate, sysDate,"", edesc,batchJobID);
	aa.print(edesc);
	emailText+=edesc + "\n";
	}

function logDebug(edesc) {
	if (showDebug) {
		aa.eventLog.createEventLog("DEBUG", "Batch Process", batchJobName, sysDate, sysDate,"", edesc,batchJobID);
		aa.print("DEBUG : " + edesc);
		emailText+="DEBUG : " + edesc + "\n"; }
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

	return (dDate.getMonth()+1) + "/" + dDate.getDate() + "/" + dDate.getFullYear();
	}

function getAppSpecific(itemName)  // optional: itemCap
{
	var updated = false;
	var i=0;
	var itemCap = capId;
	if (arguments.length == 2) itemCap = arguments[1]; // use cap ID specified in args
	
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
function editAppSpecific(itemName,itemValue)  // optional: itemCap
{
	var updated = false;
	var i=0;
	itemCap = capId;
	if (arguments.length == 3) itemCap = arguments[2]; // use cap ID specified in args
   	
   	var appSpecInfoResult = aa.appSpecificInfo.getByCapID(itemCap);
	if (appSpecInfoResult.getSuccess())
	 	{
		var appspecObj = appSpecInfoResult.getOutput();
		
		if (itemName != "")
			{
				while (i < appspecObj.length && !updated)
				{
					if (appspecObj[i].getCheckboxDesc() == itemName && (!useAppSpecificGroupName || appspecObj[i].getCheckboxType() == itemGroup))
					{
						appspecObj[i].setChecklistComment(itemValue);
						var actionResult = aa.appSpecificInfo.editAppSpecInfos(appspecObj);
						updated = true;
						AInfo[itemName] = itemValue;  // Update array used by this script
					}
					i++;
				} // while loop
			} // item name blank
		} // got app specific object	
		else
		{ logDebug( "**ERROR: getting app specific info for Cap : " + appSpecInfoResult.getErrorMessage()) }
}

function createChild(grp,typ,stype,cat,desc) 
//
// creates the new application and returns the capID object
//
	{
	var appCreateResult = aa.cap.createApp(grp,typ,stype,cat,desc);
	//logDebug("creating cap " + grp + "/" + typ + "/" + stype + "/" + cat);
	if (appCreateResult.getSuccess())
		{
		var newId = appCreateResult.getOutput();
		//logDebug("cap " + grp + "/" + typ + "/" + stype + "/" + cat + " created successfully ");
		
		// create Detail Record
		capModel = aa.cap.newCapScriptModel().getOutput();
		capDetailModel = capModel.getCapModel().getCapDetailModel();
		capDetailModel.setCapID(newId);
		aa.cap.createCapDetail(capDetailModel);

		var newObj = aa.cap.getCap(newId).getOutput();	//Cap object
		var result = aa.cap.createAppHierarchy(capId, newId); 
		if (!result.getSuccess())
			logDebug("Could not link applications");

		// Copy Parcels
		var capParcelResult = aa.parcel.getParcelandAttribute(capId,null);
		if (capParcelResult.getSuccess())
			{
			var Parcels = capParcelResult.getOutput().toArray();
			for (zz in Parcels)
				{
				//logDebug("adding parcel #" + zz + " = " + Parcels[zz].getParcelNumber());
				var newCapParcel = aa.parcel.getCapParcelModel().getOutput();
				newCapParcel.setParcelModel(Parcels[zz]);
				newCapParcel.setCapIDModel(newId);
				newCapParcel.setL1ParcelNo(Parcels[zz].getParcelNumber());
				newCapParcel.setParcelNo(Parcels[zz].getParcelNumber());
				aa.parcel.createCapParcel(newCapParcel);
				}
			}

		// Copy Contacts
		capContactResult = aa.people.getCapContactByCapID(capId);
		if (capContactResult.getSuccess())
			{
			Contacts = capContactResult.getOutput();
			for (yy in Contacts)
				{
				var newContact = Contacts[yy].getCapContactModel();
				newContact.setCapID(newId);
				aa.people.createCapContact(newContact);
				//logDebug("added contact");
				}
			}	

		// Copy Addresses
		capAddressResult = aa.address.getAddressByCapId(capId);
		if (capAddressResult.getSuccess())
			{
			Address = capAddressResult.getOutput();
			for (yy in Address)
				{
				newAddress = Address[yy];
				newAddress.setCapID(newId);
				aa.address.createAddress(newAddress);
				//logDebug("added address");
				}
			}

		// Copy Owners
		capOwnerResult = aa.owner.getOwnerByCapId(capId);
		if (capOwnerResult.getSuccess())
			{
			Owner = capOwnerResult.getOutput();
			for (yy in Owner)
				{
				newOwner = Owner[yy];
				newOwner.setCapID(newId);
				aa.owner.createCapOwnerWithAPOAttribute(newOwner);
				//logDebug("added owner");
				}
			}
			
		return newId;
		}
	else
		{
		logDebug( "**ERROR: adding child App: " + appCreateResult.getErrorMessage());
		}
	}