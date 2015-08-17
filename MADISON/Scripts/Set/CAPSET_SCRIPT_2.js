var br = "<BR>";
var message = "";
var SetMemberArray = aa.env.getValue("SetMemberArray");
var SetID = aa.env.getValue("SetID");
var ReportName = lookup("BATCH_REPORTS",SetID);//"Business License";
var SetReportName = lookup("BATCH_REPORTS","Set" + SetID);//"Business License";
var emailAddresTo = "jschneider@cityofmadison.com";
var emailAddresCc = "";


for(var i=0; i < SetMemberArray.length; i++) 
{
	
	var id = SetMemberArray[i];
	var capId = aa.cap.getCapID(id.getID1(), id.getID2(),id.getID3()).getOutput();
	var altId = capId.getCustomID();
	var report = aa.reportManager.getReportInfoModelByName(ReportName);
	
	report = report.getOutput();
	report.setModule("Licenses"); // Setting the module	
	report.setCapId(capId.toString());
	

	var parameters = aa.util.newHashMap();
	parameters.put("AltID",altId);
    parameters.put("inv_dt","01/01/2999");  //Only used by report BI/Inspection Invoice
	report.setReportParameters(parameters);
	var rp = report.getReportParameters();

	var reportResult = aa.reportManager.getReportResult(report);

	if(reportResult.getSuccess())
	{
		reportResult = reportResult.getOutput();
		var reportFile = aa.reportManager.storeReportToDisk(reportResult);
		logMessage(altId);
	}
	else
	{
		logMessage("Could not run report");
	}
}
if (SetReportName != "NotFound")
	{
	report = aa.reportManager.getReportModelByName(SetReportName);
	report = report.getOutput();
	var parameters = aa.util.newHashMap();
	parameters.put("SetID",SetID);
	var msg = aa.reportManager.runReport(parameters,report);
	}
	
var sendResult = aa.sendMail("noreply@cityofmadison.com", emailAddresTo, emailAddresCc, "SET Name: " + aa.env.getValue("SetID"), "Message: " + br + br + message);

aa.env.setValue("ScriptReturnCode", "0");
aa.env.setValue("ScriptReturnMessage", msg.getOutput());

function lookup(stdChoice,stdValue) 
	{
	var strControl;
	var bizDomScriptResult = aa.bizDomain.getBizDomainByValue(stdChoice,stdValue);
	
   	if (bizDomScriptResult.getSuccess())
   		{
		var bizDomScriptObj = bizDomScriptResult.getOutput();
		var strControl = "" + bizDomScriptObj.getDescription(); // had to do this or it bombs.  who knows why?
		}
	else
		{
		var strControl = "notFound";
		}
	return strControl;
	}

function logMessage(dstr)
	{
		message += dstr + br;
	}