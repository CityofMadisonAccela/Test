eventName = "PurgeExpiredInactiveAccounts"; // Please replace eventName value with the actual Event Name. Max length is VARCHAR(30).
batchJobName = "PurgeExpiredInactiveAccounts"; // Please replace batchJobName value with the actual Batch Job Name. Max length is VARCHAR(30).
batchJobDesc = "PurgeExpiredInactiveAccounts"; // Please replace batchJobDesc value with the actual Batch Job Description. Max length is VARCHAR(240).
batchJobResult = "PurgeExpiredInactiveAccounts"; // Please replace batchJobResult value with the actual Batch Job Result. Max length is VARCHAR(240).
sysDate = aa.date.getCurrentDate(); 
batchJobID = aa.batchJob.getJobID().getOutput(); 
aa.print("batchJobID : " + batchJobID);
var result = aa.publicUser.purgExpiredInactiveAccount();
if (result.getSuccess())
{
  aa.print("run purgExpiredInactiveAccount method successfully!");
  aa.env.setValue("ScriptReturnCode","0");
  aa.env.setValue("ScriptReturnMessage","Purg expired inactive accounts successful");
  aa.eventLog.createEventLog(eventName, "Batch Process", batchJobName, sysDate, sysDate,batchJobDesc, batchJobResult, batchJobID);
}
else
{
  aa.print("ERROR: run purgExpiredInactiveAccount method failed" + result.getErrorMessage());
	aa.env.setValue("ScriptReturnCode","1");
  aa.env.setValue("ScriptReturnMessage","Purg expired inactive accounts failed");
}